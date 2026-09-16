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
