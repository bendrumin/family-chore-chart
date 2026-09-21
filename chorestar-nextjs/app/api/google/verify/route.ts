import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getParentUserId } from '@/lib/utils/parent-auth'
import { getSubscriptionV2, acknowledgeSubscription } from '@/lib/google/play-api'
import { tierForPlaySubscriptionState, PLAY_SUBSCRIPTION_PRODUCT_IDS } from '@/lib/google/play-billing'

/**
 * POST /api/google/verify  { purchaseToken, productId }
 *
 * Called right after Play reports a purchase, by the web app inside the
 * Android shell (cookie session) or by the native Android app (Bearer access
 * token, the same fallback /api/kid-login-code takes). Verifies the token with
 * Google, links it to the signed-in profile, flips the tier immediately (RTDN
 * can lag by minutes), and acknowledges the purchase so Play does not refund
 * it after three days.
 */
export async function POST(request: Request) {
  const userId = await getParentUserId(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let purchaseToken: string | undefined
  let productId: string | undefined
  try {
    const body = await request.json()
    purchaseToken = typeof body?.purchaseToken === 'string' ? body.purchaseToken : undefined
    productId = typeof body?.productId === 'string' ? body.productId : undefined
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (!purchaseToken) return NextResponse.json({ error: 'purchaseToken required' }, { status: 400 })

  try {
    const purchase = await getSubscriptionV2(purchaseToken)
    const lineProduct = purchase.lineItems?.[0]?.productId ?? productId ?? null
    if (!lineProduct || !PLAY_SUBSCRIPTION_PRODUCT_IDS.includes(lineProduct)) {
      return NextResponse.json({ error: 'Unknown product' }, { status: 400 })
    }
    // A token stamped with another profile's id belongs to someone else.
    const externalId = purchase.externalAccountIdentifiers?.obfuscatedExternalAccountId
    if (externalId && externalId !== userId) {
      return NextResponse.json({ error: 'Purchase belongs to a different account' }, { status: 403 })
    }

    const tier = tierForPlaySubscriptionState(purchase.subscriptionState)
    const admin = createServiceRoleClient()
    const update: Record<string, string> = { google_purchase_token: purchaseToken }
    if (tier === 'premium') update.subscription_type = 'premium'
    const { error } = await (admin as any).from('profiles').update(update).eq('id', userId)
    if (error) throw error

    if (purchase.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_PENDING') {
      await acknowledgeSubscription(lineProduct, purchaseToken).catch((e) => console.error('acknowledge failed (client will retry):', e))
    }

    return NextResponse.json({ ok: true, tier: tier ?? 'unchanged', state: purchase.subscriptionState ?? null })
  } catch (error) {
    console.error('Play verify failed:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 502 })
  }
}
