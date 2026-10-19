/**
 * Star Pets (migration 034): what a kid may adopt, wear and collect.
 *
 * Free plan (the teaser): one species (FREE_SPECIES), grows to the end of the
 * "kid" stage, no cosmetics, no monthly drops. Premium: every species, every
 * stage and the star form, level cosmetics, and a new drop every month.
 *
 * A lapsed family keeps its pet exactly as adopted (no pet is swapped or
 * taken away); it just shows no cosmetics and stops at the kid stage until
 * Premium returns, when everything collected comes back.
 *
 * The API routes call these before every write, so the rules hold for any
 * client. Pure and unit-tested in pets.test.ts.
 */

import {
  FREE_SPECIES,
  PET_ITEMS,
  PET_SLOTS,
  PET_SPECIES_IDS,
  dropForMonth,
  getPetItem,
  levelItems,
  type PetItem,
  type PetSlot,
  type PetSpecies,
} from './catalog'

/** XP a kid earns inside a month to collect that month's drop (about five chores). */
export const DROP_XP_GOAL = 50

export type PetEquipped = Record<PetSlot, string | null>

export const NOTHING_EQUIPPED: PetEquipped = { hat: null, accessory: null, habitat: null }

export function speciesAllowed(species: PetSpecies, premium: boolean): boolean {
  return premium || species === FREE_SPECIES
}

export function speciesOptions(premium: boolean): Array<{ id: PetSpecies; locked: boolean }> {
  return PET_SPECIES_IDS.map(id => ({ id, locked: !speciesAllowed(id, premium) }))
}

export type ItemState =
  /** Wearable now. */
  | 'unlocked'
  /** Premium, a level item not reached yet. */
  | 'level'
  /** Premium, a monthly drop not collected. */
  | 'drop'
  /** Free plan: every cosmetic is Premium. */
  | 'premium'

export interface ItemAccess {
  premium: boolean
  /** The pet's TRUE level (XP-derived). On Premium that's the shown level. */
  level: number
  /** Drop items this kid collected. */
  owned: ReadonlySet<string>
}

export function itemState(item: PetItem, a: ItemAccess): ItemState {
  if (!a.premium) return 'premium'
  if (item.unlock.kind === 'level') return a.level >= item.unlock.level ? 'unlocked' : 'level'
  return a.owned.has(item.id) ? 'unlocked' : 'drop'
}

export function canEquip(itemId: string, slot: PetSlot, a: ItemAccess): boolean {
  const item = getPetItem(itemId)
  if (!item || item.slot !== slot) return false
  return itemState(item, a) === 'unlocked'
}

/**
 * What to draw: equipped ids that are still wearable. A free (or lapsed)
 * family draws none; an unknown or mismatched id is dropped.
 */
export function visibleEquipped(equipped: Partial<PetEquipped> | null | undefined, a: ItemAccess): PetEquipped {
  const out: PetEquipped = { ...NOTHING_EQUIPPED }
  if (!equipped) return out
  for (const slot of PET_SLOTS) {
    const id = equipped[slot]
    if (id && canEquip(id, slot, a)) out[slot] = id
  }
  return out
}

export interface WardrobeEntry {
  id: string
  slot: PetSlot
  emoji: string
  state: ItemState
  equipped: boolean
  /** Level items: the level that unlocks it. */
  level: number | null
  /** Drop items: 1..12. */
  month: number | null
}

/**
 * The wardrobe, every slot: level items in level order, then drops the kid
 * owns. Drops not collected are left out (they only show as "this month's
 * drop"), so a kid never stares at eleven things they can't get today.
 */
export function wardrobe(a: ItemAccess, equipped: PetEquipped): WardrobeEntry[] {
  const entries: WardrobeEntry[] = []
  for (const item of levelItems()) {
    entries.push({
      id: item.id,
      slot: item.slot,
      emoji: item.emoji,
      state: itemState(item, a),
      equipped: equipped[item.slot] === item.id,
      level: item.unlock.level,
      month: null,
    })
  }
  for (const item of PET_ITEMS as readonly PetItem[]) {
    if (item.unlock.kind !== 'drop' || !a.owned.has(item.id)) continue
    entries.push({
      id: item.id,
      slot: item.slot,
      emoji: item.emoji,
      state: itemState(item, a),
      equipped: equipped[item.slot] === item.id,
      level: null,
      month: item.unlock.month,
    })
  }
  return entries
}

/** The next level item the pet will unlock, for "Next: Beanie at level 7". */
export function nextLevelUnlock(level: number): { id: string; level: number } | null {
  const next = levelItems().find(i => i.unlock.level > level)
  return next ? { id: next.id, level: next.unlock.level } : null
}

/** Level items that unlock when a pet goes from `from` to `to` (exclusive, inclusive). */
export function unlockedBetween(from: number, to: number): string[] {
  return levelItems()
    .filter(i => i.unlock.level > from && i.unlock.level <= to)
    .map(i => i.id)
}

export interface DropStatus {
  itemId: string
  slot: PetSlot
  emoji: string
  /** YYYY-MM */
  monthKey: string
  /** SEASONAL_THEMES_DATA id. */
  season: string
  owned: boolean
  /** Premium, not owned yet, and this month's XP reached the goal. */
  collectible: boolean
  xpThisMonth: number
  goal: number
  /** Free plan: shown as a teaser, never collectible. */
  locked: boolean
}

export function monthKeyOf(date: string): string {
  return date.slice(0, 7)
}

export function monthStartOf(date: string): string {
  return `${date.slice(0, 7)}-01`
}

export function dropStatus(input: {
  today: string
  premium: boolean
  owned: ReadonlySet<string>
  xpThisMonth: number
}): DropStatus | null {
  const monthKey = monthKeyOf(input.today)
  const item = dropForMonth(monthKey)
  if (!item || item.unlock.kind !== 'drop') return null
  const owned = input.owned.has(item.id)
  const xp = Math.max(0, Math.floor(input.xpThisMonth))
  return {
    itemId: item.id,
    slot: item.slot,
    emoji: item.emoji,
    monthKey,
    season: item.unlock.season,
    owned,
    collectible: input.premium && !owned && xp >= DROP_XP_GOAL,
    xpThisMonth: xp,
    goal: DROP_XP_GOAL,
    locked: !input.premium,
  }
}

const NAME_MAX = 20

/** Trim, collapse spaces, drop control characters; null when nothing is left or too long. */
export function cleanPetName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  // eslint-disable-next-line no-control-regex
  const name = raw.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim()
  if (name.length === 0 || [...name].length > NAME_MAX) return null
  return name
}
