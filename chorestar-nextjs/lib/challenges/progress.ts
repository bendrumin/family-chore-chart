/**
 * Family challenges (Premium, migration 031): cooperative sibling goals.
 *
 * Progress is DERIVED, never stored. These pure functions turn a challenge's
 * definition plus the completions that already exist (chore_completions,
 * routine_completions) into the team bar and each kid's contribution. The web
 * parent dashboard (RLS client), the kid API (service role) and the deliver
 * route all call the same functions, so every surface shows one number.
 *
 * What counts:
 *  - chores:   approved ticks (status null or 'approved', like money) on a
 *              participating kid's chores, dated week_start + day_of_week,
 *              inside the window. One per chore per day, so duplicate rows
 *              can't inflate the bar. chore_filter 'bonus' counts only bonus
 *              chores (025, rotation_mode 'grab'). Rotation copies count for
 *              whichever kid ticked them, active this week or not.
 *  - routines: routine_completions for a participating kid's routines, dated
 *              in the family's timezone (completed_at; the stored `date` is
 *              the server's UTC day), inside the window. One per routine per
 *              day (006's unique index). routine_type narrows to one type.
 *
 * Modes:
 *  - team: everyone's counts add up to `target`.
 *  - each: every kid reaches `target`. The bar is the sum of each kid's count
 *          capped at target, out of target x kids, so one kid racing ahead
 *          can't fill it for the others.
 */

export type ChallengeMetric = 'chores' | 'routines'
export type ChallengeMode = 'team' | 'each'
export type ChallengeChoreFilter = 'any' | 'bonus'
export type ChallengeRoutineType = 'morning' | 'bedtime' | 'afterschool' | 'custom'
export type ChallengeStatus = 'active' | 'delivered' | 'cancelled'

export const CHALLENGE_ROUTINE_TYPES: ChallengeRoutineType[] = ['morning', 'bedtime', 'afterschool', 'custom']

/** The definition, as stored in family_challenges. */
export interface ChallengeDef {
  metric: ChallengeMetric
  mode: ChallengeMode
  target: number
  chore_filter?: ChallengeChoreFilter | null
  routine_type?: ChallengeRoutineType | null
  child_ids: string[]
  /** YYYY-MM-DD, family timezone, inclusive. */
  starts_on: string
  /** YYYY-MM-DD, family timezone, inclusive. */
  ends_on: string
}

/** A family_challenges row. Not in the generated types (migration 031). */
export interface ChallengeRow extends ChallengeDef {
  id: string
  user_id: string
  title: string
  emoji: string | null
  reward_text: string
  reward_cents: number
  status: ChallengeStatus
  delivered_at: string | null
  created_at: string
}

export interface ChoreLite {
  id: string
  child_id: string
  /** 025: 'grab' marks a bonus chore. Missing before the migration. */
  rotation_mode?: string | null
}

export interface ChoreCompletionLite {
  chore_id: string
  week_start: string | null
  day_of_week: number | null
  status?: string | null
}

export interface RoutineLite {
  id: string
  child_id: string
  type?: string | null
}

export interface RoutineCompletionLite {
  routine_id: string
  child_id: string
  date?: string | null
  completed_at?: string | null
}

export interface ChallengeInputs {
  chores: ChoreLite[]
  choreCompletions: ChoreCompletionLite[]
  routines: RoutineLite[]
  routineCompletions: RoutineCompletionLite[]
  /** IANA zone from family_settings.timezone. Defaults to UTC. */
  timeZone?: string | null
}

// ---------------------------------------------------------------------------
// Dates (UTC arithmetic on YYYY-MM-DD strings: no local-time drift)
// ---------------------------------------------------------------------------

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function isIsoDate(s: unknown): s is string {
  if (typeof s !== 'string' || !ISO_DATE.test(s)) return false
  const d = new Date(`${s}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Whole days from a to b (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000)
}

function safeZone(timeZone?: string | null): string {
  if (!timeZone) return 'UTC'
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone })
    return timeZone
  } catch {
    return 'UTC'
  }
}

/** Today's calendar date (YYYY-MM-DD) in a timezone. */
export function todayIn(timeZone?: string | null, now: Date = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: safeZone(timeZone) })
}

/** The Sunday..Saturday week containing `today`, like chore_completions.week_start. */
export function weekWindow(today: string): { starts_on: string; ends_on: string } {
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay()
  const starts_on = addDays(today, -dow)
  return { starts_on, ends_on: addDays(starts_on, 6) }
}

/** The calendar day a chore tick is FOR: its week's Sunday plus the day index. */
export function choreCompletionDate(c: ChoreCompletionLite): string | null {
  if (!c.week_start || c.day_of_week === null || c.day_of_week === undefined) return null
  if (c.day_of_week < 0 || c.day_of_week > 6) return null
  return addDays(c.week_start.slice(0, 10), c.day_of_week)
}

/** The family-local day a routine was finished on. */
export function routineCompletionDate(c: RoutineCompletionLite, timeZone?: string | null): string | null {
  if (c.completed_at) {
    const t = new Date(c.completed_at)
    if (!Number.isNaN(t.getTime())) return todayIn(timeZone, t)
  }
  return c.date ? c.date.slice(0, 10) : null
}

export function inWindow(date: string, def: Pick<ChallengeDef, 'starts_on' | 'ends_on'>): boolean {
  return date >= def.starts_on && date <= def.ends_on
}

export type ChallengeWindowState = 'upcoming' | 'active' | 'ended'

export function windowState(def: Pick<ChallengeDef, 'starts_on' | 'ends_on'>, today: string): ChallengeWindowState {
  if (today < def.starts_on) return 'upcoming'
  if (today > def.ends_on) return 'ended'
  return 'active'
}

/** Days left including today (0 once ended). */
export function daysLeft(def: Pick<ChallengeDef, 'starts_on' | 'ends_on'>, today: string): number {
  if (today > def.ends_on) return 0
  const from = today < def.starts_on ? def.starts_on : today
  return daysBetween(from, def.ends_on) + 1
}

/**
 * The query range that covers a window: chore rows are keyed by week, routine
 * rows by the server's UTC day, so widen both a little and let the pure filter
 * decide.
 */
export function fetchRange(defs: Pick<ChallengeDef, 'starts_on' | 'ends_on'>[]): {
  weekFrom: string
  weekTo: string
  dateFrom: string
  dateTo: string
} | null {
  if (defs.length === 0) return null
  const start = defs.reduce((m, d) => (d.starts_on < m ? d.starts_on : m), defs[0].starts_on)
  const end = defs.reduce((m, d) => (d.ends_on > m ? d.ends_on : m), defs[0].ends_on)
  return {
    weekFrom: weekWindow(start).starts_on,
    weekTo: end,
    dateFrom: addDays(start, -1),
    dateTo: addDays(end, 1),
  }
}

// ---------------------------------------------------------------------------
// Counting
// ---------------------------------------------------------------------------

function isApproved(c: { status?: string | null }): boolean {
  return !c.status || c.status === 'approved'
}

/** Each participant's count inside the window. Every participant has a key. */
export function countContributions(def: ChallengeDef, input: ChallengeInputs): Record<string, number> {
  const counts: Record<string, number> = {}
  const participants = new Set(def.child_ids)
  for (const id of def.child_ids) counts[id] = 0

  if (def.metric === 'chores') {
    const byId = new Map<string, ChoreLite>()
    for (const chore of input.chores) {
      if (!participants.has(chore.child_id)) continue
      if (def.chore_filter === 'bonus' && chore.rotation_mode !== 'grab') continue
      byId.set(chore.id, chore)
    }
    const seen = new Set<string>()
    for (const c of input.choreCompletions) {
      const chore = byId.get(c.chore_id)
      if (!chore || !isApproved(c)) continue
      const date = choreCompletionDate(c)
      if (!date || !inWindow(date, def)) continue
      const key = `${c.chore_id}|${date}`
      if (seen.has(key)) continue
      seen.add(key)
      counts[chore.child_id] += 1
    }
    return counts
  }

  const byId = new Map<string, RoutineLite>()
  for (const routine of input.routines) {
    if (!participants.has(routine.child_id)) continue
    if (def.routine_type && routine.type !== def.routine_type) continue
    byId.set(routine.id, routine)
  }
  const seen = new Set<string>()
  for (const c of input.routineCompletions) {
    const routine = byId.get(c.routine_id)
    if (!routine || !participants.has(c.child_id)) continue
    const date = routineCompletionDate(c, input.timeZone)
    if (!date || !inWindow(date, def)) continue
    const key = `${c.routine_id}|${c.child_id}|${date}`
    if (seen.has(key)) continue
    seen.add(key)
    counts[c.child_id] += 1
  }
  return counts
}

export interface KidContribution {
  childId: string
  count: number
  /** 'each' mode: this kid has reached the target. 'team': contributed at least one. */
  done: boolean
  /** 'each' mode: how many this kid still needs. 0 in team mode. */
  toGo: number
}

export interface ChallengeProgress {
  /** Progress toward `goal`, capped per kid in 'each' mode. */
  current: number
  /** target for team, target x kids for each. */
  goal: number
  /** 0..100 */
  percent: number
  met: boolean
  /** Still needed by the team (team) or summed across kids (each). */
  remaining: number
  kids: KidContribution[]
}

export function challengeProgress(def: ChallengeDef, counts: Record<string, number>): ChallengeProgress {
  const target = Math.max(1, Math.floor(def.target))
  const kids: KidContribution[] = def.child_ids.map(childId => {
    const count = counts[childId] ?? 0
    return def.mode === 'each'
      ? { childId, count, done: count >= target, toGo: Math.max(0, target - count) }
      : { childId, count, done: count > 0, toGo: 0 }
  })

  if (def.mode === 'each') {
    const goal = target * Math.max(1, kids.length)
    const current = kids.reduce((s, k) => s + Math.min(k.count, target), 0)
    const met = kids.length > 0 && kids.every(k => k.done)
    return { current, goal, percent: pct(current, goal), met, remaining: goal - current, kids }
  }

  const sum = kids.reduce((s, k) => s + k.count, 0)
  const current = Math.min(sum, target)
  return { current, goal: target, percent: pct(current, target), met: sum >= target, remaining: target - current, kids }
}

function pct(current: number, goal: number): number {
  if (goal <= 0) return 0
  return Math.min(100, Math.round((current / goal) * 100))
}

/** One call: counts and progress. */
export function computeChallengeProgress(def: ChallengeDef, input: ChallengeInputs): ChallengeProgress {
  return challengeProgress(def, countContributions(def, input))
}

// ---------------------------------------------------------------------------
// Rewards, phase, copy
// ---------------------------------------------------------------------------

/**
 * The ledger rows a delivered challenge writes: reward_cents to EVERY
 * participant (it is a team reward), only when the target was met and there
 * is money attached. Duplicate ids are collapsed.
 */
export function rewardCredits(
  challenge: Pick<ChallengeRow, 'id' | 'reward_cents' | 'child_ids' | 'title' | 'reward_text'>,
  met: boolean
): Array<{ challenge_id: string; child_id: string; amount_cents: number; note: string }> {
  const cents = Math.floor(challenge.reward_cents ?? 0)
  if (!met || cents <= 0) return []
  const note = `Challenge: ${challenge.title} (${challenge.reward_text})`.slice(0, 200)
  return [...new Set(challenge.child_ids)].map(child_id => ({
    challenge_id: challenge.id,
    child_id,
    amount_cents: cents,
    note,
  }))
}

/**
 * Where a challenge stands, for sorting and labels:
 *  - upcoming / active: window not over, target not hit yet
 *  - won:       target hit, reward not delivered yet (celebrate; parent delivers)
 *  - delivered: parent handed it over
 *  - missed:    window over without hitting the target
 *  - cancelled
 */
export type ChallengePhase = 'upcoming' | 'active' | 'won' | 'delivered' | 'missed' | 'cancelled'

export function challengePhase(
  row: Pick<ChallengeRow, 'status' | 'starts_on' | 'ends_on'>,
  progress: Pick<ChallengeProgress, 'met'>,
  today: string
): ChallengePhase {
  if (row.status === 'cancelled') return 'cancelled'
  if (row.status === 'delivered') return 'delivered'
  if (progress.met) return 'won'
  const w = windowState(row, today)
  if (w === 'ended') return 'missed'
  return w
}

const ROUTINE_WORD: Record<ChallengeRoutineType, string> = {
  morning: 'morning routine',
  bedtime: 'bedtime routine',
  afterschool: 'after-school routine',
  custom: 'routine',
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

/** "50 chores together", "5 bedtime routines each", "10 bonus chores together". */
export function describeTarget(def: Pick<ChallengeDef, 'metric' | 'mode' | 'target' | 'chore_filter' | 'routine_type'>): string {
  const word =
    def.metric === 'chores'
      ? def.chore_filter === 'bonus' ? 'bonus chore' : 'chore'
      : def.routine_type ? ROUTINE_WORD[def.routine_type] : 'routine'
  return `${plural(def.target, word)} ${def.mode === 'each' ? 'each' : 'together'}`
}

/** Short, encouraging line about a kid's part. Never ranks kids. */
export function contributionLabel(kid: KidContribution, mode: ChallengeMode): string {
  if (mode === 'each') return kid.done ? 'Done!' : `${kid.count} so far, ${kid.toGo} to go`
  return kid.count === 0 ? 'Ready to help' : `Helped ${kid.count}x`
}
