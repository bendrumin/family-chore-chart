/**
 * Goals and the Reward Store: shared constants (migration 017).
 *
 * Kept in a client-safe module so both the kid pages and the settings tab can
 * import them without pulling server code into the browser bundle.
 */

/** A store item as a family first sees it. Parents edit freely afterwards. */
export interface StarterRewardItem {
  emoji: string
  title: string
  price_cents: number
}

/**
 * Things money cannot buy, priced in the family's currency units. Shipped so
 * the store is never empty on day one; every family will reprice these.
 */
export const STARTER_REWARD_ITEMS: StarterRewardItem[] = [
  { emoji: '📱', title: '30 minutes of screen time', price_cents: 200 },
  { emoji: '🌙', title: 'Stay up 30 minutes late', price_cents: 300 },
  { emoji: '🎬', title: 'Pick the family movie', price_cents: 400 },
  { emoji: '🍕', title: 'Pick Friday dinner', price_cents: 500 },
  { emoji: '🍦', title: 'Ice cream trip', price_cents: 500 },
  { emoji: '🎲', title: 'Family game night, your pick', price_cents: 400 },
]

/** Emoji a kid can put on a goal. Short and recognizable at 6 years old. */
export const GOAL_EMOJIS = ['🧱', '🎮', '🧸', '📚', '⚽', '🎨', '🚲', '🎧', '👟', '🐶', '🎁', '💰'] as const

/** One-tap goal amounts, in cents. */
export const GOAL_PRESET_CENTS = [500, 1000, 2000, 5000] as const

/** Hard ceiling for a goal target, in cents ($500). */
export const GOAL_MAX_CENTS = 50_000

/** Free tier: one active goal per child, three store items per family. */
export const FREE_GOAL_LIMIT = 1
export const FREE_STORE_ITEM_LIMIT = 3

export type GoalStatus = 'active' | 'reached' | 'archived'
export type RedemptionStatus = 'pending' | 'approved' | 'rejected'
