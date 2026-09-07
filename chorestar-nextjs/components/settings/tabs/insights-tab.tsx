'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, DollarSign, Flame, Star } from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'
import { checkAchievements, checkForNewAchievements, loadEarnedAchievements, type AchievementProgress } from '@/lib/utils/achievement-tracker'
import { AchievementsDisplay } from '@/components/achievements/achievements-display'
import { getCelebrationManager } from '@/lib/utils/celebrations'
import { playSound } from '@/lib/utils/sound'
import { childWeekEarningsCents } from '@/lib/utils/earnings'
import { weekCompletionRate } from '@/lib/utils/schedule'
import { getWeekStart } from '@/lib/utils/date-helpers'
import { toast } from 'sonner'
import type { Database } from '@/lib/supabase/database.types'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from 'recharts'

type Child = Database['public']['Tables']['children']['Row']
type Chore = Database['public']['Tables']['chores']['Row']
type ChoreCompletion = Database['public']['Tables']['chore_completions']['Row']

interface AnalyticsMetrics {
  averageCompletionRate: number
  totalEarnings: number
  bestStreak: number
  totalPerfectDays: number
  isLoading: boolean
}

/** Data for the weekly trend line chart */
interface WeeklyTrend {
  week: string
  rate: number
}

/** Data for the per-child bar chart */
interface ChildComparisonBar {
  name: string
  rate: number
  color: string
}

const CHILD_COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444']

export function InsightsTab() {
  const { user } = useAuth()
  const [metrics, setMetrics] = useState<AnalyticsMetrics>({
    averageCompletionRate: 0,
    totalEarnings: 0,
    bestStreak: 0,
    totalPerfectDays: 0,
    isLoading: true,
  })
  const [achievementProgress, setAchievementProgress] = useState<AchievementProgress[]>([])
  const [isLoadingAchievements, setIsLoadingAchievements] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const hasCheckedAchievements = useRef(false)

  // Chart data
  const [weeklyTrends, setWeeklyTrends] = useState<WeeklyTrend[]>([])
  const [childComparison, setChildComparison] = useState<ChildComparisonBar[]>([])

  useEffect(() => {
    if (user) {
      loadAnalyticsData()
      loadAchievementsData()
    }
  }, [user])

  const loadAnalyticsData = async () => {
    try {
      const supabase = createClient()

      const [childrenRes, choresRes, completionsRes, familySettingsRes] = await Promise.all([
        supabase.from('children').select('*').eq('user_id', user!.id),
        supabase.from('chores').select('*').eq('is_active', true),
        supabase.from('chore_completions').select('*'),
        supabase.from('family_settings').select('reward_mode, daily_reward_cents, weekly_bonus_cents').eq('user_id', user!.id).single()
      ])

      const children = childrenRes.data || []
      const chores = choresRes.data || []
      // Ticks waiting for a parent's OK are not completions yet (migration 016).
      const completions = (completionsRes.data || []).filter(c => !c.status || c.status === 'approved')
      const familySettings = familySettingsRes.data
      const currentWeekStart = getWeekStart()

      if (children.length === 0 || chores.length === 0 || completions.length === 0) {
        setMetrics({ ...metrics, isLoading: false })
        return
      }

      // ── Build weekly trend data (last 8 weeks) ──────────────
      const weekStarts = [...new Set(completions.map(c => c.week_start))].sort()
      const recentWeeks = weekStarts.slice(-8)

      // Rates are per week: that week's filled due cells over that week's due
      // slots (weekCompletionRate), so they are 0..100 by construction.
      const trends: WeeklyTrend[] = recentWeeks.map(ws => {
        const weekCompletions = completions.filter(c => c.week_start === ws)
        // Format the week label
        const d = new Date(ws)
        const label = `${d.getMonth() + 1}/${d.getDate()}`
        return { week: label, rate: weekCompletionRate(chores, weekCompletions) }
      })
      setWeeklyTrends(trends)

      // ── Build per-child comparison ──────────────────────────
      // A child's bar is the average of their weekly rates across the charted
      // window, starting at their first week with data so a recently added
      // child isn't dragged toward zero by weeks from before they existed.
      const childBars: ChildComparisonBar[] = children.map((child, idx) => {
        const childChores = chores.filter(c => c.child_id === child.id)
        const childCompletions = completions.filter(c =>
          childChores.some(ch => ch.id === c.chore_id)
        )
        const childWeeks = new Set(childCompletions.map(c => c.week_start))
        const firstActive = recentWeeks.findIndex(ws => childWeeks.has(ws))
        const activeWeeks = firstActive === -1 ? [] : recentWeeks.slice(firstActive)
        const rate = activeWeeks.length > 0
          ? Math.round(
              activeWeeks.reduce((sum, ws) => sum + weekCompletionRate(
                childChores,
                childCompletions.filter(c => c.week_start === ws)
              ), 0) / activeWeeks.length
            )
          : 0
        return {
          name: child.name,
          rate,
          color: child.avatar_color || CHILD_COLORS[idx % CHILD_COLORS.length],
        }
      })
      setChildComparison(childBars)

      // ── Aggregate family metrics ────────────────────────────
      const childMetrics = children.map(child => {
        const childChores = chores.filter(c => c.child_id === child.id)
        const childCompletions = completions.filter(c =>
          childChores.some(chore => chore.id === c.chore_id)
        )

        // Earnings are scoped to the current week to match the card's
        // "Total earned this week" label, and follow the family's reward mode
        // via the shared rules in lib/utils/earnings.ts.
        const { earnedCents } = childWeekEarningsCents(
          childChores,
          childCompletions.filter(c => c.week_start === currentWeekStart),
          familySettings
        )

        // Perfect days are all-time, but counted week by week — bucketing every
        // completion by weekday would let one Monday's chores be credited again
        // by the next Monday's.
        let perfectDayPattern = 0
        for (const ws of new Set(childCompletions.map(c => c.week_start))) {
          perfectDayPattern += childWeekEarningsCents(
            childChores,
            childCompletions.filter(c => c.week_start === ws),
            familySettings
          ).perfectDays
        }

        const totalEarnings = earnedCents
        const streak = calculateStreak(childCompletions)

        return { totalEarnings, perfectDays: perfectDayPattern, streak }
      })

      // The card is the mean of the weekly rates charted right below it. It
      // used to divide a child's ALL-TIME completion count by ONE week's due
      // slots, which is how a family gets told they are at 518%.
      const averageCompletionRate = trends.length > 0
        ? Math.round(trends.reduce((sum, t) => sum + t.rate, 0) / trends.length)
        : 0
      const totalEarnings = childMetrics.reduce((sum, m) => sum + m.totalEarnings, 0)
      const bestStreak = Math.max(...childMetrics.map(m => m.streak), 0)
      const totalPerfectDays = childMetrics.reduce((sum, m) => sum + m.perfectDays, 0)

      setMetrics({
        averageCompletionRate,
        totalEarnings: totalEarnings / 100,
        bestStreak,
        totalPerfectDays,
        isLoading: false,
      })
    } catch (error) {
      console.error('Error loading analytics:', error)
      setLoadError(true)
      setMetrics({ ...metrics, isLoading: false })
    }
  }

  const calculateStreak = (completions: ChoreCompletion[]): number => {
    if (completions.length === 0) return 0
    const daysWithCompletions = new Set(
      completions.map(c => c.day_of_week).filter((day): day is number => day != null)
    )
    let streak = 0
    const today = new Date().getDay()
    for (let i = 0; i < 7; i++) {
      const checkDay = (today - i + 7) % 7
      if (daysWithCompletions.has(checkDay)) {
        streak++
      } else {
        break
      }
    }
    return streak
  }

  const loadAchievementsData = async () => {
    try {
      setIsLoadingAchievements(true)
      const supabase = createClient()

      const [childrenRes, choresRes, completionsRes] = await Promise.all([
        supabase.from('children').select('*').eq('user_id', user!.id),
        supabase.from('chores').select('*').eq('is_active', true),
        supabase.from('chore_completions').select('*'),
      ])

      const children = childrenRes.data || []
      const chores = choresRes.data || []
      // Ticks waiting for a parent's OK are not completions yet (migration 016).
      const completions = (completionsRes.data || []).filter(c => !c.status || c.status === 'approved')

      if (children.length === 0) {
        setAchievementProgress([])
        setIsLoadingAchievements(false)
        return
      }

      const allProgress: AchievementProgress[] = []

      for (const child of children) {
        const childChores = chores.filter(c => c.child_id === child.id)
        const childCompletions = completions.filter(c =>
          childChores.some(chore => chore.id === c.chore_id)
        )

        const earnedAchievements = loadEarnedAchievements(child.id)
        const progress = checkAchievements(
          childChores, childCompletions, child.id, earnedAchievements
        )

        if (!hasCheckedAchievements.current) {
          checkForNewAchievements(child.id, child.name, progress, (achievement) => {
            const celebrationManager = getCelebrationManager()
            celebrationManager.celebrateAchievement(achievement.name)
            playSound('celebration')
            toast.success(`${child.name} unlocked: ${achievement.name}!`, { duration: 5000 })
          })
        }

        allProgress.push(...progress)
      }

      hasCheckedAchievements.current = true

      const mergedProgress = new Map<string, AchievementProgress>()
      for (const progress of allProgress) {
        const existing = mergedProgress.get(progress.achievement.id)
        if (!existing || progress.progress > existing.progress) {
          mergedProgress.set(progress.achievement.id, progress)
        }
      }

      setAchievementProgress(Array.from(mergedProgress.values()))
      setIsLoadingAchievements(false)
    } catch (error) {
      console.error('Error loading achievements:', error)
      setLoadError(true)
      setIsLoadingAchievements(false)
    }
  }

  const hasData = !metrics.isLoading && (metrics.totalEarnings > 0 || metrics.averageCompletionRate > 0)

  if (loadError && !hasData) {
    return (
      <div className="text-center py-12">
        <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
          Failed to Load Insights
        </h3>
        <p className="text-base mb-6 text-gray-600 dark:text-gray-400">
          Something went wrong while loading your analytics data.
        </p>
        <button
          onClick={() => { setLoadError(false); setMetrics(m => ({ ...m, isLoading: true })); loadAnalyticsData(); loadAchievementsData() }}
          className="px-6 py-2.5 rounded-lg font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-md transition-all"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (metrics.isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <div className="h-7 w-56 mx-auto bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mb-2" />
          <div className="h-4 w-72 mx-auto bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="min-w-0 p-6 bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700">
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-3" />
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
              <div className="h-3 w-32 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="p-6 bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700">
              <div className="h-4 w-36 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
              <div className="h-[220px] bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!hasData) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
            No Data Collected Yet
          </h3>
          <p className="text-base mb-8 text-gray-600 dark:text-gray-400">
            Start completing chores to see beautiful analytics, charts, and insights here!
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="p-6 bg-white dark:bg-gray-800 rounded-xl border-2 border-purple-200 dark:border-purple-700">
              <div className="font-bold text-lg mb-1 text-gray-900 dark:text-gray-100">Add Children</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Create profiles for your kids</div>
            </div>
            <div className="p-6 bg-white dark:bg-gray-800 rounded-xl border-2 border-purple-200 dark:border-purple-700">
              <div className="font-bold text-lg mb-1 text-gray-900 dark:text-gray-100">Add Chores</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Create daily tasks</div>
            </div>
            <div className="p-6 bg-white dark:bg-gray-800 rounded-xl border-2 border-purple-200 dark:border-purple-700">
              <div className="font-bold text-lg mb-1 text-gray-900 dark:text-gray-100">Complete Chores</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Mark them as done</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Analytics Dashboard
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Track your family's progress and achievements
        </p>
      </div>

      {/* Analytics Cards — 2-up on phones so the row doesn't become a
          full-screen stack before the charts. min-w-0 on every card: a grid
          child's min-width defaults to its content, so without it a wide stat
          number widens its column until the grid overflows the dialog and the
          left column gets clipped off screen. The stat numbers step down on
          phones for the same reason. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="min-w-0 border-purple-200 dark:border-purple-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <TrendingUp className="w-4 h-4 shrink-0" />
              Weekly Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-display text-2xl sm:text-3xl font-black break-words text-purple-600 dark:text-purple-400">
              {/* Display clamp only: the rate itself is 0..100 by construction
                  (weekCompletionRate), this is the second line of defense. */}
              {Math.min(100, Math.max(0, metrics.averageCompletionRate))}%
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Average completion rate
            </p>
          </CardContent>
        </Card>

        <Card className="min-w-0 border-green-200 dark:border-green-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <DollarSign className="w-4 h-4 shrink-0" />
              Total Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-display text-2xl sm:text-3xl font-black break-words text-green-600 dark:text-green-400">
              ${metrics.totalEarnings.toFixed(2)}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Total earned this week
            </p>
          </CardContent>
        </Card>

        <Card className="min-w-0 border-orange-200 dark:border-orange-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Flame className="w-4 h-4 shrink-0" />
              Best Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-display text-2xl sm:text-3xl font-black break-words text-orange-600 dark:text-orange-400">
              {metrics.bestStreak}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Day{metrics.bestStreak !== 1 ? 's' : ''} in a row
            </p>
          </CardContent>
        </Card>

        <Card className="min-w-0 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Star className="w-4 h-4 shrink-0" />
              Perfect Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-display text-2xl sm:text-3xl font-black break-words text-blue-600 dark:text-blue-400">
              {metrics.totalPerfectDays}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              All chores completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      {weeklyTrends.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Weekly Completion Trend */}
          <Card className="min-w-0 border-2 border-purple-200 dark:border-purple-700">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-700 dark:text-gray-300">
                Completion Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* CSS-sized wrapper: ~200px tall on phones, 220px from md up */}
              <div className="h-[200px] md:h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyTrends} margin={{ top: 5, right: 12, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  {/* preserveStartEnd + minTickGap drop labels instead of
                      cramming eight week labels onto a phone-width axis */}
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} interval="preserveStartEnd" minTickGap={20} tickMargin={6} />
                  <YAxis domain={[0, 100]} width={38} tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    formatter={(value: any) => [`${value}%`, 'Completion Rate']}
                    contentStyle={{
                      borderRadius: '12px',
                      border: '2px solid #e9d5ff',
                      fontSize: '12px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    dot={{ fill: '#8b5cf6', r: 5 }}
                    activeDot={{ r: 7, fill: '#7c3aed' }}
                  />
                </LineChart>
              </ResponsiveContainer>
              </div>
              <p className="text-xs text-center mt-2 text-gray-500 dark:text-gray-400">
                Family completion rate over the last {weeklyTrends.length} weeks
              </p>
            </CardContent>
          </Card>

          {/* Per-Child Comparison */}
          {childComparison.length > 0 && (
            <Card className="min-w-0 border-2 border-blue-200 dark:border-blue-700">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  Per-Child Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] md:h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={childComparison} margin={{ top: 5, right: 12, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    {/* interval={0}: every child keeps a label (few bars) */}
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} tickMargin={6} />
                    <YAxis domain={[0, 100]} width={38} tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      formatter={(value: any) => [`${value}%`, 'Completion Rate']}
                      contentStyle={{
                        borderRadius: '12px',
                        border: '2px solid #bfdbfe',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="rate" radius={[8, 8, 0, 0]} maxBarSize={60}>
                      {childComparison.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                </div>
                <p className="text-xs text-center mt-2 text-gray-500 dark:text-gray-400">
                  Average weekly completion rate by child
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Achievements Section */}
      <div className="mt-8">
        <AchievementsDisplay
          achievementProgress={achievementProgress}
          isLoading={isLoadingAchievements}
        />
      </div>
    </div>
  )
}
