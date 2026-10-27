/**
 * The 7-day free trial, on both plans. Yearly had it alone at first (October
 * 2026), but families kept paying for a month just to look around and
 * switching renewal off within minutes, so monthly got it too. A trial that
 * ends without converting drops back to the free limits like any lapse
 * (lib/billing/plan-limits.ts), so it is no free way past them.
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
  if (planType !== 'annual' && planType !== 'monthly') return null
  if (history.stripeSubscriptions > 0) return null
  if (history.appleOriginalTransactionId || history.googlePurchaseToken) return null
  return TRIAL_DAYS
}
