import { NextResponse } from 'next/server'
import { isCronAuthorized } from '@/lib/utils/cron-auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { isPremium } from '@/lib/utils/subscription'
import { sendPushToUser } from '@/lib/push/notify'
import { LAPSE_MAX_DAYS, fallbackPush, lapseDue, nextFeature, withinRange } from '@/lib/engagement/discovery'
import { fetchAll, loadFamilies, loadLastActivity } from '@/lib/engagement/usage'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * GET /api/cron/lapse-nudge (Vercel Cron, daily; vercel.json)
 *
 * One push to a family that was active and then went quiet for a week,
 * leading with something they have not tried yet rather than "we miss you".
 * Two October 2026 cancellations had stopped opening the app weeks before
 * they turned off renewal, and nothing noticed. Rules, all in
 * lib/engagement/discovery.ts:
 *
 *   - quiet 7 to 30 days (longer is gone, and a push from nowhere reads as spam)
 *   - once per lapse, tracked in family_settings.lapse_nudged_at
 *   - never during vacation mode, which promises "alerts quiet"
 *   - only features the family's plan includes, and never Star Pets by push,
 *     since the iOS app does not have them yet
 *
 * sendPushToUser already honours the parent's activity-push setting and
 * no-ops for a family without a registered device.
 *
 * ?dry=1 reports who would be nudged and with what, and sends nothing.
 */
export async function GET(request: Request) {
  if (!isCronAuthorized(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const dry = new URL(request.url).searchParams.get('dry') === '1'
  const admin = createServiceRoleClient() as any
  const now = new Date()
  const today = now.toISOString().slice(0, 10)

  const families = await loadFamilies(admin)
  const lastActivity = await loadLastActivity(admin, families, new Date(now.getTime() - (LAPSE_MAX_DAYS + 1) * 86_400_000))

  const [settings, profiles, vacations] = await Promise.all([
    fetchAll<any>((from, to) => admin.from('family_settings').select('user_id, lapse_nudged_at, vacation_starts_on, vacation_ends_on').range(from, to)),
    fetchAll<any>((from, to) => admin.from('profiles').select('id, subscription_type').range(from, to)),
    fetchAll<any>((from, to) => admin.from('vacation_periods').select('user_id, starts_on, ends_on').range(from, to)),
  ])
  const settingsBy = new Map(settings.map((s: any) => [s.user_id, s]))
  const tierBy = new Map(profiles.map((p: any) => [p.id, p.subscription_type]))
  const onVacation = (ownerId: string) => {
    const s: any = settingsBy.get(ownerId)
    if (s && withinRange(today, s.vacation_starts_on, s.vacation_ends_on)) return true
    return vacations.some((v: any) => v.user_id === ownerId && withinRange(today, v.starts_on, v.ends_on))
  }

  const results: { family: string; daysQuiet: number | null; feature: string; result: string }[] = []
  for (const [ownerId, last] of lastActivity) {
    const s: any = settingsBy.get(ownerId)
    const { due, daysQuiet } = lapseDue({
      lastActivity: last,
      lastNudged: s?.lapse_nudged_at ? new Date(s.lapse_nudged_at) : null,
      now,
      onVacation: onVacation(ownerId),
    })
    if (!due) continue

    const family = families.get(ownerId)!
    const kid = family.kidName ?? 'Your kids'
    const feature = nextFeature(family.usage, isPremium(tierBy.get(ownerId)), 'push')
    const message = feature ? feature.push(kid) : fallbackPush(kid)
    const label = feature?.id ?? 'fallback'

    if (dry) {
      results.push({ family: ownerId, daysQuiet, feature: label, result: `would send: ${message.title}` })
      continue
    }
    try {
      await sendPushToUser(ownerId, message.title, message.body)
      // Marked even when the family has no device: the decision is "nudged
      // this lapse", and retrying daily for a family we cannot reach is noise.
      await admin.from('family_settings').upsert({ user_id: ownerId, lapse_nudged_at: now.toISOString() }, { onConflict: 'user_id' })
      results.push({ family: ownerId, daysQuiet, feature: label, result: 'sent' })
    } catch (err) {
      console.error('[lapse-nudge]', ownerId, err)
      results.push({ family: ownerId, daysQuiet, feature: label, result: 'failed' })
    }
  }

  return NextResponse.json({ dry, activeInWindow: lastActivity.size, nudged: results.length, results })
}
