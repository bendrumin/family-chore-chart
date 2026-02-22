export type SubscriptionTier = 'free' | 'premium' | 'lifetime'

export function isPremium(tier: SubscriptionTier | string | undefined): boolean {
  return tier === 'premium' || tier === 'lifetime'
}

export function getChildLimit(tier: SubscriptionTier | string | undefined): number {
  return isPremium(tier) ? Infinity : 3
}

export function getChoreLimit(tier: SubscriptionTier | string | undefined): number {
  return isPremium(tier) ? Infinity : 20
}
