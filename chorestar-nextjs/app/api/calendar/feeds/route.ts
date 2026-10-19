import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getParentUserId } from '@/lib/utils/parent-auth'
import { getEffectiveFamilyId } from '@/lib/utils/family'
import { familyIsPremium } from '@/lib/utils/wallet'
import { feedUrls, isValidTimeZone } from '@/lib/calendar/ics'

/**
 * Manage the family calendar feeds (Premium, migration 033). Owners and
 * co-parents alike: the family is resolved from the signed-in parent, and the
 * service role reads and writes (RLS on calendar_feeds is owner-only).
 *
 *   GET                                  -> { premium, children, feeds }
 *   POST   { childId: uuid | null, timeZone? }  -> turn on, or regenerate (new
 *          token; the old URL stops working at once). Premium only.
 *   DELETE ?childId=<uuid>|family        -> turn off. Always allowed.
 */

export const dynamic = 'force-dynamic'

interface FeedDbRow {
  child_id: string | null
  token: string
  created_at: string
  last_fetched_at: string | null
}

function baseUrlFrom(request: Request): string {
  const host = request.headers.get('host')
  if (!host) return process.env.NEXT_PUBLIC_APP_URL || 'https://chorestar.app'
  return host.includes('localhost') || host.includes('127.0.0.1') ? `http://${host}` : `https://${host}`
}

function present(request: Request, row: FeedDbRow) {
  return {
    childId: row.child_id,
    ...feedUrls(baseUrlFrom(request), row.token),
    createdAt: row.created_at,
    lastFetchedAt: row.last_fetched_at,
  }
}

async function resolveFamily(request: Request) {
  const userId = await getParentUserId(request)
  if (!userId) return null
  const admin = createServiceRoleClient() as any
  const { effectiveUserId: ownerId } = await getEffectiveFamilyId(admin, userId)
  return { userId, ownerId, admin }
}

export async function GET(request: Request) {
  const ctx = await resolveFamily(request)
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { ownerId, admin } = ctx

  const [premium, { data: children }, { data: feeds, error }] = await Promise.all([
    familyIsPremium(ownerId),
    admin.from('children').select('id, name').eq('user_id', ownerId).order('created_at', { ascending: true }),
    admin.from('calendar_feeds').select('child_id, token, created_at, last_fetched_at').eq('family_id', ownerId),
  ])
  if (error) {
    // Pre-033 database: the table doesn't exist yet.
    console.error('[calendar/feeds] list failed:', error.message)
    return NextResponse.json({ error: 'Calendar feeds are not available yet' }, { status: 503 })
  }
  return NextResponse.json({
    premium,
    children: children ?? [],
    feeds: ((feeds ?? []) as FeedDbRow[]).map(f => present(request, f)),
  })
}

const postSchema = z.object({
  childId: z.string().uuid().nullable(),
  timeZone: z.string().max(64).optional().nullable(),
})

export async function POST(request: Request) {
  const ctx = await resolveFamily(request)
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { userId, ownerId, admin } = ctx

  const parsed = postSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  const { childId } = parsed.data
  const timeZone = isValidTimeZone(parsed.data.timeZone) ? parsed.data.timeZone : null

  if (!(await familyIsPremium(ownerId))) {
    return NextResponse.json({ error: 'premium_required', message: 'The calendar feed is part of Premium.' }, { status: 403 })
  }

  if (childId) {
    const { data: kid } = await admin.from('children').select('id').eq('id', childId).eq('user_id', ownerId).maybeSingle()
    if (!kid) return NextResponse.json({ error: 'That kid is not in your family' }, { status: 400 })
  }

  // 32 random bytes = 256 bits, base64url: 43 URL-safe characters.
  const token = randomBytes(32).toString('base64url')
  const fresh = {
    token,
    timezone: timeZone,
    created_by: userId,
    created_at: new Date().toISOString(),
    last_fetched_at: null,
  }

  let existingQuery = admin.from('calendar_feeds').select('id').eq('family_id', ownerId)
  existingQuery = childId ? existingQuery.eq('child_id', childId) : existingQuery.is('child_id', null)
  const { data: existing, error: findError } = await existingQuery.maybeSingle()
  if (findError) {
    console.error('[calendar/feeds] lookup failed:', findError.message)
    return NextResponse.json({ error: 'Could not save the calendar feed' }, { status: 500 })
  }

  const write = existing
    ? admin.from('calendar_feeds').update(fresh).eq('id', existing.id)
    : admin.from('calendar_feeds').insert({ ...fresh, family_id: ownerId, child_id: childId })
  const { data: row, error } = await write.select('child_id, token, created_at, last_fetched_at').single()
  if (error || !row) {
    console.error('[calendar/feeds] save failed:', error?.message)
    return NextResponse.json({ error: 'Could not save the calendar feed' }, { status: 500 })
  }
  return NextResponse.json({ feed: present(request, row as FeedDbRow), regenerated: Boolean(existing) })
}

export async function DELETE(request: Request) {
  const ctx = await resolveFamily(request)
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { ownerId, admin } = ctx

  const scope = new URL(request.url).searchParams.get('childId') ?? 'family'
  if (scope !== 'family' && !z.string().uuid().safeParse(scope).success) {
    return NextResponse.json({ error: 'Invalid childId' }, { status: 400 })
  }
  let query = admin.from('calendar_feeds').delete().eq('family_id', ownerId)
  query = scope === 'family' ? query.is('child_id', null) : query.eq('child_id', scope)
  const { error } = await query
  if (error) {
    console.error('[calendar/feeds] delete failed:', error.message)
    return NextResponse.json({ error: 'Could not turn off the calendar feed' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
