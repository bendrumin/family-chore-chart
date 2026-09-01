import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import {
  verifyNotification,
  APPLE_SUBSCRIPTION_PRODUCT_IDS,
  type VerifiedNotification,
} from '@/lib/apple/verifier'

/**
 * App Store Server Notifications V2.
 *
 * Apple POSTs a signed JWS here whenever an Apple-billed subscription changes
 * state. This closes the gap the clients can't: the iOS app only ever
 * upgrades profiles.subscription_type (and Stripe's webhook can't see Apple),
 * so without this endpoint an Apple subscriber who cancels keeps premium
 * forever.
 *
 * Mapping a notification to a profile:
 *  1. appAccountToken — set to the profile UUID at purchase time (iOS 2.0.1+)
 *  2. profiles.apple_original_transaction_id — recorded by the app during
 *     entitlement sync, which also heals subscribers who bought before 2.0.1
 * Unmatched notifications are logged to apple_notifications for manual
 * reconciliation (migration 018).
 *
 * Configure in App Store Connect > ChoreStar > App Information >
 * App Store Server Notifications: Version 2, URL
 * https://chorestar.app/api/apple/notifications (both Production and Sandbox).
 */

// Still entitled -> make sure the profile says premium.
const UPGRADE_TYPES = new Set(['SUBSCRIBED', 'DID_RENEW', 'OFFER_REDEEMED', 'REFUND_REVERSED'])
// Entitlement is gone -> free. Cancellation alone (DID_CHANGE_RENEWAL_STATUS)
// is NOT here on purpose: the family stays entitled until the period ends,
// and Apple sends EXPIRED at that point.
const DOWNGRADE_TYPES = new Set(['EXPIRED', 'GRACE_PERIOD_EXPIRED', 'REFUND', 'REVOKE'])

export async function POST(request: Request) {
  let signedPayload: string | undefined
  try {
    const body = await request.json()
    signedPayload = body?.signedPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (typeof signedPayload !== 'string' || !signedPayload) {
    return NextResponse.json({ error: 'Missing signedPayload' }, { status: 400 })
  }

  let verified: VerifiedNotification
  try {
    verified = await verifyNotification(signedPayload)
  } catch (err) {
    console.error('Apple notification failed verification:', err)
    return NextResponse.json({ error: 'Verification failed' }, { status: 401 })
  }

  const { environment, payload, transaction } = verified
  const notificationType = payload.notificationType ?? 'UNKNOWN'
  const subtype = payload.subtype ?? null
  const productId = transaction?.productId ?? null
  const originalTransactionId =
    transaction?.originalTransactionId != null ? String(transaction.originalTransactionId) : null
  const appAccountToken = transaction?.appAccountToken ?? null

  const supabase = createServiceRoleClient()

  try {
    // Map the transaction to a profile: appAccountToken is authoritative
    // (it IS the profile id, stamped at purchase), the stored original
    // transaction id covers purchases made before the token existed.
    let userId: string | null = null
    if (appAccountToken) {
      const { data } = await (supabase as any)
        .from('profiles')
        .select('id')
        .eq('id', appAccountToken)
        .maybeSingle()
      userId = data?.id ?? null
    }
    if (!userId && originalTransactionId) {
      const { data } = await (supabase as any)
        .from('profiles')
        .select('id')
        .eq('apple_original_transaction_id', originalTransactionId)
        .maybeSingle()
      userId = data?.id ?? null
    }

    // Keep the mapping fresh for future notifications that lack the token.
    if (userId && appAccountToken && originalTransactionId && environment === 'Production') {
      await (supabase as any)
        .from('profiles')
        .update({ apple_original_transaction_id: originalTransactionId })
        .eq('id', userId)
        .is('apple_original_transaction_id', null)
    }

    let action = 'logged'
    const isOurSubscription = productId !== null && APPLE_SUBSCRIPTION_PRODUCT_IDS.includes(productId)

    if (environment !== 'Production') {
      action = 'sandbox-logged'
    } else if (!userId) {
      action = 'unmatched'
    } else if (isOurSubscription && UPGRADE_TYPES.has(notificationType)) {
      action = await setTier(supabase, userId, 'premium')
    } else if (isOurSubscription && DOWNGRADE_TYPES.has(notificationType)) {
      action = await downgradeIfSafe(supabase, userId)
    }

    await logNotification(supabase, {
      notificationType,
      subtype,
      environment,
      productId,
      originalTransactionId,
      appAccountToken,
      userId,
      action,
    })

    console.log(
      `Apple notification ${notificationType}${subtype ? `/${subtype}` : ''} (${environment}) -> ${action}` +
        (userId ? ` for user ${userId}` : '')
    )
    return NextResponse.json({ received: true })
  } catch (error) {
    // Non-2xx makes Apple retry with backoff, so transient DB failures heal.
    console.error(`Apple notification handler error (${notificationType}):`, error)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }
}

async function setTier(supabase: unknown, userId: string, tier: 'free' | 'premium') {
  const { error } = await (supabase as any)
    .from('profiles')
    .update({ subscription_type: tier })
    .eq('id', userId)
  if (error) throw error
  return tier
}

/**
 * Downgrades unless something else still entitles the family: a lifetime
 * plan, or an active Stripe subscription (Stripe stores our userId in the
 * subscription metadata, so search finds it).
 */
async function downgradeIfSafe(supabase: unknown, userId: string) {
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('subscription_type')
    .eq('id', userId)
    .single()

  if (profile?.subscription_type === 'lifetime') return 'kept-lifetime'
  if (profile?.subscription_type !== 'premium') return 'already-free'

  try {
    const active = await stripe.subscriptions.search({
      query: `metadata['userId']:'${userId}' AND status:'active'`,
      limit: 1,
    })
    if (active.data.length > 0) return 'kept-stripe-active'
  } catch (err) {
    // If Stripe is unreachable, keep premium and let Apple's retry re-run the
    // check — wrongly cutting off a paying family is worse than a late downgrade.
    console.error('Stripe check failed during Apple downgrade, keeping premium for now:', err)
    throw err
  }

  return setTier(supabase, userId, 'free')
}

async function logNotification(
  supabase: unknown,
  row: {
    notificationType: string
    subtype: string | null
    environment: string
    productId: string | null
    originalTransactionId: string | null
    appAccountToken: string | null
    userId: string | null
    action: string
  }
) {
  const { error } = await (supabase as any).from('apple_notifications').insert({
    notification_type: row.notificationType,
    subtype: row.subtype,
    environment: row.environment,
    product_id: row.productId,
    original_transaction_id: row.originalTransactionId,
    app_account_token: row.appAccountToken,
    user_id: row.userId,
    action: row.action,
  })
  if (error) {
    // The audit log must never block the state change itself.
    console.error('Failed to log Apple notification:', error)
  }
}
