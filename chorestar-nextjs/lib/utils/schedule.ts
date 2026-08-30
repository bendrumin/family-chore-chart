/**
 * Chore scheduling: which days of the week a chore is due.
 *
 * `chores.days_of_week` is a set of 0..6 (Sunday = 0 .. Saturday = 6), the
 * same convention as `chore_completions.day_of_week` and `Date.getDay()`.
 * Every surface that decides "is this chore part of today's list" (the day
 * checklist, kid mode, earnings, the perfect day, the push that fires when the
 * list is finished) must go through here so they all agree.
 *
 * A missing, null, or empty schedule is treated as every day: that is what
 * every chore was before the column existed, and it keeps code that predates
 * the migration behaving the same way.
 */

export const ALL_DAYS: readonly number[] = [0, 1, 2, 3, 4, 5, 6]
export const WEEKDAYS: readonly number[] = [1, 2, 3, 4, 5]
export const WEEKENDS: readonly number[] = [0, 6]

export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
export const DAY_LONG = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
] as const

/** Anything with an optional schedule. Chore rows satisfy this. */
export interface Scheduled {
  days_of_week?: number[] | null
}

/** Sorted, de-duplicated, in range. Empty input stays empty. */
export function normalizeDays(days: readonly number[] | null | undefined): number[] {
  if (!days) return []
  const set = new Set<number>()
  for (const d of days) {
    if (Number.isInteger(d) && d >= 0 && d <= 6) set.add(d)
  }
  return [...set].sort((a, b) => a - b)
}

/** The days a chore is due, with the every-day fallback applied. */
export function scheduleDays(chore: Scheduled): number[] {
  const days = normalizeDays(chore.days_of_week)
  return days.length === 0 ? [...ALL_DAYS] : days
}

export function isEveryDay(days: readonly number[] | null | undefined): boolean {
  return normalizeDays(days).length === 7 || normalizeDays(days).length === 0
}

export function isDueOn(chore: Scheduled, dayOfWeek: number): boolean {
  return scheduleDays(chore).includes(dayOfWeek)
}

/** The chores from `chores` that are due on `dayOfWeek`. */
export function dueOn<T extends Scheduled>(chores: readonly T[], dayOfWeek: number): T[] {
  return chores.filter(c => isDueOn(c, dayOfWeek))
}

/** The chores due today, in the browser's local time. */
export function dueToday<T extends Scheduled>(chores: readonly T[], now: Date = new Date()): T[] {
  return dueOn(chores, now.getDay())
}

/**
 * How many chore-completions a week could hold: each chore counted once per
 * day it is due. The denominator for completion rates.
 */
export function weeklySlots(chores: readonly Scheduled[]): number {
  return chores.reduce((n, c) => n + scheduleDays(c).length, 0)
}

/** How many days this week have at least one chore due. 0..7. */
export function dueDaysInWeek(chores: readonly Scheduled[]): number {
  let n = 0
  for (const day of ALL_DAYS) {
    if (chores.some(c => isDueOn(c, day))) n++
  }
  return n
}

function sameSet(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((d, i) => d === b[i])
}

/**
 * Human label for a schedule: "Every day", "Weekdays", "Weekends",
 * "Mon, Wed, Fri", or "Tuesdays" for a single day.
 */
export function formatSchedule(days: readonly number[] | null | undefined): string {
  const d = normalizeDays(days)
  if (d.length === 0 || d.length === 7) return 'Every day'
  if (sameSet(d, WEEKDAYS)) return 'Weekdays'
  if (sameSet(d, WEEKENDS)) return 'Weekends'
  if (d.length === 1) return `${DAY_LONG[d[0]]}s`
  return d.map(i => DAY_SHORT[i]).join(', ')
}
