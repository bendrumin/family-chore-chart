import { createClient } from '@/lib/supabase/client'
import { formatLocalDate, parseLocalDate } from '@/lib/utils/date-helpers'
import type { VacationWindow } from '@/lib/utils/schedule'

/**
 * Client-side helpers for vacation mode (migration 019).
 *
 * The LIVE switch is the vacation_starts_on / vacation_ends_on pair on
 * family_settings, saved through the normal settings path. The
 * `vacation_periods` table only keeps HISTORY so streak math that looks back
 * in time knows a quiet week was a trip, not a collapse.
 *
 * Everything here is deliberately best-effort and silent:
 *  - the table is not in the generated Supabase types (same situation as
 *    testflight_waitlist / apple_notifications, see CLAUDE.md), so it is
 *    reached through an `as any` cast;
 *  - pre-migration the table does not exist at all, and a read must degrade
 *    to "no vacations" rather than break the page;
 *  - a co-parent's RLS may refuse history writes (the policies are
 *    owner-write, member-read). The live switch is what matters; history only
 *    refines past streaks, so a failed write is never surfaced.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
function periodsTable() {
  const supabase = createClient()
  return (supabase as any).from('vacation_periods')
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function isWindow(row: unknown): row is VacationWindow {
  const r = row as { starts_on?: unknown; ends_on?: unknown } | null
  return typeof r?.starts_on === 'string' && typeof r?.ends_on === 'string'
}

/**
 * Every vacation window recorded for this family, oldest first. Returns []
 * on any failure (table missing pre-migration, RLS, network) so callers can
 * always treat the result as "the vacations we know about".
 */
export async function fetchVacationWindows(userId: string): Promise<VacationWindow[]> {
  try {
    const { data, error } = await periodsTable()
      .select('starts_on, ends_on')
      .eq('user_id', userId)
      .order('starts_on', { ascending: true })
    if (error || !Array.isArray(data)) return []
    return (data as unknown[]).filter(isWindow)
  } catch {
    return []
  }
}

/**
 * Record a window in the history when it is turned on or edited. An edit moves
 * the existing row for the previous window rather than stacking a second
 * overlapping one; if no such row exists (or the update is refused), a fresh
 * row is inserted.
 */
export async function recordVacationPeriod(
  userId: string,
  next: VacationWindow,
  prev: VacationWindow | null
): Promise<void> {
  try {
    if (prev && prev.starts_on === next.starts_on && prev.ends_on === next.ends_on) return
    if (prev) {
      const { data, error } = await periodsTable()
        .update({ starts_on: next.starts_on, ends_on: next.ends_on })
        .eq('user_id', userId)
        .eq('starts_on', prev.starts_on)
        .eq('ends_on', prev.ends_on)
        .select('id')
      if (!error && Array.isArray(data) && data.length > 0) return
    }
    await periodsTable().insert({
      user_id: userId,
      starts_on: next.starts_on,
      ends_on: next.ends_on,
    })
  } catch {
    // Best-effort: see module comment.
  }
}

/**
 * Keep history truthful when a vacation is ended early: the row stays, but it
 * records the vacation actually taken. A window that never started is removed
 * entirely; one that covers today is trimmed to end yesterday; one already in
 * the past is left alone.
 */
export async function trimVacationHistory(
  userId: string,
  window: VacationWindow
): Promise<void> {
  try {
    const today = formatLocalDate(new Date())
    if (window.ends_on < today) return // already over: history is accurate

    if (window.starts_on >= today) {
      // Never got a completed day: drop the row entirely.
      await periodsTable()
        .delete()
        .eq('user_id', userId)
        .eq('starts_on', window.starts_on)
        .eq('ends_on', window.ends_on)
      return
    }

    const yesterday = parseLocalDate(today)
    yesterday.setDate(yesterday.getDate() - 1)
    await periodsTable()
      .update({ ends_on: formatLocalDate(yesterday) })
      .eq('user_id', userId)
      .eq('starts_on', window.starts_on)
      .eq('ends_on', window.ends_on)
  } catch {
    // Best-effort: see module comment.
  }
}
