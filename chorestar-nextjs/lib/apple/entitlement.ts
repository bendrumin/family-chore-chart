import type { JWSTransactionDecodedPayload } from '@apple/app-store-server-library'
import { APPLE_SUBSCRIPTION_PRODUCT_IDS } from './verifier'

export type EntitlementDecision =
  | { grant: true; persist: boolean; originalTransactionId: string }
  | { grant: false; reason: string }

/**
 * Whether a verified Apple transaction entitles this account to Premium, and
 * whether to save that. Pure so entitlement.test.ts covers it.
 *
 * - The purchase must be ours, unexpired and not refunded.
 * - appAccountToken is the profile id stamped at purchase. When present it
 *   must be THIS account: one Apple ID signed into two ChoreStar accounts no
 *   longer upgrades both.
 * - Without a token (offer codes, purchases before 2.0.1) the original
 *   transaction id must not already belong to another family.
 * - Sandbox (TestFlight, App Review) unlocks the app for the session but is
 *   never saved, so a free sandbox purchase can't make a family Premium.
 */
export function decideEntitlement(input: {
  userId: string
  environment: 'Production' | 'Sandbox'
  transaction: Pick<JWSTransactionDecodedPayload, 'productId' | 'expiresDate' | 'revocationDate' | 'appAccountToken' | 'originalTransactionId'>
  claimedByUserId: string | null
  now?: number
}): EntitlementDecision {
  const { userId, environment, transaction: t, claimedByUserId } = input
  const now = input.now ?? Date.now()
  if (!t.productId || !APPLE_SUBSCRIPTION_PRODUCT_IDS.includes(t.productId)) return { grant: false, reason: 'not a ChoreStar subscription' }
  if (t.revocationDate) return { grant: false, reason: 'refunded' }
  if (!t.expiresDate || t.expiresDate <= now) return { grant: false, reason: 'expired' }
  if (!t.originalTransactionId) return { grant: false, reason: 'no transaction id' }
  if (t.appAccountToken && t.appAccountToken.toLowerCase() !== userId.toLowerCase()) {
    return { grant: false, reason: 'bought by a different ChoreStar account' }
  }
  if (!t.appAccountToken && claimedByUserId && claimedByUserId !== userId) {
    return { grant: false, reason: 'already linked to a different ChoreStar account' }
  }
  return { grant: true, persist: environment === 'Production', originalTransactionId: String(t.originalTransactionId) }
}
