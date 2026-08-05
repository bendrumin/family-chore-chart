import 'server-only'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { apnsConfigured, sendApnsAlert } from '@/lib/push/apns'

/**
 * Domain-level push notifications.
 *
 * Everything here is fire-and-forget by contract: callers `void` these
 * promises. A push failure — misconfigured key, dead token, APNs outage —
 * must never surface in the API response that triggered it. A kid completing
 * a routine has completed the routine; the parent's phone buzzing is a bonus.
 */

/** Send an alert to every registered device of one parent account. */
export async function sendPushToUser(userId: string, title: string, body: string): Promise<void> {
  if (!apnsConfigured()) return

  try {
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
      const result = await sendApnsAlert(t.token, env, title, body)
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
    await sendPushToUser(child.user_id, '🎉 Routine complete!', `${child.name} finished ${routineName}!`)
  } catch (error) {
    console.error('[push] notifyRoutineCompleted failed:', error)
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
      .select('id')
      .eq('child_id', childId)
      .eq('is_active', true)
    if (!chores || chores.length === 0) return

    const { data: completions } = await admin
      .from('chore_completions')
      .select('chore_id')
      .in('chore_id', chores.map(c => c.id))
      .eq('week_start', weekStart)
      .eq('day_of_week', dayOfWeek)

    // Membership, not row count — duplicate completion rows must not fake a
    // finished day (same rule as lib/utils/earnings.ts isPerfectDay).
    const done = new Set((completions ?? []).map(c => c.chore_id))
    if (!chores.every(c => done.has(c.id))) return

    const { data: child } = await admin
      .from('children')
      .select('name, user_id')
      .eq('id', childId)
      .maybeSingle()
    if (!child) return

    await sendPushToUser(
      child.user_id,
      '🌟 All chores done!',
      `${child.name} finished every chore for today!`
    )
  } catch (error) {
    console.error('[push] notifyIfAllChoresDone failed:', error)
  }
}
