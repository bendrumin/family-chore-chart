/**
 * Star Pets (Premium, migration 034): the static catalog.
 *
 * Everything a pet can be or wear lives here, so the feature runs with no
 * content pipeline: six species, four growth stages plus the rare star form,
 * cosmetics unlocked by level, and twelve monthly drops (one per calendar
 * month, each tied to a seasonal theme id from lib/constants/seasonal-themes.ts
 * so the drop matches the app's own seasonal look that month).
 *
 * Ids are stored in child_pets (species, hat, accessory, habitat) and
 * child_pet_cosmetics (item_id). Never rename an id; add new ones. The SVG art
 * for every id lives in components/pets/pet-art.tsx, and the kid-facing names
 * in lib/i18n/kid.ts (`pet.species.<id>`, `pet.item.<id>`).
 *
 * Drops repeat every year: a missed October witch hat is back next October,
 * so nothing is lost for good. A future year's items can be added here with
 * a `year`, and dropForMonth prefers the year-specific one.
 */

export const PET_SPECIES_IDS = ['pup', 'kitty', 'bunny', 'dino', 'panda', 'owl'] as const
export type PetSpecies = (typeof PET_SPECIES_IDS)[number]

/** The one species a free family's kid can adopt. */
export const FREE_SPECIES: PetSpecies = 'pup'

export const PET_STAGES = ['baby', 'kid', 'teen', 'adult'] as const
export type PetStage = (typeof PET_STAGES)[number]

/** The level each stage starts at. */
export const STAGE_START_LEVEL: Record<PetStage, number> = { baby: 1, kid: 5, teen: 10, adult: 18 }

/** Highest level. Nobody needs a level 900 pet. */
export const MAX_LEVEL = 50

/**
 * Free families: the pet grows to the end of the "kid" stage and waits there.
 * XP keeps counting, so upgrading grows it straight to where it should be.
 */
export const FREE_MAX_LEVEL = STAGE_START_LEVEL.teen - 1

/** The rare star form: a grown-up pet whose kid kept a 30-day streak since adopting. */
export const STAR_STREAK_DAYS = 30

export const PET_SLOTS = ['hat', 'accessory', 'habitat'] as const
export type PetSlot = (typeof PET_SLOTS)[number]

export type PetUnlock =
  | { kind: 'level'; level: number }
  | {
      kind: 'drop'
      /** 1 = January .. 12 = December. */
      month: number
      /** Optional: only this year's drop. Without it the item drops every year. */
      year?: number
      /** A SEASONAL_THEMES_DATA id (lib/constants/seasonal-themes.ts). */
      season: string
    }

export interface PetItem {
  id: string
  slot: PetSlot
  /** Fallback glyph for tiny lists and alt text. */
  emoji: string
  unlock: PetUnlock
}

export const PET_ITEMS = [
  // --- Level unlocks (free to keep forever once reached, on Premium) -------
  { id: 'bowtie', slot: 'accessory', emoji: '🎀', unlock: { kind: 'level', level: 2 } },
  { id: 'cap', slot: 'hat', emoji: '🧢', unlock: { kind: 'level', level: 3 } },
  { id: 'meadow', slot: 'habitat', emoji: '🌼', unlock: { kind: 'level', level: 4 } },
  { id: 'bandana', slot: 'accessory', emoji: '🧣', unlock: { kind: 'level', level: 6 } },
  { id: 'beanie', slot: 'hat', emoji: '🧶', unlock: { kind: 'level', level: 7 } },
  { id: 'bedroom', slot: 'habitat', emoji: '🛏️', unlock: { kind: 'level', level: 9 } },
  { id: 'star_glasses', slot: 'accessory', emoji: '🤩', unlock: { kind: 'level', level: 12 } },
  { id: 'beach', slot: 'habitat', emoji: '🏖️', unlock: { kind: 'level', level: 14 } },
  { id: 'wizard_hat', slot: 'hat', emoji: '🧙', unlock: { kind: 'level', level: 16 } },
  { id: 'space', slot: 'habitat', emoji: '🪐', unlock: { kind: 'level', level: 20 } },
  { id: 'medal', slot: 'accessory', emoji: '🏅', unlock: { kind: 'level', level: 24 } },
  { id: 'crown', slot: 'hat', emoji: '👑', unlock: { kind: 'level', level: 30 } },

  // --- Monthly drops: "new this month", collected by doing things that month
  { id: 'party_hat', slot: 'hat', emoji: '🥳', unlock: { kind: 'drop', month: 1, season: 'newYear' } },
  { id: 'heart_glasses', slot: 'accessory', emoji: '💖', unlock: { kind: 'drop', month: 2, season: 'valentine' } },
  { id: 'clover_hat', slot: 'hat', emoji: '☘️', unlock: { kind: 'drop', month: 3, season: 'stPatricks' } },
  { id: 'flower_crown', slot: 'hat', emoji: '🌸', unlock: { kind: 'drop', month: 4, season: 'easter' } },
  { id: 'garden', slot: 'habitat', emoji: '🌷', unlock: { kind: 'drop', month: 5, season: 'spring' } },
  { id: 'sunglasses', slot: 'accessory', emoji: '😎', unlock: { kind: 'drop', month: 6, season: 'summer' } },
  { id: 'fireworks', slot: 'habitat', emoji: '🎆', unlock: { kind: 'drop', month: 7, season: 'summer' } },
  { id: 'sun_hat', slot: 'hat', emoji: '👒', unlock: { kind: 'drop', month: 8, season: 'summer' } },
  { id: 'leaf_scarf', slot: 'accessory', emoji: '🍂', unlock: { kind: 'drop', month: 9, season: 'fall' } },
  { id: 'witch_hat', slot: 'hat', emoji: '🎃', unlock: { kind: 'drop', month: 10, season: 'halloween' } },
  { id: 'harvest', slot: 'habitat', emoji: '🍁', unlock: { kind: 'drop', month: 11, season: 'thanksgiving' } },
  { id: 'santa_hat', slot: 'hat', emoji: '🎅', unlock: { kind: 'drop', month: 12, season: 'christmas' } },
] as const satisfies readonly PetItem[]

export type PetItemId = (typeof PET_ITEMS)[number]['id']

const ITEM_BY_ID = new Map<string, PetItem>(PET_ITEMS.map(i => [i.id, i as PetItem]))

export function isPetSpecies(v: unknown): v is PetSpecies {
  return typeof v === 'string' && (PET_SPECIES_IDS as readonly string[]).includes(v)
}

export function isPetSlot(v: unknown): v is PetSlot {
  return typeof v === 'string' && (PET_SLOTS as readonly string[]).includes(v)
}

export function getPetItem(id: string | null | undefined): PetItem | null {
  if (!id) return null
  return ITEM_BY_ID.get(id) ?? null
}

/** Level-unlocked items, lowest level first. */
export function levelItems(): Array<PetItem & { unlock: { kind: 'level'; level: number } }> {
  return (PET_ITEMS as readonly PetItem[])
    .filter((i): i is PetItem & { unlock: { kind: 'level'; level: number } } => i.unlock.kind === 'level')
    .sort((a, b) => a.unlock.level - b.unlock.level)
}

/** The drop for a YYYY-MM month: a year-specific item first, else the evergreen one. */
export function dropForMonth(monthKey: string): PetItem | null {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey)
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  let evergreen: PetItem | null = null
  for (const item of PET_ITEMS as readonly PetItem[]) {
    if (item.unlock.kind !== 'drop' || item.unlock.month !== month) continue
    if (item.unlock.year === year) return item
    if (item.unlock.year === undefined && !evergreen) evergreen = item
  }
  return evergreen
}
