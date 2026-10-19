import { createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getParentUserId } from '@/lib/utils/parent-auth'
import { familiesForUser } from '@/lib/utils/approval'
import { computeBalance, loadChild, activeGoal, goalView } from '@/lib/utils/wallet'

/**
 * The running allowance balance: what a child has earned in total, what has
 * already been handed over, and the difference still owed.
 *
 * GET  /api/allowance?childId=...          — current balance (+ active goal,
 *                                             + jars when they're on)
 * POST /api/allowance { childId, note?, amountCents?, jar? }
 *                                           — record a payout. amountCents (a
 *                                             positive integer, at most what can
 *                                             be paid, recomputed server-side)
 *                                             pays part and leaves the rest;
 *                                             omitted pays it all. With jars on
 *                                             (migration 030) a payout comes out
 *                                             of Spend, or Save with jar: 'save'
 * POST /api/allowance { childId, goalId }   — pay out toward a goal: the goal's
 *                                             target (or what there is, if less),
 *                                             tagged with the goal, which is then
 *                                             marked reached. From Save when jars
 *                                             are on (amountCents is ignored here)
 *
 * The balance is derived on every read rather than stored (see lib/utils/wallet).
 *
 * Auth: web session or iOS Bearer token; the caller must own the family or be
 * a shared member of it. Data reads use the service role after that check, so
 * a co-parent sees the same numbers the owner does.
 */

async function authorizedChild(request: Request, childId: string) {
  const userId = await getParentUserId(request)
  if (!userId) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (!/^[0-9a-f-]{36}$/i.test(childId)) {
    return { error: NextResponse.json({ error: 'childId is required' }, { status: 400 }) }
  }
  const child = await loadChild(childId)
  if (!child) return { error: NextResponse.json({ error: 'Child not found' }, { status: 404 }) }
  const families = await familiesForUser(userId)
  if (!families.includes(child.user_id)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { userId, child }
}

export async function GET(request: Request) {
  try {
    const childId = new URL(request.url).searchParams.get('childId') ?? ''
    const auth = await authorizedChild(request, childId)
    if ('error' in auth) return auth.error

    const [balance, goal] = await Promise.all([computeBalance(auth.child), activeGoal(auth.child.id)])
    return NextResponse.json({
      ...balance,
      goal: goal ? goalView(goal, balance.goalBaseCents) : null,
    })
  } catch (error) {
    console.error('[allowance] GET failed:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    let body: { childId?: unknown; note?: unknown; goalId?: unknown; amountCents?: unknown; jar?: unknown } | null = null
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const childId = String(body?.childId ?? '')
    const auth = await authorizedChild(request, childId)
    if ('error' in auth) return auth.error

    const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 200) : null
    const goalId = typeof body?.goalId === 'string' && /^[0-9a-f-]{36}$/i.test(body.goalId) ? body.goalId : null

    // Recompute rather than trusting an amount from the client: the button is
    // "pay what is owed", and the server decides what that is.
    const balance = await computeBalance(auth.child)
    const jarsOn = balance.jars.enabled

    const admin = createServiceRoleClient()

    if (goalId) {
      // Goals fill from Save when jars are on, from the whole balance when off.
      const available = balance.goalBaseCents
      if (available <= 0) {
        return NextResponse.json(
          { error: jarsOn ? 'Nothing in the Save jar yet' : 'Nothing to pay out right now' },
          { status: 400 }
        )
      }
      const { data: goal } = await admin
        .from('goals')
        .select('id, title, target_cents, status, child_id')
        .eq('id', goalId)
        .eq('child_id', auth.child.id)
        .maybeSingle()
      if (!goal || goal.status !== 'active') {
        return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
      }

      // The goal's target, or everything there is if the kid is still short.
      // Either way the goal is done: the parent handing money over IS reaching it.
      const amount = Math.min(available, goal.target_cents)
      // allowance_payouts.jar is migration 030 and not in the generated types.
      const { data: payout, error } = await admin
        .from('allowance_payouts')
        .insert({
          child_id: auth.child.id,
          amount_cents: amount,
          note: note ?? `Goal: ${goal.title}`,
          goal_id: goal.id,
          ...(jarsOn ? { jar: 'save' } : {}),
        } as never)
        .select('id')
        .maybeSingle()
      if (error) {
        console.error('[allowance] goal payout insert failed:', error.message)
        return NextResponse.json({ error: 'Could not record the payout' }, { status: 500 })
      }
      await admin
        .from('goals')
        .update({ status: 'reached', reached_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', goal.id)

      return NextResponse.json({
        childId: auth.child.id,
        paidCents: amount,
        earnedCents: balance.earnedCents,
        owedCents: Math.max(0, balance.owedCents - amount),
        goalId: goal.id,
        payoutId: (payout as { id: string } | null)?.id ?? null,
      })
    }

    // Which jar the cash comes out of: Spend by default, Save on request
    // (taking savings out). With jars off there is one balance.
    const fromSave = jarsOn && body?.jar === 'save'
    const available = fromSave ? Math.max(0, balance.jars.saveCents) : balance.spendableCents
    if (available <= 0) {
      return NextResponse.json(
        { error: fromSave ? 'Nothing in the Save jar' : jarsOn ? 'Nothing in the Spend jar right now' : 'Nothing to pay out right now' },
        { status: 400 }
      )
    }

    // Partial payout: the client may name an amount, but never more than the
    // server just recomputed. Omitted = pay everything available.
    let amountCents = available
    if (body?.amountCents !== undefined && body?.amountCents !== null) {
      const requested = body.amountCents
      if (typeof requested !== 'number' || !Number.isInteger(requested) || requested <= 0) {
        return NextResponse.json(
          { error: 'amountCents must be a positive whole number of cents' },
          { status: 400 }
        )
      }
      if (requested > available) {
        return NextResponse.json(
          { error: `Only ${available} cents can be paid out right now` },
          { status: 400 }
        )
      }
      amountCents = requested
    }

    const { error } = await admin
      .from('allowance_payouts')
      .insert({ child_id: auth.child.id, amount_cents: amountCents, note, ...(fromSave ? { jar: 'save' } : {}) } as never)
    if (error) {
      console.error('[allowance] payout insert failed:', error.message)
      return NextResponse.json({ error: 'Could not record the payout' }, { status: 500 })
    }

    return NextResponse.json({
      childId: auth.child.id,
      paidCents: amountCents,
      earnedCents: balance.earnedCents,
      owedCents: Math.max(0, balance.owedCents - amountCents),
      jar: jarsOn ? (fromSave ? 'save' : 'spend') : null,
    })
  } catch (error) {
    console.error('[allowance] POST failed:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
