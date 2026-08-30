import { createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getParentUserId } from '@/lib/utils/parent-auth'
import { familiesForUser } from '@/lib/utils/approval'
import { computeBalance, loadChild } from '@/lib/utils/wallet'

/**
 * POST /api/rewards/redemptions — a parent reviews a store request.
 *
 * Body: { redemptionId, action: 'approve' | 'reject' }
 *
 * Approve spends the money: a payout row for the item's price (captured at
 * request time), tagged with the item, and the request marked approved. The
 * balance is checked again here, so a request that no longer fits (the kid
 * redeemed something else first) comes back 409 rather than going negative.
 * Reject keeps the row as 'rejected' so the kid's list simply clears.
 */
const bodySchema = z.object({
  redemptionId: z.string().uuid(),
  action: z.enum(['approve', 'reject']),
})

export async function POST(request: Request) {
  const userId = await getParentUserId(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const raw = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  try {
    const admin = createServiceRoleClient()
    const { data: redemption } = await admin
      .from('reward_redemptions')
      .select('id, child_id, reward_item_id, price_cents, status')
      .eq('id', parsed.data.redemptionId)
      .maybeSingle()
    if (!redemption) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (redemption.status !== 'pending') {
      return NextResponse.json({ ok: true, status: redemption.status, alreadyReviewed: true })
    }

    const child = await loadChild(redemption.child_id)
    if (!child) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const families = await familiesForUser(userId)
    if (!families.includes(child.user_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const now = new Date().toISOString()

    if (parsed.data.action === 'reject') {
      await admin
        .from('reward_redemptions')
        .update({ status: 'rejected', reviewed_at: now, reviewed_by: userId })
        .eq('id', redemption.id)
      return NextResponse.json({ ok: true, status: 'rejected' })
    }

    const balance = await computeBalance(child)
    if (balance.owedCents < redemption.price_cents) {
      return NextResponse.json(
        { error: 'not_enough', owedCents: balance.owedCents, priceCents: redemption.price_cents },
        { status: 409 }
      )
    }

    const { data: item } = await admin
      .from('reward_items')
      .select('title, emoji')
      .eq('id', redemption.reward_item_id)
      .maybeSingle()

    const { data: payout, error: payoutError } = await admin
      .from('allowance_payouts')
      .insert({
        child_id: child.id,
        amount_cents: redemption.price_cents,
        note: item ? `${item.emoji ? `${item.emoji} ` : ''}${item.title}` : 'Reward store',
        reward_item_id: redemption.reward_item_id,
      })
      .select('id')
      .maybeSingle()
    if (payoutError || !payout) {
      console.error('[rewards/redemptions] payout failed:', payoutError?.message)
      return NextResponse.json({ error: 'Could not record the payout' }, { status: 500 })
    }

    const { error } = await admin
      .from('reward_redemptions')
      .update({ status: 'approved', reviewed_at: now, reviewed_by: userId, payout_id: payout.id })
      .eq('id', redemption.id)
    if (error) {
      console.error('[rewards/redemptions] update failed:', error.message)
      return NextResponse.json({ error: 'Could not approve' }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      status: 'approved',
      paidCents: redemption.price_cents,
      owedCents: balance.owedCents - redemption.price_cents,
    })
  } catch (error) {
    console.error('[rewards/redemptions]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
