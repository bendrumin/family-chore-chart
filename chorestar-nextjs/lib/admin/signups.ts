import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

/**
 * The admin Signups tab: who signed up, how, from where, and whether they got
 * going. Reads profiles.signup_source (migration 021, so only accounts from
 * 2026-09-14 on carry it) joined to auth users for the sign-in method and
 * last sign-in, and to children/chores for activation.
 *
 * The labeling rules are pure (sourceLabel, methodOf, dailyCounts) so
 * signups.test.ts covers them without Supabase.
 */

export interface SignupRow {
  userId: string
  email: string
  familyName: string
  createdAt: string
  lastSignInAt: string | null
  plan: string
  platform: string
  method: string
  source: string
  landing: string | null
  kids: number
  choresDone: number
}

export interface SignupsReport {
  generatedAt: string
  counts: { today: number; d7: number; d30: number; activated30: number }
  /** Oldest first, one entry per local (America/Chicago) day, zero-filled. */
  daily: { date: string; count: number }[]
  /** Last 30 days, attributed signups only; each sorted by count, largest first. */
  byPlatform: { label: string; count: number }[]
  byMethod: { label: string; count: number }[]
  bySource: { label: string; count: number }[]
  attributedSince: string | null
  recent: SignupRow[]
}

type Source = Record<string, string> | null | undefined

const PLATFORM_LABELS: Record<string, string> = { web: 'Web', ios_app: 'iOS app', android_app: 'Android app' }
const METHOD_LABELS: Record<string, string> = { email: 'Email', apple: 'Apple', google: 'Google' }

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** Where a signup came from: a UTM tag, else the referring site, else direct. */
export function sourceLabel(s: Source): string {
  if (!s) return 'Not recorded'
  if (s.utm_source) return s.utm_source.replace(/^www\./, '')
  if (s.referrer) {
    const h = host(s.referrer)
    // The Android Reddit app sends its package name as the referrer.
    return h === 'com.reddit.frontpage' ? 'reddit.com (app)' : h
  }
  // The iOS app sends no referrer or landing page: there is no web visit to attribute.
  if (s.platform === 'ios_app') return 'In the iOS app'
  return 'Direct'
}

/**
 * How the account was created. signup_source.method exists from 2026-10-01;
 * before that, fall back to the auth user's first provider.
 */
export function methodOf(s: Source, authProvider: string | undefined): string {
  const m = s?.method || authProvider || 'email'
  return METHOD_LABELS[m] ?? m
}

export function platformOf(s: Source): string {
  return s?.platform ? PLATFORM_LABELS[s.platform] ?? s.platform : 'Not recorded'
}

/** Local calendar day, so a signup at 9pm Central isn't filed under tomorrow. */
export function localDay(iso: string, timeZone = 'America/Chicago'): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone })
}

/** Zero-filled counts for the `days` days ending today, oldest first. */
export function dailyCounts(createdAts: string[], days: number, now = new Date(), timeZone = 'America/Chicago') {
  const out: { date: string; count: number }[] = []
  const index = new Map<string, number>()
  for (let i = days - 1; i >= 0; i--) {
    const date = localDay(new Date(now.getTime() - i * 86400000).toISOString(), timeZone)
    if (index.has(date)) continue
    index.set(date, out.length)
    out.push({ date, count: 0 })
  }
  for (const iso of createdAts) {
    const i = index.get(localDay(iso, timeZone))
    if (i !== undefined) out[i].count++
  }
  return out
}

export function tally(labels: string[]): { label: string; count: number }[] {
  const m = new Map<string, number>()
  for (const l of labels) m.set(l, (m.get(l) ?? 0) + 1)
  return [...m.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

async function fetchAll<T>(admin: SupabaseClient<Database>, table: keyof Database['public']['Tables'], select: string) {
  const rows: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin.from(table).select(select).range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    rows.push(...((data ?? []) as unknown as T[]))
    if (!data || data.length < 1000) return rows
  }
}

export async function collectSignups(admin: SupabaseClient<Database>, recentLimit = 50): Promise<SignupsReport> {
  type ProfileRow = { id: string; email: string; family_name: string; subscription_type: string; created_at: string; signup_source: Source }
  const [profiles, children, chores, completions] = await Promise.all([
    // signup_source (migration 021) is not in the generated types.
    fetchAll<ProfileRow>(admin, 'profiles', 'id, email, family_name, subscription_type, created_at, signup_source'),
    fetchAll<{ id: string; user_id: string }>(admin, 'children', 'id, user_id'),
    fetchAll<{ id: string; child_id: string }>(admin, 'chores', 'id, child_id'),
    fetchAll<{ chore_id: string }>(admin, 'chore_completions', 'chore_id'),
  ])
  const authUsers: { id: string; last_sign_in_at?: string | null; app_metadata?: Record<string, unknown> }[] = []
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(`listUsers: ${error.message}`)
    authUsers.push(...data.users)
    if (data.users.length < 1000) break
  }

  const auth = new Map(authUsers.map((u) => [u.id, u]))
  const kidsByUser = new Map<string, number>()
  const ownerOfChild = new Map<string, string>()
  for (const c of children) {
    kidsByUser.set(c.user_id, (kidsByUser.get(c.user_id) ?? 0) + 1)
    ownerOfChild.set(c.id, c.user_id)
  }
  const ownerOfChore = new Map(chores.map((c) => [c.id, ownerOfChild.get(c.child_id)]))
  const doneByUser = new Map<string, number>()
  for (const c of completions) {
    const owner = ownerOfChore.get(c.chore_id)
    if (owner) doneByUser.set(owner, (doneByUser.get(owner) ?? 0) + 1)
  }

  const rows: SignupRow[] = profiles
    .map((p) => {
      const a = auth.get(p.id)
      return {
        userId: p.id,
        email: p.email,
        familyName: p.family_name,
        createdAt: p.created_at,
        lastSignInAt: a?.last_sign_in_at ?? null,
        plan: p.subscription_type,
        platform: platformOf(p.signup_source),
        method: methodOf(p.signup_source, a?.app_metadata?.provider as string | undefined),
        source: sourceLabel(p.signup_source),
        landing: p.signup_source?.landing ?? null,
        kids: kidsByUser.get(p.id) ?? 0,
        choresDone: doneByUser.get(p.id) ?? 0,
      }
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

  const now = Date.now()
  const within = (r: SignupRow, days: number) => now - new Date(r.createdAt).getTime() <= days * 86400000
  const last30 = rows.filter((r) => within(r, 30))
  const today = localDay(new Date(now).toISOString())
  const attributed30 = last30.filter((r) => r.platform !== 'Not recorded')
  const attributedSince = profiles
    .filter((p) => p.signup_source)
    .map((p) => p.created_at)
    .sort()[0] ?? null

  return {
    generatedAt: new Date().toISOString(),
    counts: {
      today: rows.filter((r) => localDay(r.createdAt) === today).length,
      d7: rows.filter((r) => within(r, 7)).length,
      d30: last30.length,
      activated30: last30.filter((r) => r.kids > 0).length,
    },
    daily: dailyCounts(last30.map((r) => r.createdAt), 30, new Date(now)),
    byPlatform: tally(attributed30.map((r) => r.platform)),
    byMethod: tally(last30.map((r) => r.method)),
    bySource: tally(attributed30.map((r) => r.source)),
    attributedSince,
    recent: rows.slice(0, recentLimit),
  }
}
