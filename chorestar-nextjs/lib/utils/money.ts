/**
 * Kid money management (Premium, migration 030): the pure math.
 *
 * Nothing in here touches the database, so money.test.ts covers all of it and
 * the client can import the constants. lib/utils/wallet.ts loads the rows and
 * calls these; /api/cron/allowance uses the weekly helpers.
 *
 * Dates are family-local calendar dates as 'YYYY-MM-DD' strings. Weekday math
 * parses them as UTC midnight so the server's own timezone never leaks in.
 */

import { scheduleDays, type Scheduled, type VacationWindow } from '@/lib/utils/schedule'

// ---------------------------------------------------------------------------
// Jars
// ---------------------------------------------------------------------------

export type Jar = 'spend' | 'save' | 'give'
export const JARS: readonly Jar[] = ['spend', 'save', 'give']

/** Whole percents, summing to 100. */
export interface JarSplit {
  spend: number
  save: number
  give: number
}

/** Jars off: everything is one balance, which lives in Spend. */
export const NO_SPLIT: JarSplit = { spend: 100, save: 0, give: 0 }

export const SPLIT_PRESETS: readonly JarSplit[] = [
  { spend: 70, save: 20, give: 10 },
  { spend: 50, save: 40, give: 10 },
  { spend: 80, save: 10, give: 10 },
  { spend: 40, save: 40, give: 20 },
]

export const DEFAULT_SPLIT: JarSplit = SPLIT_PRESETS[0]

export function isValidSplit(s: JarSplit): boolean {
  const parts = [s.spend, s.save, s.give]
  return parts.every((p) => Number.isInteger(p) && p >= 0 && p <= 100) && s.spend + s.save + s.give === 100
}

/** One row of money_jar_splits. */
export interface SplitVersion {
  /** Family-local date the split starts applying to income. */
  effectiveOn: string
  enabled: boolean
  spend: number
  save: number
  give: number
  /** Tie-break for two versions on the same day: the later one wins. */
  createdAt?: string
}

function orderVersions(versions: readonly SplitVersion[]): SplitVersion[] {
  return [...versions].sort((a, b) =>
    a.effectiveOn === b.effectiveOn
      ? (a.createdAt ?? '').localeCompare(b.createdAt ?? '')
      : a.effectiveOn.localeCompare(b.effectiveOn)
  )
}

/** The version in force on `date`, or null before the first one. */
export function versionOn(versions: readonly SplitVersion[], date: string): SplitVersion | null {
  let found: SplitVersion | null = null
  for (const v of orderVersions(versions)) {
    if (v.effectiveOn <= date) found = v
    else break
  }
  return found
}

/** The split that applies to income earned on `date`. */
export function splitOn(versions: readonly SplitVersion[], date: string): JarSplit {
  const v = versionOn(versions, date)
  if (!v || !v.enabled) return NO_SPLIT
  return { spend: v.spend, save: v.save, give: v.give }
}

/** The latest version (what the parent has set now), or null if never set. */
export function currentVersion(versions: readonly SplitVersion[]): SplitVersion | null {
  const ordered = orderVersions(versions)
  return ordered[ordered.length - 1] ?? null
}

export interface JarAmounts {
  spend: number
  save: number
  give: number
}

/**
 * Split an amount of cents. Save and Give round toward zero and Spend takes
 * the remainder, so the three always add back up to exactly `cents`.
 */
export function splitCents(cents: number, split: JarSplit): JarAmounts {
  const save = Math.trunc((cents * split.save) / 100)
  const give = Math.trunc((cents * split.give) / 100)
  return { spend: cents - save - give, save, give }
}

/** Income that the jar split applies to: a day's chore earnings, a weekly allowance. */
export interface IncomeEvent {
  date: string
  cents: number
}

/** Money already tagged with its jar: payouts (negative), fines, interest, donations. */
export interface JarEntry {
  jar: Jar
  cents: number
}

export interface JarBalances extends JarAmounts {
  total: number
}

/**
 * Jar balances, derived. Income is grouped by the split version in force on
 * its date and each group is split once (fewer rounding cents than splitting
 * every chore), so income from before jars were turned on, or while they were
 * off, lands entirely in Spend. Adding a late-ticked chore only changes its
 * own version's group, never money split under another version.
 */
export function computeJars(
  income: readonly IncomeEvent[],
  entries: readonly JarEntry[],
  versions: readonly SplitVersion[]
): JarBalances {
  const ordered = orderVersions(versions)
  const groups = new Map<number, number>()
  for (const e of income) {
    if (!e.cents) continue
    let idx = -1
    for (let i = 0; i < ordered.length; i++) {
      if (ordered[i].effectiveOn <= e.date) idx = i
      else break
    }
    groups.set(idx, (groups.get(idx) ?? 0) + e.cents)
  }

  const out: JarBalances = { spend: 0, save: 0, give: 0, total: 0 }
  for (const [idx, cents] of groups) {
    const v = idx >= 0 ? ordered[idx] : null
    const split = v && v.enabled ? { spend: v.spend, save: v.save, give: v.give } : NO_SPLIT
    const parts = splitCents(cents, split)
    out.spend += parts.spend
    out.save += parts.save
    out.give += parts.give
  }
  for (const e of entries) out[e.jar] += e.cents
  out.total = out.spend + out.save + out.give
  return out
}

// ---------------------------------------------------------------------------
// Calendar helpers (family-local dates)
// ---------------------------------------------------------------------------

const YMD = /^\d{4}-\d{2}-\d{2}$/

export function isYmd(s: unknown): s is string {
  return typeof s === 'string' && YMD.test(s)
}

/** The calendar date it is now in `timeZone`, as YYYY-MM-DD. */
export function localDateIn(now: Date, timeZone?: string | null): string {
  try {
    return now.toLocaleDateString('en-CA', { timeZone: timeZone || 'UTC' })
  } catch {
    return now.toLocaleDateString('en-CA', { timeZone: 'UTC' })
  }
}

export function addDaysYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** 0 = Sunday .. 6 = Saturday. */
export function weekdayOf(ymd: string): number {
  return new Date(`${ymd}T00:00:00Z`).getUTCDay()
}

/** The Sunday starting the week that contains `ymd` (chore_completions.week_start). */
export function weekStartOf(ymd: string): string {
  return addDaysYmd(ymd, -weekdayOf(ymd))
}

// ---------------------------------------------------------------------------
// Payday
// ---------------------------------------------------------------------------

/**
 * A daily cron that missed a day (an outage, a deploy) still pays, up to this
 * many days late. Idempotency is per week, so catching up never pays twice.
 */
export const PAYDAY_CATCH_UP_DAYS = 2

/**
 * The payday to settle today, or null. Today if it is payday, or a payday up
 * to PAYDAY_CATCH_UP_DAYS ago that hasn't been settled yet (the caller checks
 * the ledger). Never a payday before `startedOn`: switching allowance on on a
 * Monday doesn't pay the Saturday that already went by.
 */
export function paydayToSettle(today: string, paydayWeekday: number, startedOn?: string | null): string | null {
  const back = (weekdayOf(today) - paydayWeekday + 7) % 7
  if (back > PAYDAY_CATCH_UP_DAYS) return null
  const payday = addDaysYmd(today, -back)
  if (startedOn && payday < startedOn) return null
  return payday
}

/** The first payday on or after `date`: what the parent sees as "next payday". */
export function nextPayday(date: string, paydayWeekday: number): string {
  return addDaysYmd(date, (paydayWeekday - weekdayOf(date) + 7) % 7)
}

// ---------------------------------------------------------------------------
// Allowance threshold
// ---------------------------------------------------------------------------

export interface RateChore extends Scheduled {
  id: string
}

export interface RateCompletion {
  chore_id: string
  week_start: string | null
  day_of_week: number | null
  status?: string | null
}

export interface CompletionRate {
  due: number
  done: number
  /** Whole percent, or null when nothing was due (a vacation week). */
  percent: number | null
}

/**
 * The share of chores due from `from` to `to` (inclusive) that were done and
 * approved. Distinct (chore, day) cells, so duplicate rows can't inflate it,
 * and off-schedule ticks don't count. Vacation days hold nothing due.
 */
export function completionRate(
  chores: readonly RateChore[],
  completions: readonly RateCompletion[],
  from: string,
  to: string,
  vacations?: readonly VacationWindow[] | null
): CompletionRate {
  const filled = new Set<string>()
  for (const c of completions) {
    if (c.status && c.status !== 'approved') continue
    if (!c.week_start || c.day_of_week == null) continue
    filled.add(`${c.chore_id}|${c.week_start}|${c.day_of_week}`)
  }
  let due = 0
  let done = 0
  for (let d = from; d <= to; d = addDaysYmd(d, 1)) {
    if (vacations?.some((w) => w.starts_on <= d && d <= w.ends_on)) continue
    const dow = weekdayOf(d)
    const ws = weekStartOf(d)
    for (const chore of chores) {
      if (!scheduleDays(chore).includes(dow)) continue
      due++
      if (filled.has(`${chore.id}|${ws}|${dow}`)) done++
    }
  }
  return { due, done, percent: due === 0 ? null : Math.floor((done * 100) / due) }
}

export interface AllowanceDecision {
  /** What to pay; 0 when the threshold was missed. */
  cents: number
  paid: boolean
  /** Kid-readable reason, stored as the ledger note. */
  note: string
}

/**
 * Weekly allowance for one payday. Without a threshold it always pays. With
 * one, it pays when the 7 days before payday hit it; a week with nothing due
 * (vacation) counts as met, since a vacation shouldn't cost allowance.
 */
export function allowanceDecision(amountCents: number, thresholdPct: number | null | undefined, rate: CompletionRate): AllowanceDecision {
  if (!thresholdPct || rate.percent === null || rate.percent >= thresholdPct) {
    return {
      cents: amountCents,
      paid: true,
      note: thresholdPct && rate.percent !== null ? `Weekly allowance (${rate.percent}% of chores done)` : 'Weekly allowance',
    }
  }
  return {
    cents: 0,
    paid: false,
    note: `Allowance skipped: ${rate.percent}% of chores done, needs ${thresholdPct}%`,
  }
}

// ---------------------------------------------------------------------------
// Interest
// ---------------------------------------------------------------------------

/** 10% a week is already absurd; it is a teaching tool, not a bank. */
export const INTEREST_MAX_BPS = 1000
/** And never more than this in one week, however big Save gets. */
export const INTEREST_MAX_CENTS_PER_WEEK = 500

/** Weekly interest on a Save balance, rounded down, capped. Nothing on 0 or less. */
export function weeklyInterestCents(saveCents: number, bps: number): number {
  if (saveCents <= 0 || bps <= 0) return 0
  const rate = Math.min(bps, INTEREST_MAX_BPS)
  return Math.min(Math.floor((saveCents * rate) / 10_000), INTEREST_MAX_CENTS_PER_WEEK)
}

/** "2%" or "2.5%" from basis points. */
export function formatRate(bps: number): string {
  return `${Number((bps / 100).toFixed(2))}%`
}

// ---------------------------------------------------------------------------
// Fines and paying a parent back
// ---------------------------------------------------------------------------

export const DEDUCTION_MAX_CENTS = 100_000

/**
 * How much of a deduction to take from Spend. Never more than Spend holds
 * unless the parent explicitly allowed going below zero.
 */
export function deductionCents(requestedCents: number, spendCents: number, allowNegative: boolean): number {
  if (requestedCents <= 0) return 0
  if (allowNegative) return requestedCents
  return Math.min(requestedCents, Math.max(0, spendCents))
}

// ---------------------------------------------------------------------------
// Screen-time minutes
// ---------------------------------------------------------------------------

export const MINUTES_MAX_PER_REWARD = 600
export const MINUTES_USE_PRESETS = [15, 30, 60] as const

export interface MinutesCompletion {
  chore_id: string
  week_start: string | null
  day_of_week: number | null
  status?: string | null
}

/**
 * Minutes earned from chores: each approved (chore, day) earns that chore's
 * minutes once, so duplicate rows can't double it. Routines bring their own
 * captured minutes (routine_completions.minutes_earned).
 */
export function earnedChoreMinutes(
  minutesByChore: ReadonlyMap<string, number>,
  completions: readonly MinutesCompletion[]
): number {
  const seen = new Set<string>()
  let total = 0
  for (const c of completions) {
    if (c.status && c.status !== 'approved') continue
    const minutes = minutesByChore.get(c.chore_id) ?? 0
    if (minutes <= 0) continue
    const key = `${c.chore_id}|${c.week_start}|${c.day_of_week}`
    if (seen.has(key)) continue
    seen.add(key)
    total += minutes
  }
  return total
}

/** "1 h 30 min", "45 min". */
export function formatMinutes(minutes: number): string {
  const sign = minutes < 0 ? '-' : ''
  const m = Math.abs(Math.round(minutes))
  if (m < 60) return `${sign}${m} min`
  const h = Math.floor(m / 60)
  const rest = m % 60
  return rest ? `${sign}${h} h ${rest} min` : `${sign}${h} h`
}

// ---------------------------------------------------------------------------
// Premium entry points (paywall sources: `gate_${feature}`)
// ---------------------------------------------------------------------------

export type MoneyFeature = 'jars' | 'allowance' | 'interest' | 'fines' | 'minutes'
