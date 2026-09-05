import { createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getParentUserId } from '@/lib/utils/parent-auth'
import { familiesForUser } from '@/lib/utils/approval'
import { computeBalance, loadChild, activeGoal, goalView } from '@/lib/utils/wallet'

/**
 * The running allowance balance: what a child has earned in total, what has
 * already been handed over, and the difference still owed.
 *
 * GET  /api/allowance?childId=...          — current balance (+ active goal)
 * POST /api/allowance { childId, note?, amountCents? }
 *                                           — record a payout. amountCents (a
 *                                             positive integer, at most what is
 *                                             owed, recomputed server-side) pays
 *                                             part of the balance and leaves the
 *                                             rest owed; omitted pays it all
 * POST /api/allowance { childId, goalId }   — pay out toward a goal: the goal's
 *                                             target (or what is owed, if less),
 *                                             tagged with the goal, which is then
 *                                             marked reached (amountCents is
 *                                             ignored on this path)
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
      goal: goal ? goalView(goal, balance.owedCents) : null,
    })
  } catch (error) {
    console.error('[allowance] GET failed:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    let body: { childId?: unknown; note?: unknown; goalId?: unknown; amountCents?: unknown } | null = null
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
    if (balance.owedCents <= 0) {
      return NextResponse.json({ error: 'Nothing to pay out right now' }, { status: 400 })
    }

    const admin = createServiceRoleClient()

    if (goalId) {
      const { data: goal } = await admin
        .from('goals')
        .select('id, title, target_cents, status, child_id')
        .eq('id', goalId)
        .eq('child_id', auth.child.id)
        .maybeSingle()
      if (!goal || goal.status !== 'active') {
        return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
      }

      // The goal's target, or everything owed if the kid is still short. Either
      // way the goal is done: the parent handing money over IS reaching it.
      const amount = Math.min(balance.owedCents, goal.target_cents)
      const { data: payout, error } = await admin
        .from('allowance_payouts')
        .insert({ child_id: auth.child.id, amount_cents: amount, note: note ?? `Goal: ${goal.title}`, goal_id: goal.id })
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
        owedCents: balance.owedCents - amount,
        goalId: goal.id,
        payoutId: payout?.id ?? null,
      })
    }

    // Partial payout: the client may name an amount, but never more than the
    // owed balance the server just recomputed. Omitted = pay everything owed.
    let amountCents = balance.owedCents
    if (body?.amountCents !== undefined && body?.amountCents !== null) {
      const requested = body.amountCents
      if (typeof requested !== 'number' || !Number.isInteger(requested) || requested <= 0) {
        return NextResponse.json(
          { error: 'amountCents must be a positive whole number of cents' },
          { status: 400 }
        )
      }
      if (requested > balance.owedCents) {
        return NextResponse.json(
          { error: `Only ${balance.owedCents} cents are owed right now` },
          { status: 400 }
        )
      }
      amountCents = requested
    }

    const { error } = await admin
      .from('allowance_payouts')
      .insert({ child_id: auth.child.id, amount_cents: amountCents, note })
    if (error) {
      console.error('[allowance] payout insert failed:', error.message)
      return NextResponse.json({ error: 'Could not record the payout' }, { status: 500 })
    }

    return NextResponse.json({
      childId: auth.child.id,
      paidCents: amountCents,
      earnedCents: balance.earnedCents,
      owedCents: balance.owedCents - amountCents,
    })
  } catch (error) {
    console.error('[allowance] POST failed:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
