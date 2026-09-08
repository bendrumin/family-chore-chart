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
 *
 * Vacation mode (migration 019) rides on the same rule: a family-wide pause
 * window during which NOTHING is due. Because every streak / perfect-day /
 * weekly-rate derivation already skips days with nothing due, vacation mode is
 * simply "isDueOn returns false inside the window" — nothing is deleted, and
 * it ends by itself when the window ends. The vacation parameters below are
 * optional everywhere, so callers that predate the feature behave the same.
 */

import { formatLocalDate, parseLocalDate } from '@/lib/utils/date-helpers'

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

/** A family-wide pause window. Date-only (YYYY-MM-DD), inclusive both ends. */
export interface VacationWindow {
  starts_on: string
  ends_on: string
}

/**
 * The slice of family_settings vacation mode reads. The columns come from
 * migration 019 and are ABSENT pre-migration (and from the generated types),
 * which is why they are optional here and read loosely: a `select('*')` row
 * from an unmigrated database simply yields undefined for both.
 */
export interface VacationSettings {
  vacation_starts_on?: string | null
  vacation_ends_on?: string | null
}

const YMD = /^\d{4}-\d{2}-\d{2}$/

/**
 * The live window from a family_settings row, or null when there is none.
 * Tolerates missing columns (pre-migration), half-set pairs, malformed values,
 * and inverted ranges — all of those mean "no vacation". Takes any object so a
 * generated-types settings Row (which does not know the 019 columns) can be
 * passed straight in; the fields are validated here, not by the type.
 */
export function vacationWindowFromSettings(
  settings: VacationSettings | object | null | undefined
): VacationWindow | null {
  const s = settings as VacationSettings | null | undefined
  const starts = s?.vacation_starts_on
  const ends = s?.vacation_ends_on
  if (!starts || !ends || !YMD.test(starts) || !YMD.test(ends)) return null
  if (ends < starts) return null
  return { starts_on: starts, ends_on: ends }
}

/**
 * Is this calendar date inside any vacation window? Date-only comparison in
 * the user's LOCAL calendar (see lib/utils/date-helpers.ts for why), inclusive
 * on both ends: the starts_on and ends_on days are both off.
 */
export function isOnVacation(
  date: Date,
  windows: readonly VacationWindow[] | null | undefined
): boolean {
  if (!windows || windows.length === 0) return false
  const ymd = formatLocalDate(date)
  return windows.some(w => w.starts_on <= ymd && ymd <= w.ends_on)
}

/**
 * The day indexes (0=Sunday .. 6=Saturday, the storage convention) of ONE week
 * that fall inside a vacation window. This is how a date-based window reaches
 * the day-of-week world the completion grid lives in: compute it once for the
 * week being rendered, then pass it to the due helpers below.
 */
export function vacationDaysOfWeek(
  weekStart: string,
  windows: readonly VacationWindow[] | null | undefined
): Set<number> {
  const days = new Set<number>()
  if (!windows || windows.length === 0 || !YMD.test(weekStart)) return days
  const date = parseLocalDate(weekStart)
  for (let i = 0; i < 7; i++) {
    if (isOnVacation(date, windows)) days.add(date.getDay())
    date.setDate(date.getDate() + 1)
  }
  return days
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

/**
 * Is this chore due on this day of the week? `vacationDays` (from
 * vacationDaysOfWeek, for the week under consideration) turns due days off:
 * during a vacation nothing is due, so every derivation downstream — streaks,
 * perfect days, weekly rates, catch-up backfills — skips the day the same way
 * it skips a day with nothing scheduled.
 */
export function isDueOn(
  chore: Scheduled,
  dayOfWeek: number,
  vacationDays?: ReadonlySet<number> | null
): boolean {
  if (vacationDays?.has(dayOfWeek)) return false
  return scheduleDays(chore).includes(dayOfWeek)
}

/** The chores from `chores` that are due on `dayOfWeek`. */
export function dueOn<T extends Scheduled>(
  chores: readonly T[],
  dayOfWeek: number,
  vacationDays?: ReadonlySet<number> | null
): T[] {
  return chores.filter(c => isDueOn(c, dayOfWeek, vacationDays))
}

/** The chores due today, in the browser's local time. Empty on vacation. */
export function dueToday<T extends Scheduled>(
  chores: readonly T[],
  now: Date = new Date(),
  vacations?: readonly VacationWindow[] | null
): T[] {
  if (isOnVacation(now, vacations)) return []
  return dueOn(chores, now.getDay())
}

/**
 * How many chore-completions a week could hold: each chore counted once per
 * day it is due. The denominator for completion rates. Vacation days hold no
 * slots.
 */
export function weeklySlots(
  chores: readonly Scheduled[],
  vacationDays?: ReadonlySet<number> | null
): number {
  return chores.reduce(
    (n, c) => n + scheduleDays(c).filter(d => !vacationDays?.has(d)).length,
    0
  )
}

/**
 * The share of ONE week's due grid cells that are filled, as a whole percent,
 * 0..100 by construction. The denominator is weeklySlots(chores); the
 * numerator counts DISTINCT (chore, due day) cells with a completion row, so
 * duplicate rows can't double-count, an off-schedule tick doesn't inflate the
 * rate, and rows from chores not in `chores` (deleted or inactive) are
 * ignored. Callers must pass completions already scoped to the one week being
 * rated and already filtered to approved ticks. 0 when nothing is due.
 *
 * This exists because the Insights tab once divided a child's ALL-TIME
 * completion count by one week's slots, proudly reporting 518%.
 */
export function weekCompletionRate(
  chores: readonly ScheduledChore[],
  completions: readonly CompletionCell[],
  vacationDays?: ReadonlySet<number> | null
): number {
  const totalSlots = weeklySlots(chores, vacationDays)
  if (totalSlots === 0) return 0

  const byId = new Map(chores.map(c => [c.id, c]))
  const filled = new Set<string>()
  for (const c of completions) {
    if (c.day_of_week === null || c.day_of_week === undefined) continue
    const chore = byId.get(c.chore_id)
    if (!chore || !isDueOn(chore, c.day_of_week, vacationDays)) continue
    filled.add(`${c.chore_id}|${c.day_of_week}`)
  }
  return Math.round((filled.size / totalSlots) * 100)
}

/** How many days this week have at least one chore due. 0..7. */
export function dueDaysInWeek(
  chores: readonly Scheduled[],
  vacationDays?: ReadonlySet<number> | null
): number {
  let n = 0
  for (const day of ALL_DAYS) {
    if (chores.some(c => isDueOn(c, day, vacationDays))) n++
  }
  return n
}

function sameSet(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((d, i) => d === b[i])
}

/** A chore that can be matched against completion rows. */
export interface ScheduledChore extends Scheduled {
  id: string
}

/** The slice of a completion row this module needs to mark a cell as filled. */
export interface CompletionCell {
  chore_id: string
  day_of_week: number | null
}

/** One unfilled grid cell: this chore, on this day, has no completion row yet. */
export interface MissingDueCell {
  choreId: string
  dayOfWeek: number
}

/**
 * The week-grid cells that are DUE but not yet filled, through `throughDay`
 * inclusive (0=Sunday .. 6=Saturday, the storage convention above): the input
 * to "mark the week so far done".
 *
 * A cell is due when the chore's schedule includes that day, and filled when
 * ANY completion row exists for it — a 'pending' tick counts as filled here,
 * because it is a row the parent should approve, not duplicate. Callers must
 * pass completions already scoped to the one week being filled.
 *
 * Cells come back day-by-day, in chore order within each day, so the result is
 * deterministic. A `throughDay` below 0 yields nothing; above 6 is clamped.
 */
export function missingDueCells(
  chores: readonly ScheduledChore[],
  completions: readonly CompletionCell[],
  throughDay: number,
  vacationDays?: ReadonlySet<number> | null
): MissingDueCell[] {
  const filled = new Set<string>()
  for (const c of completions) {
    if (c.day_of_week === null || c.day_of_week === undefined) continue
    filled.add(`${c.chore_id}|${c.day_of_week}`)
  }

  const cells: MissingDueCell[] = []
  const last = Math.min(throughDay, 6)
  for (let day = 0; day <= last; day++) {
    for (const chore of dueOn(chores, day, vacationDays)) {
      if (!filled.has(`${chore.id}|${day}`)) {
        cells.push({ choreId: chore.id, dayOfWeek: day })
      }
    }
  }
  return cells
}

/**
 * The seven day indexes (0=Sunday .. 6=Saturday, the storage convention above)
 * in the order the locale DISPLAYS a week: en-US starts on Sunday, en-GB on
 * Monday, ar-EG on Saturday. Presentation only — an index keeps its stored
 * meaning everywhere, only the iteration order changes.
 *
 * Reads Intl.Locale weekInfo (firstDay: 1=Monday .. 7=Sunday), via either the
 * `weekInfo` property or the `getWeekInfo()` method depending on the engine,
 * and falls back to Sunday-first when it is unavailable (SSR, older engines)
 * or the locale is unknown. With no argument it uses `navigator.language`,
 * which on the server does not exist, so a server render is always the
 * deterministic Sunday-first fallback.
 */
export function weekDisplayOrder(locale?: string): number[] {
  let firstDay = 7 // Intl's 7 = Sunday: the fallback
  try {
    const tag = locale ?? (typeof navigator !== 'undefined' ? navigator.language : undefined)
    if (tag) {
      const loc = new Intl.Locale(tag) as Intl.Locale & {
        weekInfo?: { firstDay?: number }
        getWeekInfo?: () => { firstDay?: number }
      }
      const info = loc.weekInfo ?? loc.getWeekInfo?.()
      const day = info?.firstDay
      if (typeof day === 'number' && Number.isInteger(day) && day >= 1 && day <= 7) {
        firstDay = day
      }
    }
  } catch {
    // Bad tag or no Intl.Locale: keep the Sunday-first fallback.
  }
  const start = firstDay % 7 // maps Intl's 7 (Sunday) to storage index 0
  return ALL_DAYS.map((_, i) => (start + i) % 7)
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
