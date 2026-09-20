'use client'

import { useMemo } from 'react'
import { Star, DollarSign, BarChart3, Info } from 'lucide-react'
import { weekCompletionRate } from '@/lib/utils/schedule'
import { childWeekEarningsCents, dailyRewardCents, isPerChoreMode } from '@/lib/utils/earnings'
import { formatMoney } from '@/lib/constants/currencies'
import type { Database } from '@/lib/supabase/database.types'

type Chore = Database['public']['Tables']['chores']['Row']
type ChoreCompletion = Database['public']['Tables']['chore_completions']['Row']
type FamilySettings = Database['public']['Tables']['family_settings']['Row']

/**
 * The card the iOS app puts at the top of a child's week: perfect days, money
 * earned, and how much of the week is done, three columns split by rules.
 * Ported so both platforms answer "how is this week going" the same way before
 * either shows the grid underneath.
 */
export function WeekSummaryStrip({
  chores,
  completions,
  weekStart,
  vacationDays,
  settings,
}: {
  chores: Chore[]
  completions: ChoreCompletion[]
  weekStart: string
  vacationDays?: ReadonlySet<number>
  settings?: FamilySettings | null
}) {
  const stats = useMemo(() => {
    const thisWeek = completions.filter(
      c => c.week_start === weekStart && (!c.status || c.status === 'approved')
    )
    const { earnedCents, perfectDays } = childWeekEarningsCents(chores, thisWeek, settings)
    return {
      perfectDays,
      earnedCents,
      percent: weekCompletionRate(chores, thisWeek, vacationDays),
    }
  }, [chores, completions, weekStart, vacationDays, settings])

  if (chores.length === 0) return null

  const currency = settings?.currency_code
  const columns = [
    { key: 'perfect', value: String(stats.perfectDays), label: 'Perfect Days', Icon: Star, tone: 'var(--primary)' },
    { key: 'earned', value: formatMoney(stats.earnedCents, currency), label: 'Earned', Icon: DollarSign, tone: 'var(--primary)' },
    { key: 'complete', value: `${stats.percent}%`, label: 'Complete', Icon: BarChart3, tone: '#16a34a' },
  ]

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <div className="flex items-stretch">
        {columns.map(({ key, value, label, Icon, tone }, i) => (
          <div key={key} className="flex-1 flex items-center">
            {i > 0 && <div className="w-px self-stretch bg-gray-200 dark:bg-gray-700 mr-3" aria-hidden />}
            <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
              <span
                className="text-2xl sm:text-3xl font-black tabular-nums truncate max-w-full"
                style={{ color: 'var(--text-primary)' }}
              >
                {value}
              </span>
              <Icon className="w-3.5 h-3.5" style={{ color: tone }} aria-hidden />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 text-center">
                {label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* The daily bonus only exists in flat mode; per-chore families were
          shown a number that had nothing to do with their rewards. */}
      {!isPerChoreMode(settings) && (
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 text-center">
          <Info className="w-3.5 h-3.5 shrink-0" aria-hidden />
          Complete all chores in a day to earn {formatMoney(dailyRewardCents(settings), currency)}
        </p>
      )}
    </div>
  )
}
