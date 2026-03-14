/**
 * Rule-based chore suggestion engine.
 *
 * Generates personalised chore recommendations for each child based on:
 *   • age-appropriate difficulty
 *   • chores the family already has (avoids duplicates)
 *   • seasonal relevance (month-based)
 *   • completion-rate patterns (encourages variety when rate is high)
 */

// ── Chore catalogue ────────────────────────────────────────────────
interface ChoreDef {
  name: string
  category: string
  icon: string
  minAge: number
  maxAge: number
  /** Suggested reward in cents */
  rewardCents: number
  /** Months when this chore is most relevant (1-12). Empty = year-round. */
  seasonalMonths: number[]
}

const CHORE_CATALOGUE: ChoreDef[] = [
  // ── Self-care (ages 3-7) ──────────────────────────────────
  { name: 'Brush teeth', category: 'self-care', icon: '🪥', minAge: 3, maxAge: 18, rewardCents: 5, seasonalMonths: [] },
  { name: 'Make bed', category: 'self-care', icon: '🛏️', minAge: 4, maxAge: 18, rewardCents: 5, seasonalMonths: [] },
  { name: 'Get dressed by yourself', category: 'self-care', icon: '👕', minAge: 3, maxAge: 8, rewardCents: 5, seasonalMonths: [] },
  { name: 'Put pajamas on', category: 'self-care', icon: '🌙', minAge: 3, maxAge: 8, rewardCents: 5, seasonalMonths: [] },
  { name: 'Wash hands before meals', category: 'self-care', icon: '🧼', minAge: 3, maxAge: 10, rewardCents: 3, seasonalMonths: [] },
  { name: 'Comb/brush hair', category: 'self-care', icon: '💇', minAge: 4, maxAge: 12, rewardCents: 3, seasonalMonths: [] },
  { name: 'Take a shower', category: 'self-care', icon: '🚿', minAge: 6, maxAge: 18, rewardCents: 5, seasonalMonths: [] },
  { name: 'Pack school bag', category: 'self-care', icon: '🎒', minAge: 5, maxAge: 14, rewardCents: 5, seasonalMonths: [1, 2, 3, 4, 5, 9, 10, 11, 12] },

  // ── Tidying (ages 3-10) ───────────────────────────────────
  { name: 'Put toys away', category: 'tidying', icon: '🧸', minAge: 3, maxAge: 10, rewardCents: 5, seasonalMonths: [] },
  { name: 'Pick up clothes off floor', category: 'tidying', icon: '👚', minAge: 4, maxAge: 12, rewardCents: 5, seasonalMonths: [] },
  { name: 'Tidy bedroom', category: 'tidying', icon: '🧹', minAge: 5, maxAge: 18, rewardCents: 10, seasonalMonths: [] },
  { name: 'Organize bookshelf', category: 'tidying', icon: '📚', minAge: 5, maxAge: 14, rewardCents: 10, seasonalMonths: [] },
  { name: 'Clean off desk', category: 'tidying', icon: '🗂️', minAge: 6, maxAge: 18, rewardCents: 10, seasonalMonths: [] },

  // ── Kitchen (ages 4-18) ───────────────────────────────────
  { name: 'Set the table', category: 'kitchen', icon: '🍽️', minAge: 4, maxAge: 14, rewardCents: 10, seasonalMonths: [] },
  { name: 'Clear the table', category: 'kitchen', icon: '🧹', minAge: 4, maxAge: 14, rewardCents: 10, seasonalMonths: [] },
  { name: 'Help load dishwasher', category: 'kitchen', icon: '🍽️', minAge: 6, maxAge: 14, rewardCents: 15, seasonalMonths: [] },
  { name: 'Unload dishwasher', category: 'kitchen', icon: '✨', minAge: 7, maxAge: 18, rewardCents: 15, seasonalMonths: [] },
  { name: 'Wipe kitchen counter', category: 'kitchen', icon: '🧽', minAge: 6, maxAge: 18, rewardCents: 10, seasonalMonths: [] },
  { name: 'Help with cooking', category: 'kitchen', icon: '👩‍🍳', minAge: 7, maxAge: 18, rewardCents: 20, seasonalMonths: [] },
  { name: 'Pack lunch', category: 'kitchen', icon: '🥪', minAge: 7, maxAge: 18, rewardCents: 10, seasonalMonths: [1, 2, 3, 4, 5, 9, 10, 11, 12] },

  // ── Laundry (ages 6-18) ───────────────────────────────────
  { name: 'Put dirty clothes in hamper', category: 'laundry', icon: '🧺', minAge: 4, maxAge: 12, rewardCents: 5, seasonalMonths: [] },
  { name: 'Sort laundry', category: 'laundry', icon: '👕', minAge: 7, maxAge: 18, rewardCents: 15, seasonalMonths: [] },
  { name: 'Fold laundry', category: 'laundry', icon: '🧥', minAge: 7, maxAge: 18, rewardCents: 15, seasonalMonths: [] },
  { name: 'Put away clean clothes', category: 'laundry', icon: '🗄️', minAge: 6, maxAge: 18, rewardCents: 10, seasonalMonths: [] },

  // ── Pets (ages 5-18) ──────────────────────────────────────
  { name: 'Feed the pet', category: 'pets', icon: '🐾', minAge: 5, maxAge: 18, rewardCents: 10, seasonalMonths: [] },
  { name: 'Fill water bowl', category: 'pets', icon: '💧', minAge: 4, maxAge: 14, rewardCents: 5, seasonalMonths: [] },
  { name: 'Walk the dog', category: 'pets', icon: '🐕', minAge: 8, maxAge: 18, rewardCents: 25, seasonalMonths: [] },
  { name: 'Clean pet area', category: 'pets', icon: '🧹', minAge: 8, maxAge: 18, rewardCents: 20, seasonalMonths: [] },

  // ── Outdoor / seasonal ────────────────────────────────────
  { name: 'Water plants', category: 'outdoor', icon: '🌱', minAge: 4, maxAge: 14, rewardCents: 10, seasonalMonths: [4, 5, 6, 7, 8, 9] },
  { name: 'Help in the garden', category: 'outdoor', icon: '🌻', minAge: 6, maxAge: 18, rewardCents: 25, seasonalMonths: [3, 4, 5, 6, 7, 8, 9] },
  { name: 'Rake leaves', category: 'outdoor', icon: '🍂', minAge: 6, maxAge: 18, rewardCents: 25, seasonalMonths: [9, 10, 11] },
  { name: 'Shovel snow from walkway', category: 'outdoor', icon: '❄️', minAge: 8, maxAge: 18, rewardCents: 50, seasonalMonths: [11, 12, 1, 2, 3] },
  { name: 'Take out recycling', category: 'outdoor', icon: '♻️', minAge: 6, maxAge: 18, rewardCents: 10, seasonalMonths: [] },
  { name: 'Take out trash', category: 'outdoor', icon: '🗑️', minAge: 7, maxAge: 18, rewardCents: 10, seasonalMonths: [] },
  { name: 'Bring in mail', category: 'outdoor', icon: '📬', minAge: 5, maxAge: 14, rewardCents: 5, seasonalMonths: [] },

  // ── Household (older kids) ────────────────────────────────
  { name: 'Vacuum a room', category: 'household', icon: '🧹', minAge: 8, maxAge: 18, rewardCents: 25, seasonalMonths: [] },
  { name: 'Sweep the floor', category: 'household', icon: '🧹', minAge: 7, maxAge: 18, rewardCents: 15, seasonalMonths: [] },
  { name: 'Dust furniture', category: 'household', icon: '✨', minAge: 7, maxAge: 18, rewardCents: 15, seasonalMonths: [] },
  { name: 'Clean bathroom sink', category: 'household', icon: '🚰', minAge: 8, maxAge: 18, rewardCents: 20, seasonalMonths: [] },
  { name: 'Take out trash cans', category: 'household', icon: '🗑️', minAge: 9, maxAge: 18, rewardCents: 15, seasonalMonths: [] },
  { name: 'Wipe down mirrors', category: 'household', icon: '🪞', minAge: 7, maxAge: 18, rewardCents: 10, seasonalMonths: [] },

  // ── Academic / responsibility (ages 5-18) ─────────────────
  { name: 'Read for 20 minutes', category: 'learning', icon: '📖', minAge: 5, maxAge: 18, rewardCents: 15, seasonalMonths: [] },
  { name: 'Do homework', category: 'learning', icon: '📝', minAge: 5, maxAge: 18, rewardCents: 10, seasonalMonths: [1, 2, 3, 4, 5, 9, 10, 11, 12] },
  { name: 'Practice instrument', category: 'learning', icon: '🎵', minAge: 5, maxAge: 18, rewardCents: 15, seasonalMonths: [] },
  { name: 'Screen-free hour', category: 'learning', icon: '📵', minAge: 6, maxAge: 18, rewardCents: 15, seasonalMonths: [] },
]

// ── Public types ────────────────────────────────────────────────────
export interface ChoreSuggestion {
  name: string
  category: string
  icon: string
  rewardCents: number
  /** Why this chore was suggested */
  reason: string
}

export interface SuggestionRequest {
  /** Child name (for display in reasons) */
  childName: string
  /** Child age – null if not set */
  childAge: number | null
  /** Names of chores the child already has */
  existingChoreNames: string[]
  /** Average completion rate (0-100) — higher = suggest harder chores */
  completionRate: number
}

// ── Engine ──────────────────────────────────────────────────────────
export function generateSuggestions(req: SuggestionRequest, count = 5): ChoreSuggestion[] {
  const age = req.childAge ?? 7 // Default to 7 if unknown
  const month = new Date().getMonth() + 1 // 1-12
  const existingLower = new Set(req.existingChoreNames.map(n => n.toLowerCase().trim()))

  // Filter catalogue to age-appropriate, non-duplicate chores
  let candidates = CHORE_CATALOGUE.filter(c => {
    if (age < c.minAge || age > c.maxAge) return false
    if (existingLower.has(c.name.toLowerCase())) return false
    return true
  })

  // Score each candidate
  const scored = candidates.map(c => {
    let score = 0

    // Seasonal boost
    if (c.seasonalMonths.length > 0 && c.seasonalMonths.includes(month)) {
      score += 30
    }

    // Category diversity — prefer categories the child doesn't have yet
    const existingCategories = new Set<string>()
    // We don't have category data for existing chores, so just use name matching
    // to roughly diversify
    if (!existingLower.has(c.category)) {
      score += 15
    }

    // High completion rate → suggest slightly harder / higher-reward chores
    if (req.completionRate > 75 && c.rewardCents >= 15) {
      score += 10
    }

    // Lower age chores get a small boost for young kids (simpler = more achievable)
    if (age <= 6 && c.maxAge <= 10) {
      score += 10
    }

    // Year-round chores get a small baseline
    if (c.seasonalMonths.length === 0) {
      score += 5
    }

    // Tiny bit of deterministic randomness based on name hash so list isn't static
    const hash = c.name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
    score += (hash + new Date().getDate()) % 7

    return { chore: c, score }
  })

  // Sort by score descending, take top N
  scored.sort((a, b) => b.score - a.score)
  const top = scored.slice(0, count)

  return top.map(({ chore, score }) => {
    let reason = ''
    const month = new Date().getMonth() + 1
    if (chore.seasonalMonths.length > 0 && chore.seasonalMonths.includes(month)) {
      reason = `Great for this time of year`
    } else if (req.completionRate > 75 && chore.rewardCents >= 15) {
      reason = `${req.childName} is doing great — ready for a challenge!`
    } else if (age <= 6 && chore.maxAge <= 10) {
      reason = `Perfect for ${req.childName}'s age`
    } else {
      reason = `Age-appropriate and builds good habits`
    }

    return {
      name: chore.name,
      category: chore.category,
      icon: chore.icon,
      rewardCents: chore.rewardCents,
      reason,
    }
  })
}

/** Handy helper: get category labels with emoji */
export const CATEGORY_LABELS: Record<string, string> = {
  'self-care': '🪥 Self-Care',
  tidying: '🧹 Tidying',
  kitchen: '🍽️ Kitchen',
  laundry: '🧺 Laundry',
  pets: '🐾 Pets',
  outdoor: '🌿 Outdoor',
  household: '🏠 Household',
  learning: '📖 Learning',
}
