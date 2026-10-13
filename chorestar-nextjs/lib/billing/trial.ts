/**
 * The 7-day free trial on the yearly plan (October 2026). Monthly has none, so
 * the trial also nudges families toward the plan they keep longer.
 *
 * One trial per family, across every store: a family that has ever paid
 * through Stripe, Apple or Google buys straight away. Apple and Google enforce
 * their own one-trial rule; this is the same rule for the web.
 */

export const TRIAL_DAYS = 7

export interface TrialHistory {
  /** Any Stripe subscription for this email, in any state, ever. */
  stripeSubscriptions: number
  appleOriginalTransactionId: string | null
  googlePurchaseToken: string | null
}

export function trialDaysFor(planType: string, history: TrialHistory): number | null {
  if (planType !== 'annual') return null
  if (history.stripeSubscriptions > 0) return null
  if (history.appleOriginalTransactionId || history.googlePurchaseToken) return null
  return TRIAL_DAYS
}
