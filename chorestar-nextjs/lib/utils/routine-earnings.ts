import type { IncomeEvent } from '@/lib/utils/money'

/**
 * Routine rewards count toward a kid's balance from this date on. Before it,
 * the routine card showed "+X¢" but computeBalance never added it; counting
 * the history would have raised balances overnight, so it starts fresh.
 */
export const ROUTINE_MONEY_SINCE = '2026-10-19T00:00:00Z'

export interface RoutineCompletionRow {
  routine_id: string
  date: string | null
  completed_at: string | null
  points_earned: number | null
}

/**
 * One income event per routine per day: points_earned is the routine's
 * reward_cents, recorded when every step was done. A second completion of the
 * same routine the same day (the player refuses one, but an old app might
 * write it) never pays twice.
 */
export function routineIncome(rows: RoutineCompletionRow[], since = ROUTINE_MONEY_SINCE): IncomeEvent[] {
  const best = new Map<string, IncomeEvent>()
  for (const r of rows) {
    const cents = r.points_earned ?? 0
    if (cents <= 0 || !r.completed_at || r.completed_at < since) continue
    const date = r.date ?? r.completed_at.slice(0, 10)
    const key = `${r.routine_id}:${date}`
    const prev = best.get(key)
    if (!prev || cents > prev.cents) best.set(key, { date, cents })
  }
  return [...best.values()].sort((a, b) => a.date.localeCompare(b.date))
}
