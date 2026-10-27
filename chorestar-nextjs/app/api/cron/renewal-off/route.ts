import { NextResponse } from 'next/server'
import { isCronAuthorized } from '@/lib/utils/cron-auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { deferredDue, sendRenewalOffEmail } from '@/lib/engagement/renewal-off'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * GET /api/cron/renewal-off (Vercel Cron, daily; vercel.json)
 *
 * Sends the "before you go" emails the Apple notification handler held back:
 * families who turned renewal off right after buying (or during a free
 * trial) hear from us a few days before Premium actually ends, not minutes
 * after paying. Skips anyone who turned renewal back on, or renewed, since.
 * sendRenewalOffEmail sends once per family.
 *
 * ?dry=1 lists who is due without sending.
 */
export async function GET(request: Request) {
  if (!isCronAuthorized(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const dry = new URL(request.url).searchParams.get('dry') === '1'
  const admin = createServiceRoleClient() as any
  const now = new Date()
  const since = new Date(now.getTime() - 60 * 86_400_000).toISOString()

  const { data: deferred, error } = await admin
    .from('apple_notifications')
    .select('user_id, created_at, expires_at')
    .eq('environment', 'Production')
    .eq('action', 'renewal-off-email:deferred')
    .gte('created_at', since)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Latest deferral per family.
  const latest = new Map<string, { created_at: string; expires_at: string | null }>()
  for (const row of deferred ?? []) {
    if (!row.user_id) continue
    const prev = latest.get(row.user_id)
    if (!prev || row.created_at > prev.created_at) latest.set(row.user_id, row)
  }

  const results: { family: string; result: string }[] = []
  for (const [userId, row] of latest) {
    if (!row.expires_at || !deferredDue(new Date(row.expires_at), now)) continue
    // Turned renewal back on, or renewed, after deferring: not leaving.
    const { data: later } = await admin
      .from('apple_notifications')
      .select('notification_type, subtype')
      .eq('user_id', userId)
      .gt('created_at', row.created_at)
    const cameBack = (later ?? []).some(
      (n: { notification_type: string; subtype: string | null }) =>
        n.subtype === 'AUTO_RENEW_ENABLED' || n.notification_type === 'DID_RENEW'
    )
    if (cameBack) {
      results.push({ family: userId, result: 'renewal back on' })
      continue
    }
    results.push({ family: userId, result: dry ? 'would send' : await sendRenewalOffEmail(admin, userId, new Date(row.expires_at)) })
  }

  return NextResponse.json({ dry, deferred: latest.size, results })
}
