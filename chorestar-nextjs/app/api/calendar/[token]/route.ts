import { createServiceRoleClient } from '@/lib/supabase/server'
import { buildFeedCalendar, buildPremiumNeededCalendar, FEED_TOKEN_PATTERN } from '@/lib/calendar/ics'
import { feedCalendarName, toFeedInput, type FeedRow } from '@/lib/calendar/feed-input'
import { isPremium } from '@/lib/utils/subscription'
import type { VacationWindow } from '@/lib/utils/schedule'

/**
 * GET /api/calendar/<token>.ics  (Premium, migration 033)
 *
 * The family calendar feed that Apple Calendar, Google Calendar, Outlook and
 * wall calendars subscribe to. No session: the 256-bit token in the URL is the
 * credential, looked up with the service role. Unknown or revoked tokens 404.
 * A family that is no longer Premium gets a valid, empty calendar with one
 * note instead of an error, so the subscription explains itself and comes
 * back by itself on renewal.
 *
 * Calendar apps poll (Google every few hours, Apple as often as hourly), so
 * the response is short-lived and private: never cached by a CDN, where a
 * regenerated (revoked) URL could keep answering.
 */

export const dynamic = 'force-dynamic'

const HEADERS = {
  'Content-Type': 'text/calendar; charset=utf-8',
  'Content-Disposition': 'inline; filename="chorestar.ics"',
  'Cache-Control': 'private, max-age=300',
  'X-Robots-Tag': 'noindex, nofollow',
}

function notFound() {
  return new Response('Calendar feed not found. It may have been turned off or replaced in ChoreStar settings.', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  })
}

function appUrlFrom(request: Request): string {
  const host = request.headers.get('host')
  if (!host) return process.env.NEXT_PUBLIC_APP_URL || 'https://chorestar.app'
  return host.includes('localhost') || host.includes('127.0.0.1') ? `http://${host}` : `https://${host}`
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token: raw } = await params
  const token = decodeURIComponent(raw).replace(/\.ics$/i, '')
  if (!FEED_TOKEN_PATTERN.test(token)) return notFound()

  try {
    // calendar_feeds, vacation_periods and the 019/025 columns are not in the
    // generated types (CLAUDE.md, Known Gotchas).
    const admin = createServiceRoleClient() as any
    const { data: feed, error: feedError } = await admin
      .from('calendar_feeds')
      .select('id, family_id, child_id, timezone, last_fetched_at')
      .eq('token', token)
      .maybeSingle()
    if (feedError) throw feedError
    if (!feed) return notFound()
    const ownerId: string = feed.family_id
    const now = new Date()
    const appUrl = appUrlFrom(request)

    // Note when a calendar app last fetched it (shown in Settings), at most hourly.
    const last = feed.last_fetched_at ? Date.parse(feed.last_fetched_at) : 0
    if (!last || now.getTime() - last > 3_600_000) {
      await admin.from('calendar_feeds').update({ last_fetched_at: now.toISOString() }).eq('id', feed.id)
    }

    const [{ data: profile }, { data: children }] = await Promise.all([
      admin.from('profiles').select('family_name, subscription_type').eq('id', ownerId).maybeSingle(),
      admin.from('children').select('id, name').eq('user_id', ownerId).order('created_at', { ascending: true }),
    ])

    if (!isPremium(profile?.subscription_type)) {
      const child = feed.child_id ? (children ?? []).find((c: { id: string }) => c.id === feed.child_id) : null
      const body = buildPremiumNeededCalendar({ calendarName: feedCalendarName(profile?.family_name, child), now, appUrl })
      return new Response(body, { headers: HEADERS })
    }

    const kidIds: string[] = (children ?? [])
      .map((c: { id: string }) => c.id)
      .filter((id: string) => !feed.child_id || id === feed.child_id)

    const [{ data: settings }, { data: chores }, { data: routines }, vacationHistory] = await Promise.all([
      admin.from('family_settings').select('*').eq('user_id', ownerId).maybeSingle(),
      kidIds.length
        ? admin.from('chores').select('*').in('child_id', kidIds).eq('is_active', true).order('sort_order', { ascending: true, nullsFirst: false })
        : Promise.resolve({ data: [] }),
      kidIds.length
        ? admin.from('routines').select('id, child_id, name, type, reward_cents, is_active, created_at, updated_at').in('child_id', kidIds).eq('is_active', true).order('created_at', { ascending: true })
        : Promise.resolve({ data: [] }),
      // Best-effort: pre-019 databases have no table, which means no history.
      admin
        .from('vacation_periods')
        .select('starts_on, ends_on')
        .eq('user_id', ownerId)
        .then(({ data, error }: { data: VacationWindow[] | null; error: unknown }) => (error || !Array.isArray(data) ? [] : data))
        .catch(() => []) as Promise<VacationWindow[]>,
    ])

    const routineIds = (routines ?? []).map((r: { id: string }) => r.id)
    const { data: steps } = routineIds.length
      ? await admin.from('routine_steps').select('routine_id, title, order_index, duration_seconds').in('routine_id', routineIds)
      : { data: [] }

    const input = toFeedInput(
      {
        feed: feed as FeedRow,
        familyName: profile?.family_name ?? null,
        settings: settings ?? null,
        children: children ?? [],
        chores: chores ?? [],
        routines: routines ?? [],
        steps: steps ?? [],
        vacationHistory,
      },
      now,
      appUrl
    )
    return new Response(buildFeedCalendar(input), { headers: HEADERS })
  } catch (error) {
    console.error('[calendar] feed failed:', error instanceof Error ? error.message : error)
    // 503 + Retry-After: calendar apps keep the copy they have and try later.
    return new Response('Calendar feed is temporarily unavailable.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': '900', 'Cache-Control': 'no-store' },
    })
  }
}
