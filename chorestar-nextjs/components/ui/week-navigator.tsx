'use client'

import { Button } from './button'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { getWeekStart, getWeekInfo, getPreviousWeek, getNextWeek, isCurrentWeek } from '@/lib/utils/date-helpers'

interface WeekNavigatorProps {
  weekStart: string
  onWeekChange: (newWeekStart: string) => void
}

export function WeekNavigator({ weekStart, onWeekChange }: WeekNavigatorProps) {
  const weekInfo = getWeekInfo(weekStart)
  const isCurrent = isCurrentWeek(weekStart)

  const handlePrevious = () => {
    const prevWeek = getPreviousWeek(weekStart)
    onWeekChange(prevWeek)
  }

  const handleNext = () => {
    const nextWeek = getNextWeek(weekStart)
    onWeekChange(nextWeek)
  }

  const handleToday = () => {
    onWeekChange(getWeekStart())
  }

  return (
    <div className="flex items-center justify-between gap-2 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrevious}
        aria-label="Previous week"
        className="shrink-0 min-h-[44px] min-w-[44px] justify-center active:bg-gray-100 dark:active:bg-gray-700"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Previous</span>
      </Button>

      {/* One line at every width. Without the nowrap the "This Week" pill broke
          across two lines on a 384px phone and sat under the next-week arrow. */}
      <div className="flex items-center gap-2 min-w-0 shrink">
        {/* Decorative, and on a phone its 24px was the difference between
            "Week of Sep 20" and "Week of Se...". The arrows already say what
            this row is. */}
        <Calendar className="hidden sm:block w-4 h-4 text-gray-500 shrink-0" />
        <span className="text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap truncate">
          {weekInfo.displayText}
        </span>
        {isCurrent && (
          <span className="shrink-0 whitespace-nowrap text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full font-medium">
            <span className="sm:hidden">Now</span>
            <span className="hidden sm:inline">This Week</span>
          </span>
        )}
      </div>

      <div className="flex gap-1 shrink-0">
        {!isCurrent && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="min-h-[44px] active:bg-gray-100 dark:active:bg-gray-700"
          >
            Today
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          aria-label="Next week"
          className="min-h-[44px] min-w-[44px] justify-center active:bg-gray-100 dark:active:bg-gray-700"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
