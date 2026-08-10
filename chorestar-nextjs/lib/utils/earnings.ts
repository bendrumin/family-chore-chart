import type { Database } from '@/lib/supabase/database.types'

type FamilySettings = Database['public']['Tables']['family_settings']['Row']

/**
 * Canonical earnings rules. Every surface that shows money — the dashboard
 * hero, weekly stats, the Insights tab, PDF exports — must go through here,
 * so a family can't be told two different numbers for the same week.
 *
 * The two reward modes:
 *  - 'per_chore' — each chore pays its own `reward_cents` on completion.
 *  - 'flat'      — a child earns `daily_reward_cents` for a day, and only
 *                  when every one of their active chores is done that day.
 *
 * The daily rate is per child, not per family: two children who each finish
 * their list both earn it. The weekly bonus applies only on a 7/7 week, in
 * both modes.
 */

/** The slice of family_settings the rules depend on. */
export type EarningsSettings = Pick<
  FamilySettings,
  'reward_mode' | 'daily_reward_cents' | 'weekly_bonus_cents'
>

/** Matches the schema default for family_settings.daily_reward_cents. */
export const DEFAULT_DAILY_REWARD_CENTS = 7

export interface ChoreReward {
  id: string
  reward_cents: number | null
}

export interface DayCompletion {
  chore_id: string
  day_of_week: number | null
}

export function isPerChoreMode(settings?: EarningsSettings | null): boolean {
  return settings?.reward_mode === 'per_chore'
}

export function dailyRewardCents(settings?: EarningsSettings | null): number {
  return settings?.daily_reward_cents ?? DEFAULT_DAILY_REWARD_CENTS
}

export function weeklyBonusCents(settings?: EarningsSettings | null): number {
  return settings?.weekly_bonus_cents ?? 0
}

/**
 * Did this child finish every active chore on this day? Tested by chore-id
 * membership rather than by counting rows, so duplicate completion rows can't
 * push a partial day over the threshold and fake a perfect day.
 */
export function isPerfectDay(chores: ChoreReward[], doneChoreIds: Set<string>): boolean {
  if (chores.length === 0) return false
  return chores.every(c => doneChoreIds.has(c.id))
}

/** Earnings in cents for ONE child on ONE day. */
export function childDayEarningsCents(
  chores: ChoreReward[],
  doneChoreIds: Set<string>,
  settings?: EarningsSettings | null
): number {
  if (chores.length === 0) return 0

  if (isPerChoreMode(settings)) {
    return chores.reduce(
      (sum, c) => sum + (doneChoreIds.has(c.id) ? c.reward_cents ?? 0 : 0),
      0
    )
  }

  return isPerfectDay(chores, doneChoreIds) ? dailyRewardCents(settings) : 0
}

/** Completed chore-ids bucketed by day_of_week. */
export function groupDoneByDay(completions: DayCompletion[]): Map<number, Set<string>> {
  const byDay = new Map<number, Set<string>>()
  for (const c of completions) {
    if (c.day_of_week === null || c.day_of_week === undefined) continue
    let set = byDay.get(c.day_of_week)
    if (!set) {
      set = new Set<string>()
      byDay.set(c.day_of_week, set)
    }
    set.add(c.chore_id)
  }
  return byDay
}

export interface WeekEarnings {
  earnedCents: number
  perfectDays: number
}

/** A completion that also knows which week it belongs to. */
export interface DatedCompletion extends DayCompletion {
  week_start: string | null
}

/**
 * Everything a child has earned across every week they have completions for.
 *
 * The weekly bonus is per-week, so completions have to be bucketed by
 * `week_start` and run through the normal week calculation rather than being
 * treated as one long stretch of days — otherwise seven perfect days spread
 * across two weeks would wrongly pay the bonus.
 */
export function childTotalEarningsCents(
  chores: ChoreReward[],
  completions: DatedCompletion[],
  settings?: EarningsSettings | null
): number {
  if (chores.length === 0) return 0

  const byWeek = new Map<string, DayCompletion[]>()
  for (const c of completions) {
    if (!c.week_start) continue
    const list = byWeek.get(c.week_start) ?? []
    list.push(c)
    byWeek.set(c.week_start, list)
  }

  let total = 0
  for (const weekCompletions of byWeek.values()) {
    total += childWeekEarningsCents(chores, weekCompletions, settings).earnedCents
  }
  return total
}

/**
 * What is still owed: everything ever earned, minus everything already handed
 * over. Derived on read so a late-ticked chore from last month simply raises
 * the balance, and never goes negative if rewards are lowered after a payout.
 */
export function owedCents(totalEarnedCents: number, totalPaidCents: number): number {
  return Math.max(0, totalEarnedCents - totalPaidCents)
}

/** Earnings in cents for ONE child across one week, plus its perfect-day count. */
export function childWeekEarningsCents(
  chores: ChoreReward[],
  completions: DayCompletion[],
  settings?: EarningsSettings | null
): WeekEarnings {
  const byDay = groupDoneByDay(completions)
  const NONE: Set<string> = new Set()

  let earnedCents = 0
  let perfectDays = 0

  for (let day = 0; day < 7; day++) {
    const done = byDay.get(day) ?? NONE
    earnedCents += childDayEarningsCents(chores, done, settings)
    if (isPerfectDay(chores, done)) perfectDays++
  }

  if (perfectDays === 7) earnedCents += weeklyBonusCents(settings)

  return { earnedCents, perfectDays }
}
