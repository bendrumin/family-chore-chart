import type { ThemeColors } from '@/lib/constants/seasonal-themes'

/**
 * Time-of-day themes: an accent palette that follows the clock, the way
 * seasonal themes follow the calendar.
 *
 * This is a separate axis from dark mode. Auto dark mode already keys off the
 * hour (see shouldUseDarkAuto in lib/utils/theme-mode.ts) and decides *whether*
 * the UI is light or dark; these decide the accent hue, and each carries both a
 * light and a dark variant so the two compose.
 */
export interface TimeTheme {
  id: string
  name: string
  icon: string
  /** Inclusive. */
  startHour: number
  /** Exclusive. The night window wraps past midnight. */
  endHour: number
  colors: ThemeColors
}

export const TIME_THEMES: Record<string, TimeTheme> = {
  dawn: {
    id: 'dawn',
    name: 'Dawn',
    icon: '🌅',
    startHour: 5,
    endHour: 9,
    colors: {
      light: { primary: '#e8638f', secondary: '#f0a03a' },
      dark: { primary: '#f9a8d4', secondary: '#fcd34d' }
    }
  },
  day: {
    id: 'day',
    name: 'Daylight',
    icon: '☀️',
    startHour: 9,
    endHour: 17,
    colors: {
      light: { primary: '#0284c7', secondary: '#0ea5e9' },
      dark: { primary: '#38bdf8', secondary: '#7dd3fc' }
    }
  },
  dusk: {
    id: 'dusk',
    name: 'Dusk',
    icon: '🌇',
    startHour: 17,
    endHour: 21,
    colors: {
      light: { primary: '#ea580c', secondary: '#9333ea' },
      dark: { primary: '#fb923c', secondary: '#c084fc' }
    }
  },
  night: {
    id: 'night',
    name: 'Night',
    icon: '🌙',
    startHour: 21,
    endHour: 5,
    colors: {
      light: { primary: '#4f46e5', secondary: '#7c3aed' },
      dark: { primary: '#818cf8', secondary: '#a78bfa' }
    }
  }
}

/** Prefixed so a time theme id can never collide with a seasonal one. */
export const TIME_THEME_ID_PREFIX = 'time-'

export function isWithinTimeWindow(hour: number, startHour: number, endHour: number): boolean {
  return startHour <= endHour
    ? hour >= startHour && hour < endHour
    : hour >= startHour || hour < endHour
}

/**
 * The time theme for a given moment. The four windows tile the whole day, so
 * this always resolves — night covers the wrap past midnight.
 */
export function getCurrentTimeTheme(now: Date = new Date()): TimeTheme {
  const hour = now.getHours()
  for (const theme of Object.values(TIME_THEMES)) {
    if (isWithinTimeWindow(hour, theme.startHour, theme.endHour)) return theme
  }
  // Unreachable while the windows tile the day; keeps the return type total.
  return TIME_THEMES.day
}

/** Milliseconds until the current time window ends, for scheduling a re-apply. */
export function msUntilNextTimeTheme(now: Date = new Date()): number {
  const active = getCurrentTimeTheme(now)
  const next = new Date(now)
  next.setMinutes(0, 0, 0)
  next.setHours(active.endHour)
  if (next <= now) next.setDate(next.getDate() + 1)
  return next.getTime() - now.getTime()
}
