import { dueOn, type Scheduled } from '@/lib/utils/schedule'

/**
 * Streaks, the kid-facing kind.
 *
 * A day counts toward the streak when every chore DUE that day is done. A day
 * with nothing due is skipped, not broken: a weekdays-only kid keeps their
 * streak over the weekend. Today is special: if it is not finished yet it is
 * simply not counted, so a streak does not "break" at breakfast.
 *
 * Everything here is pure and works on (week_start, day_of_week) pairs, the
 * same coordinates `chore_completions` uses, so the caller supplies "today" in
 * the family's local time rather than the server guessing from UTC.
 */

export interface StreakChore extends Scheduled {
  id: string
}

export interface StreakCompletion {
  chore_id: string
  week_start: string | null
  day_of_week: number | null
}

/** One calendar day, addressed the way the schema addresses it. */
export interface DayRef {
  /** The Sunday that starts the week, YYYY-MM-DD. */
  weekStart: string
  /** 0 = Sunday .. 6 = Saturday. */
  dayOfWeek: number
}

export interface StreakSummary {
  /** Consecutive finished days ending today or yesterday. */
  current: number
  /** The longest run on record, including the current one. */
  best: number
  /** Every chore due today is done. False when nothing is due. */
  todayPerfect: boolean
  todayDue: number
  todayDone: number
}

const DAY_MS = 86_400_000

function parseUtc(ymd: string): number {
  return Date.parse(`${ymd}T00:00:00Z`)
}

function formatUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

/** Move a day reference forward (positive) or back (negative) by whole days. */
export function shiftDay(ref: DayRef, deltaDays: number): DayRef {
  const abs = parseUtc(ref.weekStart) + (ref.dayOfWeek + deltaDays) * DAY_MS
  const d = new Date(abs)
  const dayOfWeek = d.getUTCDay()
  return { weekStart: formatUtc(abs - dayOfWeek * DAY_MS), dayOfWeek }
}

export function dayKey(ref: DayRef): string {
  return `${ref.weekStart}|${ref.dayOfWeek}`
}

/** chore-ids done per day, keyed by dayKey. */
export function groupDoneByDayKey(completions: StreakCompletion[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>()
  for (const c of completions) {
    if (!c.week_start || c.day_of_week === null || c.day_of_week === undefined) continue
    const key = `${c.week_start}|${c.day_of_week}`
    let set = map.get(key)
    if (!set) {
      set = new Set()
      map.set(key, set)
    }
    set.add(c.chore_id)
  }
  return map
}

/**
 * Was this day finished? `null` means nothing was due, so the day neither
 * extends nor breaks a run.
 */
export function dayStatus(
  chores: StreakChore[],
  doneByDay: Map<string, Set<string>>,
  ref: DayRef
): boolean | null {
  const due = dueOn(chores, ref.dayOfWeek)
  if (due.length === 0) return null
  const done = doneByDay.get(dayKey(ref))
  if (!done) return false
  return due.every(c => done.has(c.id))
}

/** Hard stop for the backwards walk; nobody has a 3-year streak to display. */
const MAX_LOOKBACK_DAYS = 1000

export function computeStreaks(
  chores: StreakChore[],
  completions: StreakCompletion[],
  today: DayRef
): StreakSummary {
  const doneByDay = groupDoneByDayKey(completions)

  const todayDueList = dueOn(chores, today.dayOfWeek)
  const todayDoneSet = doneByDay.get(dayKey(today)) ?? new Set<string>()
  const todayDone = todayDueList.filter(c => todayDoneSet.has(c.id)).length
  const todayPerfect = todayDueList.length > 0 && todayDone === todayDueList.length

  // Current: walk back from today. Today only counts if finished; an
  // unfinished today is skipped rather than breaking the run.
  let current = 0
  if (chores.length > 0) {
    let ref = today
    for (let i = 0; i < MAX_LOOKBACK_DAYS; i++) {
      const status = dayStatus(chores, doneByDay, ref)
      if (status === true) current++
      else if (status === false && i > 0) break
      // status null (nothing due) or an unfinished today: keep walking
      ref = shiftDay(ref, -1)
    }
  }

  // Best: replay every day from the earliest completion to today.
  let best = current
  if (chores.length > 0 && doneByDay.size > 0) {
    let earliest = Infinity
    for (const c of completions) {
      if (c.week_start) earliest = Math.min(earliest, parseUtc(c.week_start))
    }
    const todayAbs = parseUtc(today.weekStart) + today.dayOfWeek * DAY_MS
    if (Number.isFinite(earliest)) {
      let run = 0
      let ref: DayRef = { weekStart: formatUtc(earliest), dayOfWeek: 0 }
      let abs = earliest
      while (abs <= todayAbs) {
        const status = dayStatus(chores, doneByDay, ref)
        if (status === true) {
          run++
          if (run > best) best = run
        } else if (status === false && abs !== todayAbs) {
          run = 0
        }
        ref = shiftDay(ref, 1)
        abs += DAY_MS
      }
    }
  }

  return { current, best, todayPerfect, todayDue: todayDueList.length, todayDone }
}
