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
        supabase.from('family_settings').select('daily_reward_cents, weekly_bonus_cents').eq('user_id', user!.id).single()
      ])

      const children = childrenRes.data || []
      const chores = choresRes.data || []
      const completions = completionsRes.data || []
      const dailyRewardCents = familySettingsRes.data?.daily_reward_cents || 7
      const weeklyBonusCents = familySettingsRes.data?.weekly_bonus_cents || 0

      if (children.length === 0 || chores.length === 0 || completions.length === 0) {
        setMetrics({ ...metrics, isLoading: false })
        return
      }

      // ── Build weekly trend data (last 8 weeks) ──────────────
      const weekStarts = [...new Set(completions.map(c => c.week_start))].sort()
      const recentWeeks = weekStarts.slice(-8)

      const trends: WeeklyTrend[] = recentWeeks.map(ws => {
        const weekCompletions = completions.filter(c => c.week_start === ws)
        // Total possible = all active chores × 7 days
        const totalPossible = chores.length * 7
        const rate = totalPossible > 0
          ? Math.min(100, Math.round((weekCompletions.length / totalPossible) * 100))
          : 0
        // Format the week label
        const d = new Date(ws)
        const label = `${d.getMonth() + 1}/${d.getDate()}`
        return { week: label, rate }
      })
      setWeeklyTrends(trends)

      // ── Build per-child comparison ──────────────────────────
      const childBars: ChildComparisonBar[] = children.map((child, idx) => {
        const childChores = chores.filter(c => c.child_id === child.id)
        const childCompletions = completions.filter(c =>
          childChores.some(ch => ch.id === c.chore_id)
        )
        const totalPossible = childChores.length * 7
        const rate = totalPossible > 0
          ? Math.min(100, Math.round((childCompletions.length / totalPossible) * 100))
          : 0
        return {
          name: child.name,
          rate,
          color: child.avatar_color || CHILD_COLORS[idx % CHILD_COLORS.length],
        }
      })
      setChildComparison(childBars)

      // ── Aggregate family metrics (existing logic) ───────────
      const childMetrics = children.map(child => {
        const childChores = chores.filter(c => c.child_id === child.id)
        const childCompletions = completions.filter(c =>
          childChores.some(chore => chore.id === c.chore_id)
        )

        const totalPossible = childChores.length * 7
        const completionRate = totalPossible > 0
          ? Math.round((childCompletions.length / totalPossible) * 100)
          : 0

        const completionsPerDay = new Map<number, number>()
        childCompletions.forEach(comp => {
          const day = comp.day_of_week
          if (day != null) {
            completionsPerDay.set(day, (completionsPerDay.get(day) || 0) + 1)
          }
        })

        let perfectDayPattern = 0
        for (let day = 0; day < 7; day++) {
          const completionsForDay = completionsPerDay.get(day) || 0
          if (completionsForDay >= childChores.length && childChores.length > 0) {
            perfectDayPattern++
          }
        }

        const totalEarnings = 0
        const streak = calculateStreak(childCompletions)

        return { totalEarnings, completionRate, perfectDays: perfectDayPattern, streak }
      })

      const averageCompletionRate = childMetrics.length > 0
        ? Math.round(childMetrics.reduce((sum, m) => sum + m.completionRate, 0) / childMetrics.length)
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
      const completions = completionsRes.data || []

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
            toast.success(`🏆 ${child.name} unlocked: ${achievement.name}!`, { duration: 5000 })
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
      setIsLoadingAchievements(false)
    }
  }

  const hasData = !metrics.isLoading && (metrics.totalEarnings > 0 || metrics.averageCompletionRate > 0)

  if (metrics.isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <div className="h-7 w-56 mx-auto bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mb-2" />
          <div className="h-4 w-72 mx-auto bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-6 bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700">
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
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
            No Data Collected Yet
          </h3>
          <p className="text-base mb-8 text-gray-600 dark:text-gray-400">
            Start completing chores to see beautiful analytics, charts, and insights here!
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="p-6 bg-white dark:bg-gray-800 rounded-xl border-2 border-purple-200 dark:border-purple-700">
              <div className="text-5xl mb-3">👶</div>
              <div className="font-bold text-lg mb-1 text-gray-900 dark:text-gray-100">Add Children</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Create profiles for your kids</div>
            </div>
            <div className="p-6 bg-white dark:bg-gray-800 rounded-xl border-2 border-purple-200 dark:border-purple-700">
              <div className="text-5xl mb-3">📝</div>
              <div className="font-bold text-lg mb-1 text-gray-900 dark:text-gray-100">Add Chores</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Create daily tasks</div>
            </div>
            <div className="p-6 bg-white dark:bg-gray-800 rounded-xl border-2 border-purple-200 dark:border-purple-700">
              <div className="text-5xl mb-3">✅</div>
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
          📊 Analytics Dashboard
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Track your family's progress and achievements
        </p>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 border-2 border-purple-200 dark:border-purple-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <TrendingUp className="w-4 h-4" />
              Weekly Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {metrics.averageCompletionRate}%
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Average completion rate
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border-2 border-green-200 dark:border-green-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <DollarSign className="w-4 h-4" />
              Total Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              ${metrics.totalEarnings.toFixed(2)}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Total earned this week
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/30 dark:to-red-900/30 border-2 border-orange-200 dark:border-orange-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Flame className="w-4 h-4" />
              Best Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              {metrics.bestStreak}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Day{metrics.bestStreak !== 1 ? 's' : ''} in a row
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 border-2 border-blue-200 dark:border-blue-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Star className="w-4 h-4" />
              Perfect Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
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
          <Card className="border-2 border-purple-200 dark:border-purple-700">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-700 dark:text-gray-300">
                📈 Completion Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={weeklyTrends} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
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
              <p className="text-xs text-center mt-2 text-gray-500 dark:text-gray-400">
                Family completion rate over the last {weeklyTrends.length} weeks
              </p>
            </CardContent>
          </Card>

          {/* Per-Child Comparison */}
          {childComparison.length > 0 && (
            <Card className="border-2 border-blue-200 dark:border-blue-700">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  👦 Per-Child Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={childComparison} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
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
                <p className="text-xs text-center mt-2 text-gray-500 dark:text-gray-400">
                  Overall completion rate by child
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
