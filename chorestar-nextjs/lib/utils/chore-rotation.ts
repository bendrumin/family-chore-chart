/**
 * Shared chores (Premium, migration 025): one chores row per kid tied by
 * rotation_group_id. 'rotate' keeps one copy active, whoever's turn it is
 * this week; 'grab' keeps every copy active and the first tick of the day
 * wins. Pure date math here so chore-rotation.test.ts covers it.
 *
 * Weeks are Sunday-keyed, like chore_completions.week_start.
 */

export type RotationMode = 'rotate' | 'grab'

const DAY = 86_400_000
/** 1970-01-04 was a Sunday: week 0. */
const EPOCH_SUNDAY = Date.UTC(1970, 0, 4)

/** The Sunday (YYYY-MM-DD) starting the week that contains `now` in `timeZone`. */
export function sundayOf(now: Date, timeZone = 'UTC'): string {
  const local = now.toLocaleDateString('en-CA', { timeZone }) // YYYY-MM-DD
  const d = new Date(`${local}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - d.getUTCDay())
  return d.toISOString().slice(0, 10)
}

/** Weeks since 1970-01-04 for a Sunday (YYYY-MM-DD). */
export function weekNumber(sunday: string): number {
  return Math.round((Date.parse(`${sunday}T00:00:00Z`) - EPOCH_SUNDAY) / (7 * DAY))
}

/**
 * Whose turn it is: the position (0-based, in rotation_order) of the member
 * active in `thisSunday`, for a group that started with member 0 in `startSunday`.
 */
export function turnIndex(memberCount: number, startSunday: string, thisSunday: string): number {
  if (memberCount <= 0) return 0
  const elapsed = weekNumber(thisSunday) - weekNumber(startSunday)
  return ((elapsed % memberCount) + memberCount) % memberCount
}

export interface RotationMember {
  id: string
  rotation_order: number | null
  is_active: boolean
}

/** The members whose is_active must flip so exactly the current turn is active. */
export function rotationChanges(
  members: RotationMember[],
  startSunday: string,
  thisSunday: string
): { id: string; is_active: boolean }[] {
  const ordered = [...members].sort((a, b) => (a.rotation_order ?? 0) - (b.rotation_order ?? 0))
  const turn = turnIndex(ordered.length, startSunday, thisSunday)
  return ordered
    .map((m, i) => ({ id: m.id, is_active: i === turn, was: m.is_active }))
    .filter((m) => m.is_active !== m.was)
    .map(({ id, is_active }) => ({ id, is_active }))
}
