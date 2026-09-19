export type SubscriptionTier = 'free' | 'premium' | 'lifetime'

export function isPremium(tier: SubscriptionTier | string | undefined): boolean {
  return tier === 'premium' || tier === 'lifetime'
}

export function getChildLimit(tier: SubscriptionTier | string | undefined): number {
  return isPremium(tier) ? Infinity : 3
}

// Family-wide, matching the iOS gate (SupabaseManager.choreLimit). The two
// clients must agree or a free family hits different walls per device.
export function getChoreLimit(tier: SubscriptionTier | string | undefined): number {
  return isPremium(tier) ? Infinity : 20
}

/**
 * Which tier a completed Stripe Checkout grants. Subscriptions (monthly,
 * annual) are premium; the one-time lifetime purchase is lifetime, which
 * the cancellation path treats as permanent. Anything else grants nothing,
 * so an unexpected session can never upgrade an account by accident.
 */
export function tierForCheckout(
  mode: string | null | undefined,
  planType: string | null | undefined
): 'premium' | 'lifetime' | null {
  if (mode === 'subscription') return 'premium'
  if (mode === 'payment' && planType === 'lifetime') return 'lifetime'
  return null
}
