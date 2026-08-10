import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { childTotalEarningsCents, owedCents, type DatedCompletion } from '@/lib/utils/earnings'

/**
 * The running allowance balance: what a child has earned in total, what has
 * already been handed over, and the difference still owed.
 *
 * GET  /api/allowance?childId=... — current balance
 * POST /api/allowance             — record a payout, clearing the balance
 *
 * The balance is derived on every read rather than stored. A stored running
 * total would drift the moment history changed underneath it: ticking a chore
 * from last month, editing a reward, or deleting a chore all quietly alter what
 * was earned, and only a derived figure stays honest.
 *
 * Reads go through the normal (RLS-enforced) client, so a parent can only ever
 * see or pay their own children.
 */

interface Balance {
  childId: string
  earnedCents: number
  paidCents: number
  owedCents: number
}

async function computeBalance(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase client generics
  supabase: any,
  childId: string,
  userId: string
): Promise<Balance | null> {
  const { data: child } = await supabase
    .from('children')
    .select('id')
    .eq('id', childId)
    .eq('user_id', userId)
    .maybeSingle()
  if (!child) return null

  const { data: chores } = await supabase
    .from('chores')
    .select('id, reward_cents')
    .eq('child_id', childId)
    .eq('is_active', true)

  const choreList = chores ?? []
  let earned = 0

  if (choreList.length) {
    const { data: completions } = await supabase
      .from('chore_completions')
      .select('chore_id, day_of_week, week_start')
      .in('chore_id', choreList.map((c: { id: string }) => c.id))

    const { data: settings } = await supabase
      .from('family_settings')
      .select('reward_mode, daily_reward_cents, weekly_bonus_cents')
      .eq('user_id', userId)
      .maybeSingle()

    earned = childTotalEarningsCents(
      choreList,
      (completions ?? []) as DatedCompletion[],
      settings
    )
  }

  const { data: payouts } = await supabase
    .from('allowance_payouts')
    .select('amount_cents')
    .eq('child_id', childId)

  const paid = (payouts ?? []).reduce(
    (sum: number, p: { amount_cents: number | null }) => sum + (p.amount_cents ?? 0),
    0
  )

  return { childId, earnedCents: earned, paidCents: paid, owedCents: owedCents(earned, paid) }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const childId = new URL(request.url).searchParams.get('childId')
    if (!childId || !/^[0-9a-f-]{36}$/i.test(childId)) {
      return NextResponse.json({ error: 'childId is required' }, { status: 400 })
    }

    const balance = await computeBalance(supabase, childId, user.id)
    if (!balance) return NextResponse.json({ error: 'Child not found' }, { status: 404 })

    return NextResponse.json(balance)
  } catch (error) {
    console.error('[allowance] GET failed:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let body: { childId?: unknown; note?: unknown } | null = null
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const childId = String(body?.childId ?? '')
    if (!/^[0-9a-f-]{36}$/i.test(childId)) {
      return NextResponse.json({ error: 'childId is required' }, { status: 400 })
    }
    const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 200) : null

    // Recompute rather than trusting an amount from the client: the button is
    // "pay what is owed", and the server decides what that is.
    const balance = await computeBalance(supabase, childId, user.id)
    if (!balance) return NextResponse.json({ error: 'Child not found' }, { status: 404 })
    if (balance.owedCents <= 0) {
      return NextResponse.json({ error: 'Nothing to pay out right now' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- allowance_payouts is newer than the generated types
    const { error } = await (supabase as any).from('allowance_payouts').insert({
      child_id: childId,
      amount_cents: balance.owedCents,
      note,
    })
    if (error) {
      console.error('[allowance] payout insert failed:', error.message)
      return NextResponse.json({ error: 'Could not record the payout' }, { status: 500 })
    }

    return NextResponse.json({
      childId,
      paidCents: balance.owedCents,
      earnedCents: balance.earnedCents,
      owedCents: 0,
    })
  } catch (error) {
    console.error('[allowance] POST failed:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
