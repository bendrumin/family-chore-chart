import { createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { validateKidToken } from '@/lib/utils/kid-auth'
import { childWeekEarningsCents } from '@/lib/utils/earnings'
import { computeStreaks } from '@/lib/utils/streak'
import { checkAchievements, type EarnedAchievement } from '@/lib/utils/achievement-tracker'
import { ACHIEVEMENTS } from '@/lib/constants/achievements'
import type { Database } from '@/lib/supabase/database.types'

/**
 * GET /api/kid/stats?weekStart=YYYY-MM-DD&dayOfWeek=N
 *
 * The motivation numbers, for the person they are meant to motivate. Until
 * this existed the parent dashboard had streaks, earnings, and badges while the
 * kid dashboard had none of them, on either platform.
 *
 * Returns the current and best streak, this week's earnings, today's progress,
 * and badge progress. It also returns the child's completion history and
 * persisted badges so the iOS app can run its own achievement engine in a
 * standalone kid session (which has no Supabase JWT and so no RLS access).
 *
 * `weekStart` and `dayOfWeek` come from the client because they are the
 * family's LOCAL today; the server (UTC) lands on the wrong day near midnight.
 * Authorized by the kid token alone; the childId is never taken from the query.
 */
export async function GET(request: Request) {
  const session = await validateKidToken(request)
  if (!session) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const url = new URL(request.url)
  const weekStart = url.searchParams.get('weekStart') ?? ''
  const dayOfWeek = Number(url.searchParams.get('dayOfWeek'))
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return NextResponse.json({ error: 'weekStart must be YYYY-MM-DD' }, { status: 400 })
  }
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    return NextResponse.json({ error: 'dayOfWeek must be 0-6' }, { status: 400 })
  }

  try {
    const admin = createServiceRoleClient()
    const childId = session.childId

    const { data: child } = await admin
      .from('children')
      .select('id, user_id')
      .eq('id', childId)
      .maybeSingle()
    if (!child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 })
    }

    const [{ data: chores }, { data: settings }, { data: badgeRows }] = await Promise.all([
      admin.from('chores').select('*').eq('child_id', childId).eq('is_active', true),
      admin
        .from('family_settings')
        .select('reward_mode, daily_reward_cents, weekly_bonus_cents, currency_code')
        .eq('user_id', child.user_id)
        .maybeSingle(),
      // achievement_badges has grown columns the generated types do not know
      // about (badge_name, badge_icon, earned_at); select everything and read
      // the row loosely so a regenerated types file cannot break this.
      admin.from('achievement_badges').select('*').eq('child_id', childId),
    ])

    const choreList = chores ?? []
    const choreIds = choreList.map(c => c.id)

    type CompletionRow = Database['public']['Tables']['chore_completions']['Row']
    let completions: CompletionRow[] = []
    if (choreIds.length > 0) {
      const { data } = await admin
        .from('chore_completions')
        .select('*')
        .in('chore_id', choreIds)
        .order('week_start', { ascending: false })
        .limit(10000)
      completions = data ?? []
    }

    const streaks = computeStreaks(choreList, completions, { weekStart, dayOfWeek })

    const week = childWeekEarningsCents(
      choreList,
      completions.filter(c => c.week_start === weekStart),
      settings
    )

    const persisted = ((badgeRows ?? []) as Array<Record<string, unknown>>).map(row => {
      const badgeType = String(row.badge_type ?? '')
      const def = ACHIEVEMENTS.find(a => a.id === badgeType)
      const earnedAt = String(row.earned_at ?? row.earned_date ?? row.created_at ?? '')
      return {
        id: String(row.id ?? ''),
        child_id: childId,
        badge_type: badgeType,
        badge_name: String(row.badge_name ?? def?.name ?? badgeType),
        badge_description: String(row.badge_description ?? def?.description ?? ''),
        badge_icon: String(row.badge_icon ?? def?.icon ?? '🏅'),
        earned_at: earnedAt,
      }
    })

    const earned: EarnedAchievement[] = persisted.map(p => ({
      achievementId: p.badge_type,
      earnedAt: p.earned_at,
      childId,
    }))

    const progress = checkAchievements(choreList, completions, childId, earned)
    const badges = progress.map(p => ({
      id: p.achievement.id,
      name: p.achievement.name,
      description: p.achievement.description,
      icon: p.achievement.icon,
      rarity: p.achievement.rarity,
      earned: p.earned,
      progress: Math.round(p.progress),
      currentCount: p.currentCount,
      requiredCount: p.requiredCount,
      earnedAt: p.earnedAt ?? null,
    }))
    const next = badges
      .filter(b => !b.earned)
      .sort((a, b) => b.progress - a.progress)[0] ?? null

    return NextResponse.json(
      {
        streak: streaks.current,
        bestStreak: streaks.best,
        todayPerfect: streaks.todayPerfect,
        todayDue: streaks.todayDue,
        todayDone: streaks.todayDone,
        weekEarnedCents: week.earnedCents,
        perfectDays: week.perfectDays,
        dueDays: week.dueDays,
        currencyCode: settings?.currency_code ?? 'USD',
        badges,
        earnedCount: badges.filter(b => b.earned).length,
        totalCount: badges.length,
        next,
        // For the iOS achievement engine in standalone kid sessions.
        completions: completions.map(c => ({
          chore_id: c.chore_id,
          week_start: c.week_start,
          day_of_week: c.day_of_week,
          status: c.status ?? 'approved',
        })),
        earnedBadges: persisted,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('[kid/stats] Unexpected error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
