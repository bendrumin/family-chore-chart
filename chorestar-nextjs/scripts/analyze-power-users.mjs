#!/usr/bin/env node
/**
 * ChoreStar Power User Analysis
 * Identifies longest-tenured and most active families for outreach.
 *
 * Usage:
 *   cd chorestar-nextjs && node scripts/analyze-power-users.mjs
 *
 * Output: scripts/output/power-users-report.json (gitignored)
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { mkdirSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const appRoot = join(__dirname, '..')

config({ path: join(appRoot, '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function fetchAll(table, select, pageSize = 1000) {
  const rows = []
  let from = 0
  while (true) {
    const { data, error } = await supabase.from(table).select(select).range(from, from + pageSize - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    if (!data?.length) break
    rows.push(...data)
    if (data.length < pageSize) break
    from += pageSize
  }
  return rows
}

async function fetchAuthUsers() {
  const users = []
  let page = 1
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(`auth.admin.listUsers: ${error.message}`)
    users.push(...data.users)
    if (data.users.length < 1000) break
    page++
  }
  return users
}

function daysSince(iso) {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
}

function maskEmail(email) {
  if (!email) return ''
  const [local, domain] = email.split('@')
  if (!domain) return '***'
  const visible = local.length <= 2 ? local[0] : `${local.slice(0, 2)}***`
  return `${visible}@${domain}`
}

async function main() {
  console.log('Analyzing ChoreStar user activity...\n')

  const [profiles, children, chores, choreCompletions, routines, routineCompletions, badges, childPins, kidSessions, authUsers] =
    await Promise.all([
      fetchAll('profiles', 'id, email, family_name, subscription_type, created_at, updated_at'),
      fetchAll('children', 'id, user_id, name, created_at'),
      fetchAll('chores', 'id, child_id, is_active'),
      fetchAll('chore_completions', 'id, chore_id, completed_at'),
      fetchAll('routines', 'id, child_id, is_active'),
      fetchAll('routine_completions', 'id, child_id, routine_id, completed_at, date'),
      fetchAll('achievement_badges', 'id, child_id, badge_type, earned_at'),
      fetchAll('child_pins', 'child_id, created_at'),
      fetchAll('kid_sessions', 'child_id, created_at'),
      fetchAuthUsers(),
    ])

  const authById = new Map(authUsers.map((u) => [u.id, u]))
  const childrenByUser = new Map()
  for (const child of children) {
    const list = childrenByUser.get(child.user_id) || []
    list.push(child)
    childrenByUser.set(child.user_id, list)
  }

  const childToUser = new Map(children.map((c) => [c.id, c.user_id]))
  const choreToChild = new Map(chores.map((c) => [c.id, c.child_id]))

  const statsByUser = new Map()

  function ensure(userId) {
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
      })
    }
    return statsByUser.get(userId)
  }

  for (const profile of profiles) ensure(profile.id)

  for (const [userId, kids] of childrenByUser) {
    const s = ensure(userId)
    s.childCount = kids.length
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
    const userId = childToUser.get(childId)
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

  const topByActivity = [...withActivity].sort((a, b) => b.activityScore - a.activityScore).slice(0, 15)
  const topByTenure = [...allStats].sort((a, b) => (b.tenureDays || 0) - (a.tenureDays || 0)).slice(0, 15)
  const champions = [...withActivity]
    .filter((s) => (s.tenureDays || 0) >= 30 && s.activityScore >= 30)
    .sort((a, b) => b.activityScore - a.activityScore)

  const recentlyActive = [...withActivity]
    .filter((s) => (s.daysSinceLastActivity ?? 999) <= 14)
    .sort((a, b) => b.activityScore - a.activityScore)

  const atRiskLoyal = [...allStats]
    .filter((s) => (s.tenureDays || 0) >= 60 && (s.daysSinceLastActivity ?? 999) > 30)
    .sort((a, b) => (b.tenureDays || 0) - (a.tenureDays || 0))

  const summary = {
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
    topByActivity,
    topByTenure,
    champions,
    recentlyActive: recentlyActive.slice(0, 15),
    atRiskLoyal: atRiskLoyal.slice(0, 10),
    allUsers: allStats.sort((a, b) => b.activityScore - a.activityScore),
  }

  const outDir = join(__dirname, 'output')
  mkdirSync(outDir, { recursive: true })
  const outPath = join(outDir, 'power-users-report.json')
  writeFileSync(outPath, JSON.stringify(summary, null, 2))

  console.log('=== ChoreStar Power User Report ===\n')
  console.log(`Profiles: ${summary.totals.profiles} | Auth users: ${summary.totals.authUsers}`)
  console.log(`With activity: ${summary.totals.withAnyActivity} | Power: ${summary.totals.powerUsers} | Active: ${summary.totals.activeUsers}`)
  console.log(`Kid login set up: ${summary.totals.usesKidLogin} | Routines in use: ${summary.totals.usesRoutines}`)
  console.log(`Premium/Lifetime: ${summary.totals.premiumOrLifetime}\n`)

  const printRow = (s, i) => {
    const last = s.daysSinceLastActivity != null ? `${s.daysSinceLastActivity}d ago` : 'never'
    console.log(
      `${i + 1}. ${s.familyName} | score ${Math.round(s.activityScore)} | ${s.tenureDays ?? '?'}d member | last active ${last}`
    )
    console.log(
      `   chores ${s.choreCompletions} | routines ${s.routineCompletions} | badges ${s.badgesEarned} | kid logins ${s.kidLogins} | ${s.subscription}`
    )
    console.log(`   ${maskEmail(s.email)}`)
  }

  console.log('--- Top 10 by activity ---')
  topByActivity.slice(0, 10).forEach(printRow)

  console.log('\n--- Champions (30+ days + real usage) ---')
  champions.slice(0, 10).forEach(printRow)

  console.log('\n--- Recently active (last 14 days) ---')
  recentlyActive.slice(0, 8).forEach(printRow)

  if (atRiskLoyal.length) {
    console.log('\n--- Long-tenured but quiet (win-back?) ---')
    atRiskLoyal.slice(0, 5).forEach(printRow)
  }

  console.log(`\nFull report (emails included): ${outPath}`)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
