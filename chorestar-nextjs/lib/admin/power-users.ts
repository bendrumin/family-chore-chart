import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import type { PowerUserReport, PowerUserStat } from '@/lib/admin/types'

export type { PowerUserReport, PowerUserStat } from '@/lib/admin/types'

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
}

type TableName = keyof Database['public']['Tables']

async function fetchAll<T>(admin: SupabaseClient<Database>, table: TableName, select: string) {
  const rows: T[] = []
  let from = 0
  const pageSize = 1000
  while (true) {
    const { data, error } = await admin.from(table).select(select).range(from, from + pageSize - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    if (!data?.length) break
    rows.push(...(data as unknown as T[]))
    if (data.length < pageSize) break
    from += pageSize
  }
  return rows
}

async function fetchAuthUsers(admin: SupabaseClient<Database>) {
  const users = []
  let page = 1
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(`auth.admin.listUsers: ${error.message}`)
    users.push(...data.users)
    if (data.users.length < 1000) break
    page++
  }
  return users
}

export async function analyzePowerUsers(admin: SupabaseClient<Database>): Promise<PowerUserReport> {
  const [profiles, children, chores, choreCompletions, routines, routineCompletions, badges, childPins, kidSessions, authUsers] =
    await Promise.all([
      fetchAll<{ id: string; email: string; family_name: string; subscription_type: string; created_at: string; updated_at: string }>(admin, 'profiles', 'id, email, family_name, subscription_type, created_at, updated_at'),
      fetchAll<{ id: string; user_id: string; name: string; created_at: string }>(admin, 'children', 'id, user_id, name, created_at'),
      fetchAll<{ id: string; child_id: string; is_active: boolean }>(admin, 'chores', 'id, child_id, is_active'),
      fetchAll<{ id: string; chore_id: string; completed_at: string }>(admin, 'chore_completions', 'id, chore_id, completed_at'),
      fetchAll<{ id: string; child_id: string; is_active: boolean }>(admin, 'routines', 'id, child_id, is_active'),
      fetchAll<{ id: string; child_id: string; routine_id: string; completed_at: string; date: string }>(admin, 'routine_completions', 'id, child_id, routine_id, completed_at, date'),
      fetchAll<{ id: string; child_id: string; badge_type: string; earned_at: string }>(admin, 'achievement_badges', 'id, child_id, badge_type, earned_at'),
      fetchAll<{ child_id: string; created_at: string }>(admin, 'child_pins', 'child_id, created_at'),
      fetchAll<{ child_id: string; created_at: string }>(admin, 'kid_sessions', 'child_id, created_at'),
      fetchAuthUsers(admin),
    ])

  const authById = new Map(authUsers.map((u) => [u.id, u]))
  const childrenByUser = new Map<string, typeof children>()
  for (const child of children) {
    const list = childrenByUser.get(child.user_id) || []
    list.push(child)
    childrenByUser.set(child.user_id, list)
  }

  const childToUser = new Map(children.map((c) => [c.id, c.user_id]))
  const choreToChild = new Map(chores.map((c) => [c.id, c.child_id]))
  const statsByUser = new Map<string, PowerUserStat>()

  function ensure(userId: string): PowerUserStat {
    if (!statsByUser.has(userId)) {
      const profile = profiles.find((p) => p.id === userId)
      const auth = authById.get(userId)
      statsByUser.set(userId, {
        userId,
        email: profile?.email || auth?.email || '',
        familyName: profile?.family_name || 'Unknown',
        subscription: profile?.subscription_type || 'free',
        signedUpAt: profile?.created_at || auth?.created_at || null,
        lastSignInAt: auth?.last_sign_in_at || null,
        childCount: 0,
        activeChoreCount: 0,
        routineCount: 0,
        choreCompletions: 0,
        routineCompletions: 0,
        badgesEarned: 0,
        kidPinsSet: 0,
        kidLogins: 0,
        lastChoreActivity: null,
        lastRoutineActivity: null,
        lastKidLogin: null,
        activityScore: 0,
        tenureDays: daysSince(profile?.created_at || auth?.created_at),
        daysSinceLastSignIn: daysSince(auth?.last_sign_in_at),
        lastActivityAt: null,
        daysSinceLastActivity: null,
        engagementTier: 'dormant',
        usesKidLogin: false,
        usesRoutines: false,
      })
    }
    return statsByUser.get(userId)!
  }

  for (const profile of profiles) ensure(profile.id)

  for (const [userId, kids] of childrenByUser) {
    ensure(userId).childCount = kids.length
  }

  for (const chore of chores) {
    const userId = childToUser.get(chore.child_id)
    if (!userId) continue
    const s = ensure(userId)
    if (chore.is_active) s.activeChoreCount++
  }

  for (const routine of routines) {
    const userId = childToUser.get(routine.child_id)
    if (!userId) continue
    const s = ensure(userId)
    if (routine.is_active) s.routineCount++
  }

  for (const cc of choreCompletions) {
    const childId = choreToChild.get(cc.chore_id)
    const userId = childId ? childToUser.get(childId) : undefined
    if (!userId) continue
    const s = ensure(userId)
    s.choreCompletions++
    if (!s.lastChoreActivity || cc.completed_at > s.lastChoreActivity) {
      s.lastChoreActivity = cc.completed_at
    }
  }

  for (const rc of routineCompletions) {
    const userId = childToUser.get(rc.child_id)
    if (!userId) continue
    const s = ensure(userId)
    s.routineCompletions++
    if (!s.lastRoutineActivity || rc.completed_at > s.lastRoutineActivity) {
      s.lastRoutineActivity = rc.completed_at
    }
  }

  for (const badge of badges) {
    const userId = childToUser.get(badge.child_id)
    if (!userId) continue
    ensure(userId).badgesEarned++
  }

  for (const pin of childPins) {
    const userId = childToUser.get(pin.child_id)
    if (!userId) continue
    ensure(userId).kidPinsSet++
  }

  for (const session of kidSessions) {
    const userId = childToUser.get(session.child_id)
    if (!userId) continue
    const s = ensure(userId)
    s.kidLogins++
    if (!s.lastKidLogin || session.created_at > s.lastKidLogin) {
      s.lastKidLogin = session.created_at
    }
  }

  const allStats = [...statsByUser.values()].map((s) => {
    const lastActivity = [s.lastChoreActivity, s.lastRoutineActivity, s.lastKidLogin, s.lastSignInAt]
      .filter(Boolean)
      .sort()
      .pop() || null

    s.lastActivityAt = lastActivity
    s.daysSinceLastActivity = daysSince(lastActivity)
    s.activityScore =
      s.choreCompletions +
      s.routineCompletions * 3 +
      s.badgesEarned * 5 +
      s.kidLogins * 0.5 +
      s.routineCount * 10 +
      s.kidPinsSet * 15 +
      s.childCount * 5

    s.engagementTier =
      s.activityScore >= 100 ? 'power' :
      s.activityScore >= 30 ? 'active' :
      s.activityScore >= 5 ? 'light' : 'dormant'

    s.usesKidLogin = s.kidPinsSet > 0
    s.usesRoutines = s.routineCount > 0 && s.routineCompletions > 0

    return s
  })

  const withActivity = allStats.filter((s) => s.choreCompletions > 0 || s.routineCompletions > 0 || s.kidLogins > 0)

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      profiles: profiles.length,
      authUsers: authUsers.length,
      withAnyActivity: withActivity.length,
      powerUsers: allStats.filter((s) => s.engagementTier === 'power').length,
      activeUsers: allStats.filter((s) => s.engagementTier === 'active').length,
      lightUsers: allStats.filter((s) => s.engagementTier === 'light').length,
      dormantUsers: allStats.filter((s) => s.engagementTier === 'dormant').length,
      usesKidLogin: allStats.filter((s) => s.usesKidLogin).length,
      usesRoutines: allStats.filter((s) => s.usesRoutines).length,
      premiumOrLifetime: allStats.filter((s) => s.subscription === 'premium' || s.subscription === 'lifetime').length,
    },
    topByActivity: [...withActivity].sort((a, b) => b.activityScore - a.activityScore).slice(0, 15),
    topByTenure: [...allStats].sort((a, b) => (b.tenureDays || 0) - (a.tenureDays || 0)).slice(0, 15),
    champions: [...withActivity]
      .filter((s) => (s.tenureDays || 0) >= 30 && s.activityScore >= 30)
      .sort((a, b) => b.activityScore - a.activityScore),
    recentlyActive: [...withActivity]
      .filter((s) => (s.daysSinceLastActivity ?? 999) <= 14)
      .sort((a, b) => b.activityScore - a.activityScore)
      .slice(0, 15),
    atRiskLoyal: [...allStats]
      .filter((s) => (s.tenureDays || 0) >= 60 && (s.daysSinceLastActivity ?? 999) > 30)
      .sort((a, b) => (b.tenureDays || 0) - (a.tenureDays || 0))
      .slice(0, 10),
    allUsers: allStats.sort((a, b) => b.activityScore - a.activityScore),
  }
}
