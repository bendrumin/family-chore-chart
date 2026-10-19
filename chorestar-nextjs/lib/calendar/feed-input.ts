/**
 * Database rows -> the pure generator's input (lib/calendar/ics.ts). Kept
 * apart from the route so the mapping is unit-tested without Supabase.
 *
 * Rows are read loosely: the chores rotation columns (025), the vacation
 * columns (019) and calendar_feeds (033) are not in the generated types.
 */

import { resolveFeedTimeZone, type FeedChore, type FeedInput, type FeedRoutine } from '@/lib/calendar/ics'
import { vacationWindowFromSettings, type VacationWindow } from '@/lib/utils/schedule'

export interface FeedRow {
  id: string
  family_id: string
  child_id: string | null
  timezone: string | null
}

export interface ChildRow {
  id: string
  name: string
}

export interface ChoreRow {
  id: string
  child_id: string
  name: string
  icon?: string | null
  reward_cents?: number | null
  days_of_week?: number[] | null
  notes?: string | null
  is_active?: boolean | null
  rotation_mode?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface RoutineRow {
  id: string
  child_id: string
  name: string
  type: string
  reward_cents?: number | null
  is_active?: boolean | null
  created_at?: string | null
  updated_at?: string | null
}

export interface StepRow {
  routine_id: string
  title: string
  order_index?: number | null
  duration_seconds?: number | null
}

export interface SettingsRow {
  timezone?: string | null
  currency_code?: string | null
  reward_mode?: string | null
  vacation_starts_on?: string | null
  vacation_ends_on?: string | null
}

export interface FeedRows {
  feed: FeedRow
  familyName: string | null
  settings: SettingsRow | null
  children: ChildRow[]
  chores: ChoreRow[]
  routines: RoutineRow[]
  steps: StepRow[]
  vacationHistory: VacationWindow[]
}

/** "ChoreStar: Maya" for a kid's feed, "ChoreStar: Smith Family" for the family's. */
export function feedCalendarName(familyName: string | null | undefined, child: ChildRow | null | undefined): string {
  if (child) return `ChoreStar: ${child.name}`
  const name = familyName?.trim()
  return name ? `ChoreStar: ${name}` : 'ChoreStar'
}

export function toFeedInput(rows: FeedRows, now: Date, appUrl: string): FeedInput {
  const scope = rows.feed.child_id
  const children = scope ? rows.children.filter(c => c.id === scope) : rows.children
  const kidIds = new Set(children.map(c => c.id))

  const chores: FeedChore[] = rows.chores
    .filter(c => c.is_active !== false && kidIds.has(c.child_id))
    .map(c => ({
      id: c.id,
      childId: c.child_id,
      name: c.name,
      icon: c.icon ?? null,
      rewardCents: c.reward_cents ?? 0,
      daysOfWeek: c.days_of_week ?? null,
      notes: c.notes ?? null,
      rotationMode: c.rotation_mode === 'rotate' || c.rotation_mode === 'grab' ? c.rotation_mode : null,
      createdAt: c.created_at ?? null,
      updatedAt: c.updated_at ?? null,
    }))

  const stepsByRoutine = new Map<string, StepRow[]>()
  for (const s of rows.steps) {
    const list = stepsByRoutine.get(s.routine_id) ?? []
    list.push(s)
    stepsByRoutine.set(s.routine_id, list)
  }
  const routines: FeedRoutine[] = rows.routines
    .filter(r => r.is_active !== false && kidIds.has(r.child_id))
    .map(r => ({
      id: r.id,
      childId: r.child_id,
      name: r.name,
      type: r.type,
      rewardCents: r.reward_cents ?? 0,
      steps: (stepsByRoutine.get(r.id) ?? [])
        .slice()
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
        .map(s => ({ title: s.title, durationSeconds: s.duration_seconds ?? null })),
      createdAt: r.created_at ?? null,
      updatedAt: r.updated_at ?? null,
    }))

  const vacations = [...rows.vacationHistory]
  const live = vacationWindowFromSettings(rows.settings)
  if (live) vacations.push(live)

  return {
    calendarName: feedCalendarName(rows.familyName, scope ? children[0] : null),
    timeZone: resolveFeedTimeZone(rows.settings?.timezone, rows.feed.timezone),
    now,
    currencyCode: rows.settings?.currency_code ?? 'USD',
    perChoreRewards: rows.settings?.reward_mode === 'per_chore',
    children,
    chores,
    routines,
    vacations,
    appUrl,
  }
}
