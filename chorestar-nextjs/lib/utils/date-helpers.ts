export interface WeekInfo {
  weekStart: string  // ISO date string (Sunday)
  weekEnd: string    // ISO date string (Saturday)
  displayText: string // e.g., "Week of Jan 15"
}

export function getWeekStart(date: Date = new Date()): string {
  const dayOfWeek = date.getDay()
  const diff = date.getDate() - dayOfWeek
  const sunday = new Date(date.setDate(diff))
  sunday.setHours(0, 0, 0, 0)
  return sunday.toISOString().split('T')[0]
}

export function getWeekEnd(weekStartDate: string): string {
  const date = new Date(weekStartDate)
  date.setDate(date.getDate() + 6) // Saturday
  return date.toISOString().split('T')[0]
}

export function getWeekInfo(weekStartDate: string): WeekInfo {
  const start = new Date(weekStartDate)
  const end = new Date(weekStartDate)
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
    weekEnd: end.toISOString().split('T')[0],
    displayText,
  }
}

export function getPreviousWeek(weekStartDate: string): string {
  const date = new Date(weekStartDate)
  date.setDate(date.getDate() - 7)
  return date.toISOString().split('T')[0]
}

export function getNextWeek(weekStartDate: string): string {
  const date = new Date(weekStartDate)
  date.setDate(date.getDate() + 7)
  return date.toISOString().split('T')[0]
}

export function isCurrentWeek(weekStartDate: string): boolean {
  const currentWeekStart = getWeekStart()
  return weekStartDate === currentWeekStart
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
