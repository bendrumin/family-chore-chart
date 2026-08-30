import 'server-only'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { apnsConfigured, sendApnsAlert, type ApnsCustomData } from '@/lib/push/apns'
import { dueOn } from '@/lib/utils/schedule'

/**
 * Domain-level push notifications.
 *
 * Everything here is fire-and-forget by contract: callers `void` these
 * promises. A push failure — misconfigured key, dead token, APNs outage —
 * must never surface in the API response that triggered it. A kid completing
 * a routine has completed the routine; the parent's phone buzzing is a bonus.
 */

async function isActivityPushEnabled(userId: string): Promise<boolean> {
  try {
    const admin = createServiceRoleClient()
    const { data } = await admin
      .from('family_settings')
      .select('activity_push_enabled')
      .eq('user_id', userId)
      .maybeSingle()
    // Missing row or pre-migration DB → keep buzzing (default-on).
    return data?.activity_push_enabled !== false
  } catch {
    return true
  }
}

/** Send an alert to every registered device of one parent account. */
export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  custom?: ApnsCustomData
): Promise<void> {
  if (!apnsConfigured()) return

  try {
    if (!(await isActivityPushEnabled(userId))) {
      console.log(`[push] activity push disabled for user ${userId}`)
      return
    }

    const admin = createServiceRoleClient()
    // Not in the generated types (same as testflight_waitlist) — cast, per the
    // established pattern.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tokens } = (await (admin as any)
      .from('device_push_tokens')
      .select('token, environment')
      .eq('user_id', userId)) as { data: { token: string; environment: string }[] | null }

    if (!tokens || tokens.length === 0) {
      console.log(`[push] no device tokens registered for user ${userId}`)
      return
    }

    for (const t of tokens) {
      const env = t.environment === 'development' ? 'development' : 'production'
      const result = await sendApnsAlert(t.token, env, title, body, custom)
      if (result.tokenGone) {
        // Dead tokens accumulate forever otherwise — every future send would
        // retry them. APNs told us it's gone; believe it.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (admin as any).from('device_push_tokens').delete().eq('token', t.token)
      }
    }
  } catch (error) {
    console.error('[push] sendPushToUser failed:', error)
  }
}

/** "🎉 Bayla finished Morning Routine!" — the flagship trigger. */
export async function notifyRoutineCompleted(childId: string, routineName: string): Promise<void> {
  if (!apnsConfigured()) {
    console.log('[push] APNs env not configured; skipping notify')
    return
  }
  try {
    const admin = createServiceRoleClient()
    const { data: child } = await admin
      .from('children')
      .select('name, user_id')
      .eq('id', childId)
      .maybeSingle()
    if (!child) return
    await sendPushToUser(
      child.user_id,
      '🎉 Routine complete!',
      `${child.name} finished ${routineName}!`,
      { type: 'routine_complete', childId }
    )
  } catch (error) {
    console.error('[push] notifyRoutineCompleted failed:', error)
  }
}

/** APNs category the iOS app registers with an Approve action button. */
export const CHORE_APPROVAL_CATEGORY = 'CHORE_APPROVAL'

/**
 * A kid's tick is waiting for a parent (approval mode, or a chore that asks
 * for a photo). One alert per tick: the whole point is that the parent looks.
 */
export async function notifyPendingApproval(
  childId: string,
  choreName: string,
  completionId: string,
  hasPhoto: boolean
): Promise<void> {
  if (!apnsConfigured()) return
  try {
    const admin = createServiceRoleClient()
    const { data: child } = await admin
      .from('children')
      .select('name, user_id')
      .eq('id', childId)
      .maybeSingle()
    if (!child) return
    await sendPushToUser(
      child.user_id,
      hasPhoto ? '📸 Needs your OK' : '⏳ Needs your OK',
      `${child.name} finished ${choreName}${hasPhoto ? ' and sent a photo' : ''}`,
      { type: 'chore_approval', childId, completionId, category: CHORE_APPROVAL_CATEGORY }
    )
  } catch (error) {
    console.error('[push] notifyPendingApproval failed:', error)
  }
}

/**
 * After a kid checks a chore off: if that completed their whole list for the
 * day, tell the parent. Per-chore pings would be noise; "finished everything"
 * is the moment worth a buzz — and on the flat daily rate it is exactly the
 * moment the day's money is earned.
 */
export async function notifyIfAllChoresDone(
  childId: string,
  weekStart: string,
  dayOfWeek: number
): Promise<void> {
  if (!apnsConfigured()) {
    console.log('[push] APNs env not configured; skipping notify')
    return
  }
  try {
    const admin = createServiceRoleClient()

    const { data: chores } = await admin
      .from('chores')
      .select('id, days_of_week')
      .eq('child_id', childId)
      .eq('is_active', true)
    // "The whole list" is the chores due on this day of the week.
    const due = dueOn(chores ?? [], dayOfWeek)
    if (due.length === 0) return

    const { data: completions } = await admin
      .from('chore_completions')
      .select('chore_id, status')
      .in('chore_id', due.map(c => c.id))
      .eq('week_start', weekStart)
      .eq('day_of_week', dayOfWeek)

    // Membership, not row count — duplicate completion rows must not fake a
    // finished day (same rule as lib/utils/earnings.ts isPerfectDay). Ticks
    // still waiting for approval do not finish the day.
    const done = new Set(
      (completions ?? [])
        .filter(c => !c.status || c.status === 'approved')
        .map(c => c.chore_id)
    )
    if (!due.every(c => done.has(c.id))) return

    const { data: child } = await admin
      .from('children')
      .select('name, user_id')
      .eq('id', childId)
      .maybeSingle()
    if (!child) return

    await sendPushToUser(
      child.user_id,
      '🌟 All chores done!',
      `${child.name} finished every chore for today!`,
      { type: 'all_chores_done', childId }
    )
  } catch (error) {
    console.error('[push] notifyIfAllChoresDone failed:', error)
  }
}
