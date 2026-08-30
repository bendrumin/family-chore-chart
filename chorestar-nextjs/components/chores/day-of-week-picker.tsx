'use client'

import { Label } from '@/components/ui/label'
import {
  ALL_DAYS,
  DAY_LONG,
  DAY_SHORT,
  WEEKDAYS,
  WEEKENDS,
  formatSchedule,
  normalizeDays,
} from '@/lib/utils/schedule'

interface DayOfWeekPickerProps {
  /** Selected days, 0=Sun .. 6=Sat. */
  value: number[]
  onChange: (days: number[]) => void
  /** Prefix for element ids so two pickers on a page stay unique. */
  idPrefix?: string
}

const PRESETS: Array<{ label: string; days: readonly number[] }> = [
  { label: 'Every day', days: ALL_DAYS },
  { label: 'Weekdays', days: WEEKDAYS },
  { label: 'Weekends', days: WEEKENDS },
]

function sameSet(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((d, i) => d === b[i])
}

/**
 * Seven toggles and three presets: what a fridge chart looks like.
 *
 * The last selected day cannot be un-selected. A chore that is due on no day
 * is not a chore, and the database rejects it anyway (migration 015), so the
 * picker keeps the user out of that state instead of surfacing an error later.
 */
export function DayOfWeekPicker({ value, onChange, idPrefix = 'days' }: DayOfWeekPickerProps) {
  const selected = normalizeDays(value)
  const isLastSelected = (day: number) => selected.length === 1 && selected[0] === day

  const toggle = (day: number) => {
    if (isLastSelected(day)) return
    onChange(
      selected.includes(day)
        ? selected.filter(d => d !== day)
        : normalizeDays([...selected, day])
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Label className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
          Which days?
        </Label>
        <span
          className="text-sm font-semibold tabular-nums"
          style={{ color: 'var(--text-secondary)' }}
          aria-live="polite"
        >
          {formatSchedule(selected)}
        </span>
      </div>

      <div
        role="group"
        aria-label="Days of the week"
        className="grid grid-cols-7 gap-1.5"
      >
        {ALL_DAYS.map(day => {
          const on = selected.includes(day)
          const locked = isLastSelected(day)
          return (
            <button
              key={day}
              type="button"
              id={`${idPrefix}-${day}`}
              onClick={() => toggle(day)}
              aria-pressed={on}
              aria-label={`${DAY_LONG[day]}${locked ? ', the only day selected' : ''}`}
              title={locked ? 'A chore needs at least one day' : DAY_LONG[day]}
              className={`h-11 rounded-xl text-sm font-bold transition-colors duration-150 touch-manipulation ${
                on
                  ? 'accent-fill'
                  : 'bg-white/70 dark:bg-gray-800/60 border border-black/[0.08] dark:border-white/[0.12] text-gray-600 dark:text-gray-300 hover:bg-black/[0.03] dark:hover:bg-white/[0.06]'
              } ${locked ? 'cursor-default' : ''}`}
            >
              {DAY_SHORT[day]}
            </button>
          )
        })}
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {PRESETS.map(preset => {
          const active = sameSet(selected, preset.days)
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => onChange([...preset.days])}
              aria-pressed={active}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors duration-150 ${
                active
                  ? 'border-transparent bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-800'
              }`}
            >
              {preset.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
