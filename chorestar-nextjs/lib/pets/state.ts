/**
 * Star Pets (migration 034): one pure function from loaded rows to everything
 * a pet surface shows. The kid API, the parent API and the tests all go
 * through buildPetState, so the kid panel and the parent preview never
 * disagree.
 */

import type { ChoreCompletionLite, RoutineCompletionLite } from '@/lib/challenges/progress'
import type { VacationWindow } from '@/lib/utils/schedule'
import type { PetSpecies, PetStage } from './catalog'
import { isPetSpecies } from './catalog'
import { petMood, type PetMood, type PetMoodInputs } from './mood'
import { computePetXp, nextStage, petGrowth, type PetChallengeWin, type PetChore, type PetXpBreakdown } from './progress'
import {
  dropStatus,
  monthStartOf,
  nextLevelUnlock,
  speciesOptions,
  visibleEquipped,
  wardrobe,
  type DropStatus,
  type ItemAccess,
  type PetEquipped,
  type WardrobeEntry,
} from './unlocks'

/** A child_pets row (migration 034, not in the generated types). */
export interface PetRow {
  child_id: string
  species: string | null
  name: string | null
  adopted_on: string | null
  hat: string | null
  accessory: string | null
  habitat: string | null
  enabled: boolean
}

export const PET_ROW_COLUMNS = 'child_id, species, name, adopted_on, hat, accessory, habitat, enabled'

export interface PetStateInputs {
  row: PetRow | null
  premium: boolean
  /** YYYY-MM-DD, family-local. */
  today: string
  owned: ReadonlySet<string>
  chores: PetChore[]
  choreCompletions: ChoreCompletionLite[]
  routineCompletions: RoutineCompletionLite[]
  challengeWins: PetChallengeWin[]
  vacations?: readonly VacationWindow[] | null
  timeZone?: string | null
  /** Today's numbers for the mood (see lib/pets/mood.ts). */
  todayCounts: Omit<PetMoodInputs, 'hour'>
  hour: number
}

export interface PetState {
  enabled: boolean
  adopted: boolean
  premium: boolean
  species: PetSpecies | null
  name: string | null
  adoptedOn: string | null
  xp: number
  breakdown: PetXpBreakdown | null
  level: number
  trueLevel: number
  stage: PetStage
  star: boolean
  heldBack: boolean
  levelStartXp: number
  nextLevelXp: number | null
  levelPercent: number
  nextStage: { stage: PetStage; level: number } | null
  nextUnlock: { id: string; level: number } | null
  mood: PetMood
  /** What to draw (already filtered by plan and unlocks). */
  equipped: PetEquipped
  /** What the kid chose, even if hidden right now (a lapsed plan). */
  chosen: PetEquipped
  wardrobe: WardrobeEntry[]
  drop: DropStatus | null
  speciesOptions: Array<{ id: PetSpecies; locked: boolean }>
}

export function buildPetState(i: PetStateInputs): PetState {
  const enabled = i.row?.enabled !== false
  const species = i.row && isPetSpecies(i.row.species) ? i.row.species : null
  const adopted = !!(species && i.row?.name && i.row?.adopted_on)
  const chosen: PetEquipped = {
    hat: i.row?.hat ?? null,
    accessory: i.row?.accessory ?? null,
    habitat: i.row?.habitat ?? null,
  }
  const mood = petMood({ ...i.todayCounts, hour: i.hour })

  if (!adopted || !i.row?.adopted_on) {
    const growth = petGrowth(0, { premium: i.premium, bestStreak: 0 })
    return {
      enabled,
      adopted: false,
      premium: i.premium,
      species: null,
      name: null,
      adoptedOn: null,
      xp: 0,
      breakdown: null,
      ...growth,
      nextStage: nextStage(growth.level),
      nextUnlock: nextLevelUnlock(growth.level),
      mood,
      equipped: { hat: null, accessory: null, habitat: null },
      chosen,
      wardrobe: [],
      drop: null,
      speciesOptions: speciesOptions(i.premium),
    }
  }

  const adoptedOn = i.row.adopted_on.slice(0, 10)
  const base = {
    today: i.today,
    chores: i.chores,
    choreCompletions: i.choreCompletions,
    routineCompletions: i.routineCompletions,
    challengeWins: i.challengeWins,
    vacations: i.vacations,
    timeZone: i.timeZone,
  }
  const breakdown = computePetXp({ ...base, from: adoptedOn })
  const monthStart = monthStartOf(i.today)
  const thisMonth = computePetXp({ ...base, from: adoptedOn > monthStart ? adoptedOn : monthStart })

  const growth = petGrowth(breakdown.total, { premium: i.premium, bestStreak: breakdown.bestStreak })
  const access: ItemAccess = { premium: i.premium, level: growth.trueLevel, owned: i.owned }
  const equipped = visibleEquipped(chosen, access)

  return {
    enabled,
    adopted: true,
    premium: i.premium,
    species,
    name: i.row.name,
    adoptedOn,
    xp: breakdown.total,
    breakdown,
    ...growth,
    nextStage: nextStage(growth.level),
    nextUnlock: nextLevelUnlock(growth.level),
    mood,
    equipped,
    chosen,
    wardrobe: wardrobe(access, equipped),
    drop: dropStatus({ today: i.today, premium: i.premium, owned: i.owned, xpThisMonth: thisMonth.total }),
    speciesOptions: speciesOptions(i.premium),
  }
}
