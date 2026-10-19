/**
 * Star Pets (migration 034): XP, levels, stages and the star form.
 *
 * XP is DERIVED, never stored, the way lib/challenges/progress.ts derives a
 * challenge bar: from rows that already exist, counted only from the day the
 * pet was adopted (family-local), each thing at most once.
 *
 *   approved chore check-off   +10  one per chore per day (status null or
 *                                   'approved'; a sent-back tick counts nothing)
 *   routine completion         +15  one per routine per day (006's unique index)
 *   perfect day                 +5  every chore due that day done (the same
 *                                   rule as the kid's streak, lib/utils/streak.ts;
 *                                   days with nothing due and vacation days skip)
 *   7-day streak milestone     +50  each time the run reaches 7, 14, 21, ...
 *   family challenge won      +100  each delivered challenge the kid was in (031)
 *
 * Pure: the server loads the rows (lib/pets/server.ts) and every surface
 * (kid panel, parent preview, any native app reading the API) gets the same
 * numbers from these functions.
 */

import {
  addDays,
  choreCompletionDate,
  daysBetween,
  routineCompletionDate,
  todayIn,
  type ChoreCompletionLite,
  type RoutineCompletionLite,
} from '@/lib/challenges/progress'
import { dayStatus, groupDoneByDayKey, type DayRef, type StreakChore } from '@/lib/utils/streak'
import type { VacationWindow } from '@/lib/utils/schedule'
import {
  FREE_MAX_LEVEL,
  MAX_LEVEL,
  PET_STAGES,
  STAGE_START_LEVEL,
  STAR_STREAK_DAYS,
  type PetStage,
} from './catalog'

export const PET_XP = {
  chore: 10,
  routine: 15,
  perfectDay: 5,
  streakWeek: 50,
  challengeWin: 100,
} as const

/** How far back a replay goes, at most. */
const MAX_REPLAY_DAYS = 1000

export interface PetChore extends StreakChore {
  /** Archived chores still earn for ticks made while they were live, but don't make days "due". */
  is_active?: boolean | null
}

export interface PetChallengeWin {
  id: string
  /** When the parent pressed Reward delivered. Counted from the adoption day on. */
  delivered_at: string | null
}

export interface PetXpInputs {
  /** YYYY-MM-DD, family-local: XP counts from this day, inclusive. */
  from: string
  /** YYYY-MM-DD, family-local today, inclusive. */
  today: string
  /** All of this kid's chores, archived or not. */
  chores: PetChore[]
  /** This kid's chore ticks. Pending and rejected rows are ignored. */
  choreCompletions: ChoreCompletionLite[]
  /** This kid's routine completions. */
  routineCompletions: RoutineCompletionLite[]
  /** Delivered family challenges this kid was part of. */
  challengeWins?: PetChallengeWin[]
  vacations?: readonly VacationWindow[] | null
  timeZone?: string | null
}

export interface PetXpBreakdown {
  chores: number
  routines: number
  perfectDays: number
  streakBonus: number
  challenges: number
  total: number
  /** Counts, for the "how your pet grew" line. */
  choreCount: number
  routineCount: number
  perfectDayCount: number
  challengeCount: number
  /** Longest perfect-day run inside the window. */
  bestStreak: number
  /** The run still going today (an unfinished today doesn't break it). */
  currentStreak: number
}

function isApproved(c: { status?: string | null }): boolean {
  return !c.status || c.status === 'approved'
}

function inRange(date: string, from: string, to: string): boolean {
  return date >= from && date <= to
}

/** YYYY-MM-DD -> the (week_start, day_of_week) pair chore_completions uses. */
export function dayRefOf(date: string): DayRef {
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay()
  return { weekStart: addDays(date, -dow), dayOfWeek: dow }
}

/** Perfect days, the streak run and its 7-day milestones, replayed from `from` to `today`. */
export function replayStreak(
  chores: PetChore[],
  completions: ChoreCompletionLite[],
  from: string,
  today: string,
  vacations?: readonly VacationWindow[] | null
): { perfectDays: number; milestones: number; best: number; current: number } {
  const result = { perfectDays: 0, milestones: 0, best: 0, current: 0 }
  const active = chores.filter(c => c.is_active !== false)
  if (active.length === 0 || from > today) return result

  const doneByDay = groupDoneByDayKey(completions)
  const span = Math.min(daysBetween(from, today), MAX_REPLAY_DAYS)
  const start = addDays(today, -span)
  let run = 0
  for (let i = 0; i <= span; i++) {
    const date = addDays(start, i)
    const status = dayStatus(active, doneByDay, dayRefOf(date), vacations)
    if (status === true) {
      result.perfectDays++
      run++
      if (run % 7 === 0) result.milestones++
      if (run > result.best) result.best = run
    } else if (status === false && date !== today) {
      run = 0
    }
    // null (nothing due, vacation) or an unfinished today: the run waits.
  }
  result.current = run
  return result
}

export function computePetXp(input: PetXpInputs): PetXpBreakdown {
  const { from, today } = input

  const choreIds = new Set(input.chores.map(c => c.id))
  const seenChore = new Set<string>()
  for (const c of input.choreCompletions) {
    if (!choreIds.has(c.chore_id) || !isApproved(c)) continue
    const date = choreCompletionDate(c)
    if (!date || !inRange(date, from, today)) continue
    seenChore.add(`${c.chore_id}|${date}`)
  }

  const seenRoutine = new Set<string>()
  for (const c of input.routineCompletions) {
    const date = routineCompletionDate(c, input.timeZone)
    if (!date || !inRange(date, from, today)) continue
    seenRoutine.add(`${c.routine_id}|${date}`)
  }

  const seenChallenge = new Set<string>()
  for (const w of input.challengeWins ?? []) {
    if (!w.delivered_at) continue
    const t = new Date(w.delivered_at)
    if (Number.isNaN(t.getTime())) continue
    const date = todayIn(input.timeZone, t)
    if (!inRange(date, from, today)) continue
    seenChallenge.add(w.id)
  }

  // Only approved ticks inside the window make a day perfect.
  const windowTicks = input.choreCompletions.filter(c => {
    if (!choreIds.has(c.chore_id) || !isApproved(c)) return false
    const date = choreCompletionDate(c)
    return !!date && inRange(date, from, today)
  })
  const streak = replayStreak(input.chores, windowTicks, from, today, input.vacations)

  const chores = seenChore.size * PET_XP.chore
  const routines = seenRoutine.size * PET_XP.routine
  const perfectDays = streak.perfectDays * PET_XP.perfectDay
  const streakBonus = streak.milestones * PET_XP.streakWeek
  const challenges = seenChallenge.size * PET_XP.challengeWin

  return {
    chores,
    routines,
    perfectDays,
    streakBonus,
    challenges,
    total: chores + routines + perfectDays + streakBonus + challenges,
    choreCount: seenChore.size,
    routineCount: seenRoutine.size,
    perfectDayCount: streak.perfectDays,
    challengeCount: seenChallenge.size,
    bestStreak: streak.best,
    currentStreak: streak.current,
  }
}

// ---------------------------------------------------------------------------
// Levels and stages
// ---------------------------------------------------------------------------

/**
 * Total XP needed to reach a level: 25 x L x (L - 1).
 * Level 2 at 50 XP (about five chores), 5 at 500 (the first week or so),
 * 10 at 2,250 (about a month), 18 at 7,650 (adult, a few months), 30 at 21,750.
 */
export function xpForLevel(level: number): number {
  const l = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)))
  return 25 * l * (l - 1)
}

export function levelForXp(xp: number): number {
  const total = Math.max(0, Math.floor(xp))
  let level = 1
  while (level < MAX_LEVEL && xpForLevel(level + 1) <= total) level++
  return level
}

export function stageForLevel(level: number): PetStage {
  let stage: PetStage = 'baby'
  for (const s of PET_STAGES) {
    if (level >= STAGE_START_LEVEL[s]) stage = s
  }
  return stage
}

/** The next stage and the level it starts at, or null when grown up. */
export function nextStage(level: number): { stage: PetStage; level: number } | null {
  for (const s of PET_STAGES) {
    if (STAGE_START_LEVEL[s] > level) return { stage: s, level: STAGE_START_LEVEL[s] }
  }
  return null
}

export interface PetGrowth {
  /** Level from XP alone. */
  trueLevel: number
  /** What the pet shows: trueLevel, or held at FREE_MAX_LEVEL on the free plan. */
  level: number
  stage: PetStage
  /** Adult on Premium with a STAR_STREAK_DAYS run since adopting. Never taken away. */
  star: boolean
  /** Free plan and the XP would grow it further: "ready to grow". */
  heldBack: boolean
  /** XP at the start of the shown level, and at the next (null at the top or when held). */
  levelStartXp: number
  nextLevelXp: number | null
  /** 0..100 through the shown level. 100 when held back or maxed. */
  levelPercent: number
}

export function petGrowth(xp: number, opts: { premium: boolean; bestStreak: number }): PetGrowth {
  const trueLevel = levelForXp(xp)
  const level = opts.premium ? trueLevel : Math.min(trueLevel, FREE_MAX_LEVEL)
  const heldBack = !opts.premium && trueLevel > FREE_MAX_LEVEL
  const stage = stageForLevel(level)
  const star = opts.premium && stage === 'adult' && opts.bestStreak >= STAR_STREAK_DAYS
  const levelStartXp = xpForLevel(level)
  const atTop = level >= MAX_LEVEL || heldBack
  const nextLevelXp = atTop ? null : xpForLevel(level + 1)
  const levelPercent =
    nextLevelXp === null
      ? 100
      : Math.max(0, Math.min(100, Math.floor(((xp - levelStartXp) / (nextLevelXp - levelStartXp)) * 100)))
  return { trueLevel, level, stage, star, heldBack, levelStartXp, nextLevelXp, levelPercent }
}
