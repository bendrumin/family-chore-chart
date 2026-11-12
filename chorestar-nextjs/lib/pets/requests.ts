/**
 * A kid asking for a Premium Star Pet (migration 039). The pure parts: who
 * may ask, what the parent is told, and whether a new ask is worth a push.
 * Tested in requests.test.ts; the routes are /api/kid/pet (action "ask") and
 * /api/pets/requests (the parent's Not now).
 */
import { FREE_SPECIES, type PetSpecies } from './catalog'

/** Every species but the free one (FREE_SPECIES, the pup). */
export type RequestableSpecies = Exclude<PetSpecies, 'pup'>

const SPECIES_EMOJI: Record<RequestableSpecies, string> = {
  kitty: '🐱',
  bunny: '🐰',
  dino: '🦖',
  panda: '🐼',
  owl: '🦉',
}

const SPECIES_NAME: Record<RequestableSpecies, string> = {
  kitty: 'kitty',
  bunny: 'bunny',
  dino: 'dino',
  panda: 'panda',
  owl: 'owl',
}

/** Only a free-plan kid asking for a species the free plan doesn't have. */
export function canAskFor(species: PetSpecies, premium: boolean): species is RequestableSpecies {
  return !premium && species !== FREE_SPECIES
}

export function speciesEmoji(species: RequestableSpecies): string {
  return SPECIES_EMOJI[species]
}

/** "Maya wants the kitty 🐱", for the push and the Needs Your OK row. */
export function petRequestTitle(childName: string, species: RequestableSpecies): string {
  return `${childName} wants the ${SPECIES_NAME[species]} ${SPECIES_EMOJI[species]}`
}

export function petRequestPush(childName: string, species: RequestableSpecies): { title: string; body: string } {
  return {
    title: petRequestTitle(childName, species),
    body: `${childName} asked for a new Star Pet. Premium unlocks all six, plus outfits and a new prize every month.`,
  }
}

/** Hours before the same kid asking again sends another push. */
export const ASK_PUSH_COOLDOWN_HOURS = 24

/**
 * A push only for a fresh ask: none pending, or the pending one is older than
 * the cooldown. A kid tapping the kitty, then the owl, then the kitty again
 * updates the request without buzzing the parent three times.
 */
export function shouldPushAsk(pendingRequestedAt: string | null, now: Date): boolean {
  if (!pendingRequestedAt) return true
  const age = now.getTime() - Date.parse(pendingRequestedAt)
  return !(age >= 0 && age < ASK_PUSH_COOLDOWN_HOURS * 3_600_000)
}
