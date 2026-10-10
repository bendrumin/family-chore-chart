import type Stripe from 'stripe'
import { appleServerCredentials, appleSubscriptionActive } from '@/lib/apple/server-api'
import { getSubscriptionV2 } from '@/lib/google/play-api'
import { tierForPlaySubscriptionState } from '@/lib/google/play-billing'

export type BillingRail = 'stripe' | 'apple' | 'google'

/**
 * Why a family should stay Premium when one billing rail ends, or null to
 * downgrade. A family can pay on more than one rail (web, then iPhone), and a
 * cancellation on one must not cut off a family still paying on another.
 * Pure so keep-premium.test.ts covers it; the checks feed it.
 */
export function keepPremiumReason(input: {
  tier: string | null | undefined
  ending: BillingRail
  active: Partial<Record<BillingRail, boolean>>
}): string | null {
  if (input.tier === 'lifetime') return 'kept-lifetime'
  for (const rail of ['stripe', 'apple', 'google'] as const) {
    if (rail !== input.ending && input.active[rail]) return `kept-${rail}-active`
  }
  return null
}

/**
 * Looks up the other rails for this family. Throws when a rail can't be
 * reached, so the webhook returns non-2xx and its sender retries: a late
 * downgrade is better than wrongly cutting off a paying family.
 */
export async function otherRailsActive(
  profile: { id: string; apple_original_transaction_id?: string | null; google_purchase_token?: string | null },
  ending: BillingRail,
  stripe: Stripe
): Promise<Partial<Record<BillingRail, boolean>>> {
  const active: Partial<Record<BillingRail, boolean>> = {}
  if (ending !== 'stripe') {
    const found = await stripe.subscriptions.search({
      query: `metadata['userId']:'${profile.id}' AND status:'active'`,
      limit: 1,
    })
    active.stripe = found.data.length > 0
  }
  if (ending !== 'apple' && profile.apple_original_transaction_id) {
    const creds = appleServerCredentials()
    if (creds) active.apple = await appleSubscriptionActive(profile.apple_original_transaction_id, creds)
    else console.warn('Apple check skipped: APP_STORE_API_* not set')
  }
  if (ending !== 'google' && profile.google_purchase_token) {
    const sub = await getSubscriptionV2(profile.google_purchase_token)
    active.google = tierForPlaySubscriptionState(sub.subscriptionState) === 'premium'
  }
  return active
}
