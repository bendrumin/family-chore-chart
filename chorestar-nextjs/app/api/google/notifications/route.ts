import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import {
  decodePubSubPush, playNotificationName, pushTokenMatches, tierForPlaySubscriptionState,
  PLAY_SUBSCRIPTION_PRODUCT_IDS,
} from '@/lib/google/play-billing'
import { getSubscriptionV2, packageName } from '@/lib/google/play-api'

/**
 * Google Play Real-time Developer Notifications (Pub/Sub push).
 *
 * The Android shell buys Premium through Play Billing; this endpoint is the
 * server truth for the subscription's lifecycle, the same job
 * /api/apple/notifications does for the App Store. Every message carries a
 * purchaseToken; we never trust the notification type alone and instead ask
 * purchases.subscriptionsv2.get for the current state, then set the profile.
 *
 * Mapping a token to a profile:
 *  1. profiles.google_purchase_token, linked by /api/google/verify right after
 *     purchase (and refreshed from linkedPurchaseToken on upgrades/resubscribes)
 *  2. externalAccountIdentifiers.obfuscatedExternalAccountId, which the shell
 *     sets to the profile id at purchase time
 *
 * Configure in Play Console > Monetize > Monetization setup > Real-time
 * developer notifications: a Pub/Sub topic with a PUSH subscription to
 * https://chorestar.app/api/google/notifications?token=<GOOGLE_PUBSUB_PUSH_TOKEN>
 */
export async function POST(request: Request) {
  const url = new URL(request.url)
  if (!pushTokenMatches(url.searchParams.get('token'), process.env.GOOGLE_PUBSUB_PUSH_TOKEN)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const notification = decodePubSubPush(body)
  if (!notification) return NextResponse.json({ error: 'Not a Pub/Sub push' }, { status: 400 })

  const supabase = createServiceRoleClient()

  // The Console's "Send test notification" button.
  if (notification.testNotification) {
    await log(supabase, { notificationType: 'TEST', subtype: null, productId: null, purchaseToken: null, userId: null, action: 'test-logged' })
    return NextResponse.json({ received: true })
  }
  if (notification.packageName && notification.packageName !== packageName()) {
    return NextResponse.json({ error: 'Wrong package' }, { status: 400 })
  }

  const sub = notification.subscriptionNotification
  if (!sub?.purchaseToken) {
    // Voided purchases and one-time products are logged, not acted on (we sell neither).
    await log(supabase, { notificationType: notification.voidedPurchaseNotification ? 'VOIDED_PURCHASE' : 'OTHER', subtype: null, productId: notification.oneTimeProductNotification?.sku ?? null, purchaseToken: notification.voidedPurchaseNotification?.purchaseToken ?? null, userId: null, action: 'logged' })
    return NextResponse.json({ received: true })
  }

  const notificationType = playNotificationName(sub.notificationType)
  const productId = sub.subscriptionId ?? null

  try {
    const purchase = await getSubscriptionV2(sub.purchaseToken)
    const state = purchase.subscriptionState ?? null
    const lineProduct = purchase.lineItems?.[0]?.productId ?? productId
    const externalId = purchase.externalAccountIdentifiers?.obfuscatedExternalAccountId ?? null

    let userId: string | null = null
    for (const token of [sub.purchaseToken, purchase.linkedPurchaseToken].filter(Boolean) as string[]) {
      const { data } = await (supabase as any).from('profiles').select('id').eq('google_purchase_token', token).maybeSingle()
      if (data?.id) { userId = data.id; break }
    }
    if (!userId && externalId) {
      const { data } = await (supabase as any).from('profiles').select('id').eq('id', externalId).maybeSingle()
      userId = data?.id ?? null
    }
    // Keep the mapping on the newest token so renewals after an upgrade still match.
    if (userId) {
      await (supabase as any).from('profiles').update({ google_purchase_token: sub.purchaseToken }).eq('id', userId)
    }

    let action = 'logged'
    const isOurs = !!lineProduct && PLAY_SUBSCRIPTION_PRODUCT_IDS.includes(lineProduct)
    const tier = tierForPlaySubscriptionState(state)
    if (purchase.testPurchase && process.env.NODE_ENV === 'production' && process.env.GOOGLE_PLAY_HONOR_TEST_PURCHASES !== '1') {
      action = 'test-purchase-logged'
    } else if (!userId) {
      action = 'unmatched'
    } else if (isOurs && tier === 'premium') {
      action = await setTier(supabase, userId, 'premium')
    } else if (isOurs && tier === 'free') {
      action = await downgradeIfSafe(supabase, userId)
    }

    await log(supabase, { notificationType, subtype: state, productId: lineProduct, purchaseToken: sub.purchaseToken, userId, action })
    console.log(`Play notification ${notificationType} (${state}) -> ${action}${userId ? ` for user ${userId}` : ''}`)
    return NextResponse.json({ received: true })
  } catch (error) {
    // Non-2xx makes Pub/Sub retry with backoff, so transient failures heal.
    console.error(`Play notification handler error (${notificationType}):`, error)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }
}

async function setTier(supabase: unknown, userId: string, tier: 'free' | 'premium') {
  const { error } = await (supabase as any).from('profiles').update({ subscription_type: tier }).eq('id', userId)
  if (error) throw error
  return tier
}

/** Same guard as the Apple handler: lifetime and active Stripe keep premium. */
async function downgradeIfSafe(supabase: unknown, userId: string) {
  const { data: profile } = await (supabase as any).from('profiles').select('subscription_type, apple_original_transaction_id').eq('id', userId).single()
  if (profile?.subscription_type === 'lifetime') return 'kept-lifetime'
  if (profile?.subscription_type !== 'premium') return 'already-free'
  const active = await stripe.subscriptions.search({ query: `metadata['userId']:'${userId}' AND status:'active'`, limit: 1 })
  if (active.data.length > 0) return 'kept-stripe-active'
  return setTier(supabase, userId, 'free')
}

async function log(supabase: unknown, row: { notificationType: string; subtype: string | null; productId: string | null; purchaseToken: string | null; userId: string | null; action: string }) {
  const { error } = await (supabase as any).from('google_notifications').insert({
    notification_type: row.notificationType,
    subtype: row.subtype,
    product_id: row.productId,
    purchase_token: row.purchaseToken,
    user_id: row.userId,
    action: row.action,
  })
  if (error) console.error('Failed to log Play notification:', error)
}
