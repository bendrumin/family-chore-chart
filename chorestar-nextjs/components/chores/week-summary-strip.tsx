'use client'

import { useMemo } from 'react'
import { Star } from 'lucide-react'
import { DAY_SHORT, isDueOn, type Scheduled } from '@/lib/utils/schedule'
import { useWeekDisplayOrder } from '@/lib/hooks/use-week-display-order'
import type { Database } from '@/lib/supabase/database.types'

type Chore = Database['public']['Tables']['chores']['Row']
type ChoreCompletion = Database['public']['Tables']['chore_completions']['Row']

/**
 * The week at a glance: one star per day, filled when everything due that day
 * was done. The iOS app opens its week on exactly this ("Perfect Days n/7"),
 * and it answers the question a parent actually has — how did the week go —
 * without reading seven boxes on every chore row.
 *
 * A day with nothing due is not a failure, so it reads as a quiet dash rather
 * than an empty star.
 */
export function WeekSummaryStrip({
  chores,
  completions,
  weekStart,
  vacationDays,
}: {
  chores: Chore[]
  completions: ChoreCompletion[]
  weekStart: string
  vacationDays?: ReadonlySet<number>
}) {
  const weekOrder = useWeekDisplayOrder()

  const days = useMemo(() => {
    const approved = completions.filter(
      c => c.week_start === weekStart && (!c.status || c.status === 'approved')
    )
    const doneKey = new Set(approved.map(c => `${c.chore_id}:${c.day_of_week}`))

    return weekOrder.map(dayOfWeek => {
      const due = chores.filter(chore => isDueOn(chore as unknown as Scheduled, dayOfWeek, vacationDays))
      const done = due.filter(chore => doneKey.has(`${chore.id}:${dayOfWeek}`)).length
      return {
        dayOfWeek,
        label: DAY_SHORT[dayOfWeek],
        due: due.length,
        done,
        perfect: due.length > 0 && done === due.length,
      }
    })
  }, [chores, completions, weekStart, vacationDays, weekOrder])

  const perfectDays = days.filter(d => d.perfect).length
  const scheduledDays = days.filter(d => d.due > 0).length

  if (scheduledDays === 0) return null

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
          Perfect days
        </span>
        <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--primary)' }}>
          {perfectDays}/{scheduledDays}
        </span>
      </div>
      <div className="flex">
        {days.map(day => (
          <div key={day.dayOfWeek} className="flex-1 flex flex-col items-center gap-1">
            {day.due === 0 ? (
              <span className="text-lg leading-none text-gray-300 dark:text-gray-600" aria-hidden>
                –
              </span>
            ) : (
              <Star
                className={`w-5 h-5 ${day.perfect ? 'fill-current' : ''}`}
                style={{ color: day.perfect ? 'var(--primary)' : undefined }}
                aria-hidden
              />
            )}
            <span className="text-[0.65rem] font-semibold text-gray-500 dark:text-gray-400">
              {day.label}
            </span>
            <span className="sr-only">
              {day.due === 0
                ? `${day.label}: nothing due`
                : `${day.label}: ${day.done} of ${day.due} done`}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
