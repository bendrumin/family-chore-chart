'use client'

import { Button } from './button'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { getWeekInfo, getPreviousWeek, getNextWeek, isCurrentWeek } from '@/lib/utils/date-helpers'

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
    const currentWeek = new Date()
    const dayOfWeek = currentWeek.getDay()
    const diff = currentWeek.getDate() - dayOfWeek
    const sunday = new Date(currentWeek.setDate(diff))
    sunday.setHours(0, 0, 0, 0)
    onWeekChange(sunday.toISOString().split('T')[0])
  }

  return (
    <div className="flex items-center justify-between gap-2 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrevious}
        className="h-8"
      >
        <ChevronLeft className="w-4 h-4" />
        Previous
      </Button>

      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          {weekInfo.displayText}
        </span>
        {isCurrent && (
          <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full font-medium">
            This Week
          </span>
        )}
      </div>

      <div className="flex gap-1">
        {!isCurrent && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="h-8"
          >
            Today
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          className="h-8"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
