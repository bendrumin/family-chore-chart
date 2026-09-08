export interface WeekInfo {
  weekStart: string  // ISO date string (Sunday)
  weekEnd: string    // ISO date string (Saturday)
  displayText: string // e.g., "Week of Jan 15"
}

/**
 * Date math here must stay in ONE frame: the user's local calendar.
 * `new Date('2026-09-06')` parses as UTC midnight (so `.getDate()` says
 * Sep 5 anywhere west of Greenwich), and `.toISOString()` converts back
 * to UTC (so a local Sunday serializes as Saturday anywhere EAST of it,
 * which shifted week keys for Gulf and India families). Parse and format
 * locally, always.
 */
export function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function formatLocalDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function getWeekStart(date: Date = new Date()): string {
  const sunday = new Date(date)
  sunday.setDate(sunday.getDate() - sunday.getDay())
  sunday.setHours(0, 0, 0, 0)
  return formatLocalDate(sunday)
}

export function getWeekEnd(weekStartDate: string): string {
  const date = parseLocalDate(weekStartDate)
  date.setDate(date.getDate() + 6) // Saturday
  return formatLocalDate(date)
}

export function getWeekInfo(weekStartDate: string): WeekInfo {
  const start = parseLocalDate(weekStartDate)
  const end = parseLocalDate(weekStartDate)
  end.setDate(end.getDate() + 6)

  const monthName = start.toLocaleDateString('en-US', { month: 'short' })
  const day = start.getDate()
  const year = start.getFullYear()
  const currentYear = new Date().getFullYear()

  const displayText = currentYear === year
    ? `Week of ${monthName} ${day}`
    : `Week of ${monthName} ${day}, ${year}`

  return {
    weekStart: weekStartDate,
    weekEnd: formatLocalDate(end),
    displayText,
  }
}

export function getPreviousWeek(weekStartDate: string): string {
  const date = parseLocalDate(weekStartDate)
  date.setDate(date.getDate() - 7)
  return formatLocalDate(date)
}

export function getNextWeek(weekStartDate: string): string {
  const date = parseLocalDate(weekStartDate)
  date.setDate(date.getDate() + 7)
  return formatLocalDate(date)
}

export function isCurrentWeek(weekStartDate: string): boolean {
  const currentWeekStart = getWeekStart()
  return weekStartDate === currentWeekStart
}

