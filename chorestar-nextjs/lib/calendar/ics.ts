/**
 * The family calendar feed (Premium, migration 033) as iCalendar text.
 *
 * Pure: no database, no clock (callers pass `now`), no dependency. The route
 * at app/api/calendar/[token]/route.ts loads the family and hands the rows in;
 * lib/calendar/ics.test.ts checks the output against RFC 5545 line by line.
 *
 * What the feed holds:
 *   - one recurring event per active chore, all-day on the chore's scheduled
 *     days (chores.days_of_week, read through lib/utils/schedule.ts so the
 *     calendar agrees with the dashboard), or timed if a chore carries a time;
 *   - one daily timed event per active routine, at a sensible default for its
 *     type (7:00 morning, 15:30 after school, 19:30 bedtime, 17:00 custom),
 *     lasting as long as its step timers add up to;
 *   - vacation days (the live family_settings window and vacation_periods
 *     history) taken out with EXDATE, so nothing shows as due on a trip.
 *
 * Times: when the family has a real IANA timezone the timed events carry
 * TZID plus a VTIMEZONE generated from Intl, so a 7:00 routine stays at 7:00
 * across DST. Most families never set one (the column defaults to UTC), and a
 * 7:00 UTC routine would land at 3am in New York, so UTC or no zone means
 * FLOATING local times (RFC 5545 3.3.5 form 1): 7:00 wherever the viewer is.
 *
 * Every event is TRANSP:TRANSPARENT: a kid's chores never block a parent's
 * free/busy time.
 */

import { formatMoney } from '@/lib/constants/currencies'
import { formatSchedule, scheduleDays, type VacationWindow } from '@/lib/utils/schedule'

export const CRLF = '\r\n'
/** RFC 5545 3.1: lines SHOULD NOT be longer than 75 octets, excluding the CRLF. */
export const MAX_LINE_OCTETS = 75
export const UID_DOMAIN = 'chorestar.app'
export const PRODID = '-//ChoreStar//Family Calendar Feed 1.0//EN'

const DAY_MS = 86_400_000
const ICS_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const
/** At most this many EXDATE values per event; vacations are rarely long. */
const MAX_EXDATES = 400

// ---------------------------------------------------------------------------
// Text: escaping and folding
// ---------------------------------------------------------------------------

/**
 * Escape a TEXT value (RFC 5545 3.3.11): backslash, semicolon and comma get a
 * backslash, newlines become the two characters `\n`. Other control
 * characters are not allowed in TEXT and are dropped (tab is kept).
 */
export function escapeText(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

function utf8Length(codePoint: number): number {
  if (codePoint < 0x80) return 1
  if (codePoint < 0x800) return 2
  if (codePoint < 0x10000) return 3
  return 4
}

/** Octets a string takes in UTF-8. */
export function octetLength(value: string): number {
  let n = 0
  for (const ch of value) n += utf8Length(ch.codePointAt(0)!)
  return n
}

/**
 * Fold a content line (RFC 5545 3.1): no physical line longer than 75 octets,
 * continuation lines start with one space (which counts toward the 75), and a
 * multi-octet UTF-8 character is never split. Returns the physical lines
 * joined with CRLF, without a trailing CRLF.
 */
export function foldLine(line: string): string {
  let out = ''
  let current = ''
  let octets = 0
  let limit = MAX_LINE_OCTETS
  for (const ch of line) {
    const n = utf8Length(ch.codePointAt(0)!)
    if (octets + n > limit) {
      out += current + CRLF + ' '
      current = ''
      octets = 0
      limit = MAX_LINE_OCTETS - 1 // the leading space is one of the 75
    }
    current += ch
    octets += n
  }
  return out + current
}

/** One property as a content line: NAME[;PARAM=VALUE...]:value (value already formatted). */
export function contentLine(name: string, value: string, params?: Record<string, string>): string {
  let head = name
  if (params) {
    for (const [k, v] of Object.entries(params)) head += `;${k}=${paramValue(v)}`
  }
  return `${head}:${value}`
}

/** A parameter value, DQUOTE-wrapped when it holds `:`, `;` or `,` (3.2). DQUOTE itself is not allowed. */
function paramValue(v: string): string {
  const clean = v.replace(/"/g, '')
  return /[:;,]/.test(clean) ? `"${clean}"` : clean
}

/** Join content lines into a stream: each folded, each ending in CRLF. */
export function serialize(lines: readonly string[]): string {
  return lines.map(l => foldLine(l) + CRLF).join('')
}

// ---------------------------------------------------------------------------
// Dates. A "civil date" is YYYY-MM-DD with no zone; math on it uses UTC
// fields so the machine's own timezone never leaks in.
// ---------------------------------------------------------------------------

const YMD = /^\d{4}-\d{2}-\d{2}$/
const HM = /^([01]\d|2[0-3]):([0-5]\d)$/

function pad(n: number, width = 2): string {
  return String(n).padStart(width, '0')
}

function civilToMs(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

function msToCivil(ms: number): string {
  const d = new Date(ms)
  return `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

export function addDays(ymd: string, days: number): string {
  return msToCivil(civilToMs(ymd) + days * DAY_MS)
}

/** 0=Sunday .. 6=Saturday, the chores.days_of_week convention. */
export function weekdayOf(ymd: string): number {
  return new Date(civilToMs(ymd)).getUTCDay()
}

/** YYYYMMDD (DATE value). */
export function icsDate(ymd: string): string {
  return ymd.replace(/-/g, '')
}

/** YYYYMMDDTHHMMSS (local or floating DATE-TIME, no Z). */
export function icsLocalDateTime(ymd: string, hm: string): string {
  return `${icsDate(ymd)}T${hm.replace(':', '')}00`
}

/** YYYYMMDDTHHMMSSZ (UTC DATE-TIME). */
export function icsUtc(date: Date): string {
  return (
    `${pad(date.getUTCFullYear(), 4)}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  )
}

export function isValidTimeZone(tz: string | null | undefined): tz is string {
  if (!tz) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

const UTC_ALIASES = new Set(['utc', 'etc/utc', 'gmt', 'etc/gmt', 'uct', 'etc/uct', 'universal', 'etc/universal', 'zulu', 'etc/zulu', 'gmt0', 'etc/gmt0', 'etc/gmt+0', 'etc/gmt-0', 'greenwich', 'etc/greenwich'])

/**
 * The zone the feed's timed events use: the first of `candidates` that is a
 * real IANA zone and not UTC. null means floating local times (see the module
 * comment for why UTC counts as "not set").
 */
export function resolveFeedTimeZone(...candidates: Array<string | null | undefined>): string | null {
  for (const tz of candidates) {
    if (isValidTimeZone(tz) && !UTC_ALIASES.has(tz.toLowerCase())) return tz
  }
  return null
}

const formatters = new Map<string, Intl.DateTimeFormat>()
function formatterFor(tz: string): Intl.DateTimeFormat {
  let f = formatters.get(tz)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    formatters.set(tz, f)
  }
  return f
}

function zonedParts(tz: string, ms: number): { y: number; m: number; d: number; h: number; mi: number; s: number } {
  const parts: Record<string, number> = {}
  for (const p of formatterFor(tz).formatToParts(new Date(ms))) {
    if (p.type !== 'literal') parts[p.type] = Number(p.value)
  }
  return { y: parts.year, m: parts.month, d: parts.day, h: parts.hour % 24, mi: parts.minute, s: parts.second }
}

/** UTC offset of `tz` at instant `ms`, in minutes east of UTC (New York in winter: -300). */
export function tzOffsetMinutes(tz: string, ms: number): number {
  const whole = Math.floor(ms / 1000) * 1000
  const p = zonedParts(tz, whole)
  return Math.round((Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - whole) / 60_000)
}

/** The civil date at instant `date` in `tz` (UTC when null). */
export function civilDateIn(date: Date, tz: string | null): string {
  if (!tz) return msToCivil(Math.floor(date.getTime() / DAY_MS) * DAY_MS)
  const p = zonedParts(tz, date.getTime())
  return `${pad(p.y, 4)}-${pad(p.m)}-${pad(p.d)}`
}

/** The UTC instant of a wall-clock time in `tz`. Gaps resolve forward, overlaps to the first. */
export function zonedToUtc(ymd: string, hm: string, tz: string): Date {
  const [h, mi] = hm.split(':').map(Number)
  const wall = civilToMs(ymd) + (h * 60 + mi) * 60_000
  let guess = wall - tzOffsetMinutes(tz, wall) * 60_000
  guess = wall - tzOffsetMinutes(tz, guess) * 60_000
  return new Date(guess)
}

/** ±HHMM (UTC-OFFSET value, 3.3.14). */
export function formatUtcOffset(minutes: number): string {
  const sign = minutes < 0 ? '-' : '+'
  const abs = Math.abs(minutes)
  return `${sign}${pad(Math.floor(abs / 60))}${pad(abs % 60)}`
}

export interface ZoneTransition {
  /** The instant the new offset starts, ms since epoch. */
  at: number
  from: number
  to: number
}

const transitionCache = new Map<string, ZoneTransition[]>()

/**
 * Every UTC-offset change of `tz` from Jan 1 of `fromYear` through Dec 31 of
 * `toYear`, to the minute. Steps a day at a time and bisects each change, so
 * two changes inside one day (none in the current tz database) would merge.
 */
export function zoneTransitions(tz: string, fromYear: number, toYear: number): ZoneTransition[] {
  const key = `${tz}|${fromYear}|${toYear}`
  const cached = transitionCache.get(key)
  if (cached) return cached

  const out: ZoneTransition[] = []
  const end = Date.UTC(toYear + 1, 0, 1)
  let prevMs = Date.UTC(fromYear, 0, 1)
  let prev = tzOffsetMinutes(tz, prevMs)
  for (let ms = prevMs + DAY_MS; ms <= end; ms += DAY_MS) {
    const off = tzOffsetMinutes(tz, ms)
    if (off !== prev) {
      let lo = prevMs / 60_000
      let hi = ms / 60_000
      while (hi - lo > 1) {
        const mid = Math.floor((lo + hi) / 2)
        if (tzOffsetMinutes(tz, mid * 60_000) === prev) lo = mid
        else hi = mid
      }
      out.push({ at: hi * 60_000, from: prev, to: off })
      prev = off
    }
    prevMs = ms
  }
  transitionCache.set(key, out)
  return out
}

/**
 * A VTIMEZONE (3.6.5) for `tz` covering `fromYear`..`toYear` with one
 * observance per offset change (DTSTART is the wall time before the change,
 * as the RFC asks), plus a 1970 observance carrying the offset in force at the
 * start of the range. STANDARD vs DAYLIGHT: the smallest offset in the range
 * is standard time, anything above it is daylight time.
 */
export function buildVTimezone(tz: string, fromYear: number, toYear: number): string[] {
  const transitions = zoneTransitions(tz, fromYear, toYear)
  const initial = tzOffsetMinutes(tz, Date.UTC(fromYear, 0, 1))
  const standard = Math.min(initial, ...transitions.map(t => t.to))
  const kind = (offset: number) => (offset === standard ? 'STANDARD' : 'DAYLIGHT')

  const lines = ['BEGIN:VTIMEZONE', contentLine('TZID', tz), contentLine('X-LIC-LOCATION', escapeText(tz))]
  lines.push(
    `BEGIN:${kind(initial)}`,
    'DTSTART:19700101T000000',
    contentLine('TZOFFSETFROM', formatUtcOffset(initial)),
    contentLine('TZOFFSETTO', formatUtcOffset(initial)),
    `END:${kind(initial)}`
  )
  for (const t of transitions) {
    const wallBefore = new Date(t.at + t.from * 60_000)
    lines.push(
      `BEGIN:${kind(t.to)}`,
      contentLine('DTSTART', icsUtc(wallBefore).slice(0, -1)),
      contentLine('TZOFFSETFROM', formatUtcOffset(t.from)),
      contentLine('TZOFFSETTO', formatUtcOffset(t.to)),
      `END:${kind(t.to)}`
    )
  }
  lines.push('END:VTIMEZONE')
  return lines
}

// ---------------------------------------------------------------------------
// The feed
// ---------------------------------------------------------------------------

export type RoutineType = 'morning' | 'bedtime' | 'afterschool' | 'custom'

export interface FeedChild {
  id: string
  name: string
}

export interface FeedChore {
  id: string
  childId: string
  name: string
  /** chores.icon: an emoji. A check mark when empty. */
  icon?: string | null
  rewardCents?: number | null
  /** chores.days_of_week; empty/null means every day (schedule.ts). */
  daysOfWeek?: number[] | null
  notes?: string | null
  /** Shared chores (migration 025). 'rotate' copies change hands weekly. */
  rotationMode?: 'rotate' | 'grab' | null
  /** HH:MM when the chore has a time of day; all-day otherwise. */
  time?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export interface FeedRoutineStep {
  title: string
  durationSeconds?: number | null
}

export interface FeedRoutine {
  id: string
  childId: string
  name: string
  type: RoutineType | string
  rewardCents?: number | null
  steps?: FeedRoutineStep[]
  /** HH:MM override; the type's default otherwise. */
  time?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export interface FeedInput {
  /** X-WR-CALNAME, e.g. "ChoreStar: Smith Family". */
  calendarName: string
  /** From resolveFeedTimeZone: an IANA zone, or null for floating times. */
  timeZone: string | null
  now: Date
  currencyCode?: string | null
  /** family_settings.reward_mode === 'per_chore': only then does a chore name its own reward. */
  perChoreRewards: boolean
  children: FeedChild[]
  chores: FeedChore[]
  routines: FeedRoutine[]
  vacations?: VacationWindow[]
  /** Base URL for links in descriptions, e.g. https://chorestar.app. */
  appUrl?: string
}

export const ROUTINE_DEFAULTS: Record<RoutineType, { time: string; emoji: string; label: string }> = {
  morning: { time: '07:00', emoji: '🌅', label: 'Morning routine' },
  afterschool: { time: '15:30', emoji: '🎒', label: 'After-school routine' },
  bedtime: { time: '19:30', emoji: '🌙', label: 'Bedtime routine' },
  custom: { time: '17:00', emoji: '⭐', label: 'Routine' },
}

const DEFAULT_CHORE_EMOJI = '✅'
const DEFAULT_ROUTINE_MINUTES = 20
const TIMED_CHORE_MINUTES = 15

function routineDefaults(type: string) {
  return ROUTINE_DEFAULTS[(type in ROUTINE_DEFAULTS ? type : 'custom') as RoutineType]
}

/** Minutes a routine takes: its step timers rounded up, 5..120, or 20 with no timers. */
export function routineMinutes(steps: readonly FeedRoutineStep[] | null | undefined): number {
  const seconds = (steps ?? []).reduce((n, s) => n + (s.durationSeconds && s.durationSeconds > 0 ? s.durationSeconds : 0), 0)
  if (seconds <= 0) return DEFAULT_ROUTINE_MINUTES
  return Math.min(120, Math.max(5, Math.ceil(seconds / 60)))
}

/** The event title: "🧹 Maya: Dishes ($0.50)". */
export function eventTitle(emoji: string, childName: string | null | undefined, name: string, rewardCents: number | null | undefined, currencyCode?: string | null, showReward = true): string {
  const who = childName?.trim() ? `${childName.trim()}: ` : ''
  const reward = showReward && rewardCents && rewardCents > 0 ? ` (${formatMoney(rewardCents, currencyCode)})` : ''
  return `${emoji} ${who}${name.trim()}${reward}`
}

/** BYDAY list for a set of 0..6 days, in Sunday-first order. */
export function byDay(days: readonly number[]): string {
  return [...days].sort((a, b) => a - b).map(d => ICS_DAYS[d]).join(',')
}

/** The first date on or after `from` that falls on one of `days`. */
export function firstOnOrAfter(from: string, days: readonly number[]): string {
  for (let i = 0; i < 7; i++) {
    const d = addDays(from, i)
    if (days.includes(weekdayOf(d))) return d
  }
  return from
}

/** Every vacation date on one of `days` within [from, through], sorted, capped. */
export function vacationDates(
  windows: readonly VacationWindow[] | null | undefined,
  days: readonly number[],
  from: string,
  through: string
): string[] {
  const set = new Set<string>()
  for (const w of windows ?? []) {
    if (!YMD.test(w.starts_on) || !YMD.test(w.ends_on) || w.ends_on < w.starts_on) continue
    let d = w.starts_on < from ? from : w.starts_on
    const last = w.ends_on > through ? through : w.ends_on
    while (d <= last && set.size < MAX_EXDATES) {
      if (days.includes(weekdayOf(d))) set.add(d)
      d = addDays(d, 1)
    }
  }
  return [...set].sort()
}

/**
 * Where an event's recurrence starts: the day it was created (in the feed's
 * zone), but no earlier than Jan 1 of last year, so an old chore doesn't
 * drag years of history (and VTIMEZONE observances) into every poll. The
 * floor moves once a year, so DTSTART is stable between polls.
 */
function anchorDate(createdAt: string | null | undefined, today: string, tz: string | null): string {
  const floor = `${pad(Number(today.slice(0, 4)) - 1, 4)}-01-01`
  const t = createdAt ? Date.parse(createdAt) : NaN
  if (Number.isNaN(t)) return floor
  const created = civilDateIn(new Date(t), tz)
  if (created > today) return today
  return created < floor ? floor : created
}

interface Ctx {
  tz: string | null
  today: string
  dtstamp: string
  appUrl: string
  childName: Map<string, string>
  vacations: VacationWindow[]
}

/** DTSTART/EXDATE/UNTIL formatting for one event, all-day or timed. */
function timing(ctx: Ctx, time: string | null) {
  if (!time) {
    return {
      dtstart: (d: string) => contentLine('DTSTART', icsDate(d), { VALUE: 'DATE' }),
      exdate: (ds: string[]) => contentLine('EXDATE', ds.map(icsDate).join(','), { VALUE: 'DATE' }),
      until: (d: string) => icsDate(d),
    }
  }
  const tz = ctx.tz
  if (tz) {
    return {
      dtstart: (d: string) => contentLine('DTSTART', icsLocalDateTime(d, time), { TZID: tz }),
      exdate: (ds: string[]) => contentLine('EXDATE', ds.map(d => icsLocalDateTime(d, time)).join(','), { TZID: tz }),
      // 3.3.10: with a TZID DTSTART, UNTIL MUST be UTC.
      until: (d: string) => icsUtc(zonedToUtc(d, '23:59', tz)),
    }
  }
  return {
    dtstart: (d: string) => contentLine('DTSTART', icsLocalDateTime(d, time)),
    exdate: (ds: string[]) => contentLine('EXDATE', ds.map(d => icsLocalDateTime(d, time)).join(',')),
    // Floating DTSTART: UNTIL is floating too.
    until: (d: string) => icsLocalDateTime(d, '23:59'),
  }
}

function lastModified(updatedAt: string | null | undefined): string[] {
  const t = updatedAt ? Date.parse(updatedAt) : NaN
  return Number.isNaN(t) ? [] : [contentLine('LAST-MODIFIED', icsUtc(new Date(t)))]
}

function choreEvent(ctx: Ctx, chore: FeedChore, input: FeedInput): string[] {
  const days = scheduleDays({ days_of_week: chore.daysOfWeek })
  const time = chore.time && HM.test(chore.time) ? chore.time : null
  const t = timing(ctx, time)

  // A rotating chore's copy belongs to this kid for THIS week only; next
  // week the cron hands it on and the next poll shows the new owner.
  const rotating = chore.rotationMode === 'rotate'
  const weekStart = addDays(ctx.today, -weekdayOf(ctx.today))
  const weekEnd = addDays(weekStart, 6)
  const anchor = rotating ? weekStart : anchorDate(chore.createdAt, ctx.today, ctx.tz)
  const start = firstOnOrAfter(anchor, days)

  let rrule = days.length === 7 ? 'FREQ=DAILY' : `FREQ=WEEKLY;BYDAY=${byDay(days)}`
  if (rotating) rrule += `;UNTIL=${t.until(weekEnd)}`
  const horizon = rotating ? weekEnd : addDays(ctx.today, 366)
  const off = vacationDates(ctx.vacations, days, start, horizon)

  const child = ctx.childName.get(chore.childId)
  const showReward = input.perChoreRewards
  const emoji = chore.icon?.trim() || DEFAULT_CHORE_EMOJI
  const description: string[] = [formatSchedule(days)]
  if (showReward && chore.rewardCents && chore.rewardCents > 0) {
    description.push(`Earns ${formatMoney(chore.rewardCents, input.currencyCode)} each time.`)
  }
  if (rotating) description.push(`Shared chore: ${child ?? 'this kid'} has it this week, then it moves to the next kid.`)
  if (chore.rotationMode === 'grab') description.push('Bonus chore: the first kid to finish it earns it.')
  if (chore.notes?.trim()) description.push(chore.notes.trim())
  description.push(`Check it off in ChoreStar: ${ctx.appUrl}/dashboard`)

  const lines = [
    'BEGIN:VEVENT',
    contentLine('UID', `chore-${chore.id}@${UID_DOMAIN}`),
    contentLine('DTSTAMP', ctx.dtstamp),
    ...lastModified(chore.updatedAt),
    t.dtstart(start),
  ]
  lines.push(time ? contentLine('DURATION', `PT${TIMED_CHORE_MINUTES}M`) : contentLine('DTEND', icsDate(addDays(start, 1)), { VALUE: 'DATE' }))
  lines.push(contentLine('RRULE', rrule))
  if (off.length > 0) lines.push(t.exdate(off))
  lines.push(
    contentLine('SUMMARY', escapeText(eventTitle(emoji, child, chore.name, chore.rewardCents, input.currencyCode, showReward))),
    contentLine('DESCRIPTION', escapeText(description.join('\n'))),
    contentLine('CATEGORIES', 'ChoreStar,Chore'),
    'TRANSP:TRANSPARENT',
    'END:VEVENT'
  )
  return lines
}

function routineEvent(ctx: Ctx, routine: FeedRoutine, input: FeedInput): string[] {
  const defaults = routineDefaults(routine.type)
  const time = routine.time && HM.test(routine.time) ? routine.time : defaults.time
  const t = timing(ctx, time)
  const days = [0, 1, 2, 3, 4, 5, 6]
  const start = anchorDate(routine.createdAt, ctx.today, ctx.tz)
  const off = vacationDates(ctx.vacations, days, start, addDays(ctx.today, 366))
  const child = ctx.childName.get(routine.childId)

  const steps = routine.steps ?? []
  const description: string[] = [defaults.label]
  if (routine.rewardCents && routine.rewardCents > 0) {
    description.push(`Earns ${formatMoney(routine.rewardCents, input.currencyCode)} when finished.`)
  }
  if (steps.length > 0) {
    description.push('')
    steps.forEach((s, i) => {
      const mins = s.durationSeconds && s.durationSeconds > 0 ? ` (${Math.ceil(s.durationSeconds / 60)} min)` : ''
      description.push(`${i + 1}. ${s.title.trim()}${mins}`)
    })
    description.push('')
  }
  description.push(`Start it in ChoreStar kid mode: ${ctx.appUrl}/kid-login`)

  const lines = [
    'BEGIN:VEVENT',
    contentLine('UID', `routine-${routine.id}@${UID_DOMAIN}`),
    contentLine('DTSTAMP', ctx.dtstamp),
    ...lastModified(routine.updatedAt),
    t.dtstart(start),
    contentLine('DURATION', `PT${routineMinutes(steps)}M`),
    contentLine('RRULE', 'FREQ=DAILY'),
  ]
  if (off.length > 0) lines.push(t.exdate(off))
  lines.push(
    contentLine('SUMMARY', escapeText(eventTitle(defaults.emoji, child, routine.name, routine.rewardCents, input.currencyCode))),
    contentLine('DESCRIPTION', escapeText(description.join('\n'))),
    contentLine('CATEGORIES', 'ChoreStar,Routine'),
    'TRANSP:TRANSPARENT',
    'END:VEVENT'
  )
  return lines
}

function calendarHeader(name: string, description: string, tz: string | null): string[] {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    contentLine('PRODID', PRODID),
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    contentLine('X-WR-CALNAME', escapeText(name)),
    contentLine('NAME', escapeText(name)), // RFC 7986
    contentLine('X-WR-CALDESC', escapeText(description)),
    contentLine('DESCRIPTION', escapeText(description)), // RFC 7986
    // Calendar apps poll; ask for hourly (Google decides for itself).
    contentLine('REFRESH-INTERVAL', 'PT1H', { VALUE: 'DURATION' }), // RFC 7986
    contentLine('X-PUBLISHED-TTL', 'PT1H'),
  ]
  if (tz) lines.push(contentLine('X-WR-TIMEZONE', escapeText(tz)))
  return lines
}

/** The whole feed as an iCalendar stream (CRLF, folded). */
export function buildFeedCalendar(input: FeedInput): string {
  const tz = input.timeZone
  const today = civilDateIn(input.now, tz)
  const ctx: Ctx = {
    tz,
    today,
    dtstamp: icsUtc(input.now),
    appUrl: (input.appUrl ?? `https://${UID_DOMAIN}`).replace(/\/$/, ''),
    childName: new Map(input.children.map(c => [c.id, c.name])),
    vacations: input.vacations ?? [],
  }

  const lines = calendarHeader(input.calendarName, 'Chores and routines from ChoreStar. Edit them in the app; this calendar follows.', tz)
  const year = Number(today.slice(0, 4))
  if (tz) lines.push(...buildVTimezone(tz, year - 1, year + 3))

  // Kids in the order given, each kid's routines (timed) then chores.
  const order = new Map(input.children.map((c, i) => [c.id, i]))
  const rank = (childId: string) => order.get(childId) ?? Number.MAX_SAFE_INTEGER
  const routines = [...input.routines].sort((a, b) => rank(a.childId) - rank(b.childId))
  const chores = [...input.chores].sort((a, b) => rank(a.childId) - rank(b.childId))
  for (const r of routines) lines.push(...routineEvent(ctx, r, input))
  for (const c of chores) lines.push(...choreEvent(ctx, c, input))

  lines.push('END:VCALENDAR')
  return serialize(lines)
}

/**
 * What a feed shows once the family is no longer Premium: an empty calendar
 * with one note on today, so a subscribed calendar explains itself instead of
 * erroring (and calendar apps keep polling a 200, so it comes back by itself
 * when the family renews).
 */
export function buildPremiumNeededCalendar(opts: { calendarName: string; now: Date; appUrl?: string }): string {
  const appUrl = (opts.appUrl ?? `https://${UID_DOMAIN}`).replace(/\/$/, '')
  const today = civilDateIn(opts.now, null)
  const lines = calendarHeader(opts.calendarName, 'This ChoreStar calendar feed needs Premium.', null)
  lines.push(
    'BEGIN:VEVENT',
    contentLine('UID', `premium-needed@${UID_DOMAIN}`),
    contentLine('DTSTAMP', icsUtc(opts.now)),
    contentLine('DTSTART', icsDate(today), { VALUE: 'DATE' }),
    contentLine('DTEND', icsDate(addDays(today, 1)), { VALUE: 'DATE' }),
    contentLine('SUMMARY', escapeText('⭐ Your ChoreStar calendar feed needs Premium')),
    contentLine(
      'DESCRIPTION',
      escapeText(`Chores and routines show up here again as soon as your family has ChoreStar Premium. Nothing to resubscribe.\n\n${appUrl}/dashboard?settings=billing`)
    ),
    'TRANSP:TRANSPARENT',
    'END:VEVENT',
    'END:VCALENDAR'
  )
  return serialize(lines)
}

// ---------------------------------------------------------------------------
// Subscribe links
// ---------------------------------------------------------------------------

/** 32 random bytes, base64url: 43 characters, 256 bits. */
export const FEED_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

export interface FeedUrls {
  https: string
  webcal: string
  google: string
}

/** The https, webcal and Add-to-Google links for a feed token. */
export function feedUrls(baseUrl: string, token: string): FeedUrls {
  const https = `${baseUrl.replace(/\/$/, '')}/api/calendar/${token}.ics`
  const webcal = https.replace(/^https?:\/\//i, 'webcal://')
  return {
    https,
    webcal,
    google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`,
  }
}
