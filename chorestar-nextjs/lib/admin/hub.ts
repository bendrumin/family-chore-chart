import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

/** ChoreStar's growth numbers for the admin dashboard. */
export interface ProductMetrics {
  product: 'chorestar'
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
