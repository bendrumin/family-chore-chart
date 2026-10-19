/**
 * Star Pets (migration 034): how the pet feels right now.
 *
 * Gentle by design. The pet is never sad, sick, angry or dying, and nothing
 * is ever taken away. Not having done things yet makes it HUNGRY (daytime:
 * a chore or routine is a snack) or SLEEPY (late evening and early morning),
 * both of which read as cosy, not as blame. Doing things makes it PLAYFUL,
 * finishing today makes it HAPPY, and a day with nothing to do is RELAXED.
 *
 * Inputs are today's numbers in the family's timezone; the server computes
 * them from the same rows the kid's chore list and routine cards show.
 */

export const PET_MOODS = ['happy', 'playful', 'hungry', 'sleepy', 'relaxed'] as const
export type PetMood = (typeof PET_MOODS)[number]

export interface PetMoodInputs {
  /** Chores due today (vacation days count zero). */
  choresDue: number
  /** Of those, approved or waiting for a parent: the kid did their part. */
  choresDone: number
  /** Active routines the kid has. */
  routinesActive: number
  /** Distinct routines finished today. */
  routinesDoneToday: number
  /** 0..23, family-local. */
  hour: number
}

/** Evening from 19:00, and early morning before 06:00, is sleepy time. */
export function isSleepyHour(hour: number): boolean {
  return hour >= 19 || hour < 6
}

export function petMood(i: PetMoodInputs): PetMood {
  const due = Math.max(0, i.choresDue)
  const done = Math.min(Math.max(0, i.choresDone), due)
  const routines = Math.max(0, i.routinesActive)
  const routinesDone = Math.max(0, i.routinesDoneToday)

  if (due === 0 && routines === 0) return 'relaxed'

  const choresFinished = due === 0 || done >= due
  // One routine is enough to count the routine part of the day as done:
  // morning and bedtime aren't both possible at lunchtime.
  const routinesFinished = routines === 0 || routinesDone > 0
  if (choresFinished && routinesFinished) return 'happy'

  if (done + routinesDone > 0) return 'playful'
  return isSleepyHour(i.hour) ? 'sleepy' : 'hungry'
}

/** The family-local hour (0..23). Falls back to UTC for an unknown zone. */
export function hourIn(timeZone: string | null | undefined, now: Date = new Date()): number {
  const read = (zone: string) => {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, hour: 'numeric', hourCycle: 'h23' }).formatToParts(now)
    const h = Number(parts.find(p => p.type === 'hour')?.value)
    return Number.isFinite(h) ? h % 24 : now.getUTCHours()
  }
  try {
    return read(timeZone || 'UTC')
  } catch {
    return read('UTC')
  }
}
