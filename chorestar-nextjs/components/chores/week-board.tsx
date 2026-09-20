'use client'

import { ChoreCard } from '@/components/chores/chore-card'
import { DAY_SHORT, isDueOn } from '@/lib/utils/schedule'
import { useWeekDisplayOrder } from '@/lib/hooks/use-week-display-order'
import { isPerfectDay, childDayEarningsCents, groupDoneByDay } from '@/lib/utils/earnings'
import { formatMoney } from '@/lib/constants/currencies'
import { isCurrentWeek as isThisWeek } from '@/lib/utils/date-helpers'
import type { Database } from '@/lib/supabase/database.types'

type Chore = Database['public']['Tables']['chores']['Row']
type ChoreCompletion = Database['public']['Tables']['chore_completions']['Row']
type FamilySettings = Database['public']['Tables']['family_settings']['Row']

/**
 * The week as one table, the way the iOS app draws it: the seven day names
 * once across the top, then a row per chore underneath. The web used to give
 * every chore its own card with its own copy of the day names, which on a
 * phone meant reading "Sun Mon Tue…" once per chore and scrolling three
 * screens to see four of them.
 *
 * The header also carries what iOS puts there: a dot under today, and the
 * day's earnings on a day where everything due got done.
 */
export function WeekBoard({
  chores,
  completionsByChoreId,
  completions,
  weekStart,
  rewardMode,
  vacationDays,
  settings,
  onRefresh,
}: {
  chores: Chore[]
  completionsByChoreId: Map<string, ChoreCompletion[]>
  completions: ChoreCompletion[]
  weekStart: string
  rewardMode: 'flat' | 'per_chore'
  vacationDays?: ReadonlySet<number>
  settings?: FamilySettings | null
  onRefresh: () => void
}) {
  const weekOrder = useWeekDisplayOrder()
  const showsToday = isThisWeek(weekStart)
  const today = new Date().getDay()

  const approved = completions.filter(
    c => c.week_start === weekStart && (!c.status || c.status === 'approved')
  )
  const doneByDay = groupDoneByDay(approved)

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
      {/* Day header — the only place the day names appear */}
      <div className="grid grid-cols-7 gap-1.5 px-3 py-2.5">
        {weekOrder.map(dayOfWeek => {
          const isToday = showsToday && dayOfWeek === today
          const done = doneByDay.get(dayOfWeek) ?? new Set<string>()
          const anyDue = chores.some(c => isDueOn(c, dayOfWeek, vacationDays))
          const perfect = anyDue && isPerfectDay(chores, done, dayOfWeek)
          const earned = perfect ? childDayEarningsCents(chores, done, settings, dayOfWeek) : 0
          return (
            <div key={dayOfWeek} className="flex flex-col items-center gap-1">
              <span
                className="text-xs font-bold"
                style={{ color: isToday ? 'var(--primary)' : 'var(--text-secondary)' }}
              >
                {DAY_SHORT[dayOfWeek]}
              </span>
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: isToday ? 'var(--primary)' : 'transparent' }}
                aria-hidden
              />
              {perfect && earned > 0 && (
                <span className="text-[0.6rem] font-bold leading-none px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 tabular-nums">
                  {formatMoney(earned, settings?.currency_code)}
                </span>
              )}
            </div>
          )
        })}
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700">
        {chores.map((chore, i) => (
          <div key={chore.id} className={i > 0 ? 'border-t border-gray-200 dark:border-gray-700' : ''}>
            <ChoreCard
              chore={chore}
              boardRow
              even={i % 2 === 0}
              completions={completionsByChoreId.get(chore.id) || []}
              weekStart={weekStart}
              rewardMode={rewardMode}
              vacationDays={vacationDays}
              onRefresh={onRefresh}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
