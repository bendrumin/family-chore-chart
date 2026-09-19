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

// ---------------------------------------------------------------------------
// Feature gates (decided 2026-09-19, docs/PREMIUM.md)
//
// Four features were advertised as Premium but never gated. They are gated
// now for accounts created on or after the cutoff; every account that
// existed before keeps them. Both platforms apply this exact rule
// (iOS: Logic/Entitlements.swift), so a family sees one answer everywhere.

export type GatedFeature = 'themes' | 'sharing' | 'export' | 'analytics'

export const PREMIUM_GATE_CUTOFF = '2026-09-19T00:00:00Z'

/** The six themes iOS has always locked; the web locks the same set now. */
export const PREMIUM_THEME_IDS = ['ocean', 'sunset', 'forest', 'aurora', 'coral', 'lavender'] as const

export function isGrandfathered(createdAt: string | Date | null | undefined): boolean {
  if (!createdAt) return false
  const t = typeof createdAt === 'string' ? Date.parse(createdAt) : createdAt.getTime()
  if (Number.isNaN(t)) return false
  return t < Date.parse(PREMIUM_GATE_CUTOFF)
}

export function canUseFeature(
  _feature: GatedFeature,
  tier: SubscriptionTier | string | undefined,
  createdAt: string | Date | null | undefined
): boolean {
  return isPremium(tier) || isGrandfathered(createdAt)
}

export function isPremiumTheme(themeId: string | null | undefined): boolean {
  return !!themeId && (PREMIUM_THEME_IDS as readonly string[]).includes(themeId)
}
