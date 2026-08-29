import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

/** One product's growth numbers, shaped the same for every product. */
export interface ProductMetrics {
  product: 'chorestar' | 'kidcanvas'
  generatedAt: string
  users: { total: number; new7: number; new30: number; active7: number }
  paid: { active: number }
  /** Product-specific counters, rendered as extra rows. */
  extras: { label: string; value: number }[]
  recentSignups: { email: string; createdAt: string }[]
}

export interface HubReport {
  generatedAt: string
  chorestar: ProductMetrics
  kidcanvas: ProductMetrics | null
  kidcanvasError?: string
}

const DAY = 24 * 60 * 60 * 1000

export async function collectChoreStarMetrics(admin: SupabaseClient<Database>): Promise<ProductMetrics> {
  const d7 = new Date(Date.now() - 7 * DAY).toISOString()
  const d30 = new Date(Date.now() - 30 * DAY).toISOString()
  const since = (iso: string | null | undefined, floor: string) => !!iso && iso >= floor

  type Table = keyof Database['public']['Tables']
  const count = async (table: Table, column?: string, floor?: string, extra?: (q: any) => any) => {
    let q: any = admin.from(table).select('*', { count: 'exact', head: true })
    if (column && floor) q = q.gte(column, floor)
    if (extra) q = extra(q)
    const { count: n, error } = await q
    if (error) throw new Error(`${table}: ${error.message}`)
    return (n as number | null) ?? 0
  }

  const users: { id: string; email?: string; created_at: string; last_sign_in_at?: string | null }[] = []
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(`listUsers: ${error.message}`)
    users.push(...data.users)
    if (data.users.length < 1000) break
  }

  const [premium, children, activeChores, completions7, routinesDone7] = await Promise.all([
    count('profiles', undefined, undefined, (q) => q.neq('subscription_type', 'free')),
    count('children'),
    count('chores', undefined, undefined, (q) => q.eq('is_active', true)),
    count('chore_completions', 'completed_at', d7),
    count('routine_completions', 'completed_at', d7),
  ])

  const recentSignups = [...users]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 10)
    .map((u) => ({ email: u.email ?? '', createdAt: u.created_at }))

  return {
    product: 'chorestar',
    generatedAt: new Date().toISOString(),
    users: {
      total: users.length,
      new7: users.filter((u) => since(u.created_at, d7)).length,
      new30: users.filter((u) => since(u.created_at, d30)).length,
      active7: users.filter((u) => since(u.last_sign_in_at, d7)).length,
    },
    paid: { active: premium },
    extras: [
      { label: 'Kids', value: children },
      { label: 'Active chores', value: activeChores },
      { label: 'Chores done, 7d', value: completions7 },
      { label: 'Routines done, 7d', value: routinesDone7 },
    ],
    recentSignups,
  }
}

/** Server-to-server read of KidCanvas's metrics feed, guarded by the shared token. */
export async function fetchKidCanvasMetrics(): Promise<{ metrics: ProductMetrics | null; error?: string }> {
  const token = process.env.HUB_METRICS_TOKEN
  if (!token) return { metrics: null, error: 'HUB_METRICS_TOKEN is not set' }
  try {
    const res = await fetch('https://kidcanvas.app/api/admin/metrics', {
      headers: { 'x-hub-token': token },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return { metrics: null, error: `KidCanvas responded ${res.status}` }
    const k = await res.json()
    return {
      metrics: {
        product: 'kidcanvas',
        generatedAt: k.generatedAt,
        users: k.users,
        paid: k.paid,
        extras: [
          { label: 'Families', value: k.families?.total ?? 0 },
          { label: 'New families, 7d', value: k.families?.new7 ?? 0 },
          { label: 'Artworks', value: k.artworks?.total ?? 0 },
          { label: 'Artworks, 7d', value: k.artworks?.new7 ?? 0 },
        ],
        recentSignups: k.recentSignups ?? [],
      },
    }
  } catch (err) {
    return { metrics: null, error: err instanceof Error ? err.message : 'KidCanvas unreachable' }
  }
}
