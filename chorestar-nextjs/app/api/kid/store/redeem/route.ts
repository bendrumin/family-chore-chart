import { createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse, after } from 'next/server'
import { z } from 'zod'
import { resolveKidRequest } from '@/lib/utils/kid-or-parent-auth'
import { computeBalance } from '@/lib/utils/wallet'
import { notifyRedemptionRequested } from '@/lib/push/notify'

/**
 * POST /api/kid/store/redeem
 *   { childId?, itemId }                      — ask for a store item
 *   { childId?, redemptionId, action: 'cancel' } — take a pending request back
 *
 * A request needs the balance to cover the price NOW (so a kid cannot queue
 * things they cannot afford), and it is checked again at approval. The price
 * is captured on the request so a later reprice does not change history. One
 * pending request per item per kid. The parent gets a push.
 */
const schema = z.union([
  z.object({ childId: z.string().uuid().optional(), itemId: z.string().uuid() }),
  z.object({ childId: z.string().uuid().optional(), redemptionId: z.string().uuid(), action: z.literal('cancel') }),
])

export async function POST(request: Request) {
  const raw = await request.json().catch(() => null)
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  const ctx = await resolveKidRequest(request, parsed.data.childId ?? null)
  if (!ctx) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  try {
    const admin = createServiceRoleClient()

    if ('redemptionId' in parsed.data) {
      const { error } = await admin
        .from('reward_redemptions')
        .delete()
        .eq('id', parsed.data.redemptionId)
        .eq('child_id', ctx.child.id)
        .eq('status', 'pending')
      if (error) {
        console.error('[kid/store/redeem] cancel failed:', error.message)
        return NextResponse.json({ error: 'Could not cancel' }, { status: 500 })
      }
      return NextResponse.json({ ok: true, cancelled: true })
    }

    const { data: item } = await admin
      .from('reward_items')
      .select('id, title, emoji, price_cents, is_active, user_id')
      .eq('id', parsed.data.itemId)
      .maybeSingle()
    if (!item || !item.is_active || item.user_id !== ctx.child.user_id) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    const { data: dup } = await admin
      .from('reward_redemptions')
      .select('id')
      .eq('child_id', ctx.child.id)
      .eq('reward_item_id', item.id)
      .eq('status', 'pending')
      .maybeSingle()
    if (dup) {
      return NextResponse.json({ ok: true, redemptionId: dup.id, status: 'pending', duplicate: true })
    }

    const balance = await computeBalance(ctx.child)
    if (balance.owedCents < item.price_cents) {
      return NextResponse.json(
        { error: 'not_enough', shortByCents: item.price_cents - balance.owedCents },
        { status: 409 }
      )
    }

    const { data: redemption, error } = await admin
      .from('reward_redemptions')
      .insert({ child_id: ctx.child.id, reward_item_id: item.id, price_cents: item.price_cents })
      .select('id')
      .maybeSingle()
    if (error || !redemption) {
      console.error('[kid/store/redeem] insert failed:', error?.message)
      return NextResponse.json({ error: 'Could not send the request' }, { status: 500 })
    }

    const { data: settings } = await admin
      .from('family_settings')
      .select('currency_code')
      .eq('user_id', ctx.child.user_id)
      .maybeSingle()
    const currency = settings?.currency_code ?? 'USD'
    const title = `${item.emoji ? `${item.emoji} ` : ''}${item.title}`
    after(() => notifyRedemptionRequested(ctx.child.id, title, item.price_cents, currency, redemption.id))

    return NextResponse.json({ ok: true, redemptionId: redemption.id, status: 'pending' })
  } catch (error) {
    console.error('[kid/store/redeem]', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
