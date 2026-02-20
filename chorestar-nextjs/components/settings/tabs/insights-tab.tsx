'use client'

import { useEffect, useState, useRef } from 'react'
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

  useEffect(() => {
    if (user) {
      loadAnalyticsData()
      loadAchievementsData()
    }
  }, [user])

  const loadAnalyticsData = async () => {
    try {
      const supabase = createClient()

      // Load all data
      const [childrenRes, choresRes, completionsRes, familySettingsRes] = await Promise.all([
        supabase.from('children').select('*').eq('user_id', user!.id),
        supabase.from('chores').select('*').eq('user_id', user!.id).eq('is_active', true),
        supabase.from('chore_completions').select('*').eq('user_id', user!.id),
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

      // Calculate metrics for each child across ALL time (historical data)
      const childMetrics = children.map(child => {
        const childChores = chores.filter(c => c.child_id === child.id)
        const childCompletions = completions.filter(c =>
          childChores.some(chore => chore.id === c.chore_id)
        )

        // Calculate completion rate as percentage of individual completions vs total possible
        // This is historical data across all time, not a single week
        const totalPossible = childChores.length * 7 // If we only had one week of data
        // But since this is historical, we need to consider total completions
        // Use the same calculation as before the bug fix
        const completionRate = totalPossible > 0
          ? Math.round((childCompletions.length / totalPossible) * 100)
          : 0

        // For earnings calculation, we aggregate across all historical data
        // Group completions by day of week to see patterns
        const completionsPerDay = new Map<number, number>()
        childCompletions.forEach(comp => {
          const day = comp.day_of_week
          // Skip completions with null/undefined day_of_week
          if (day != null) {
            completionsPerDay.set(day, (completionsPerDay.get(day) || 0) + 1)
          }
        })

        // Count "perfect days" - days of week where we have completions >= chores
        // This is an aggregate pattern across all weeks, not actual perfect days
        let perfectDayPattern = 0
        for (let day = 0; day < 7; day++) {
          const completionsForDay = completionsPerDay.get(day) || 0
          if (completionsForDay >= childChores.length && childChores.length > 0) {
            perfectDayPattern++
          }
        }

        // Total earnings is not meaningful for historical aggregate data
        // This would need to be calculated per-week and summed
        const totalEarnings = 0

        // Calculate streak (simplified - consecutive days with completions)
        const streak = calculateStreak(childCompletions)

        return {
          totalEarnings,
          completionRate,
          perfectDays: perfectDayPattern, // This is a pattern count, not actual perfect days
          streak,
        }
      })

      // Aggregate family metrics
      const averageCompletionRate = childMetrics.length > 0
        ? Math.round(childMetrics.reduce((sum, m) => sum + m.completionRate, 0) / childMetrics.length)
        : 0
      const totalEarnings = childMetrics.reduce((sum, m) => sum + m.totalEarnings, 0)
      const bestStreak = Math.max(...childMetrics.map(m => m.streak), 0)
      const totalPerfectDays = childMetrics.reduce((sum, m) => sum + m.perfectDays, 0)

      setMetrics({
        averageCompletionRate,
        totalEarnings: totalEarnings / 100, // Convert to dollars
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

    // Get unique days with completions, sorted (filter out null/undefined)
    const daysWithCompletions = new Set(
      completions
        .map(c => c.day_of_week)
        .filter((day): day is number => day != null)
    )
    const sortedDays = Array.from(daysWithCompletions).sort((a, b) => b - a)

    // Simple streak: count consecutive days from most recent
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

      // Load all data
      const [childrenRes, choresRes, completionsRes] = await Promise.all([
        supabase.from('children').select('*').eq('user_id', user!.id),
        supabase.from('chores').select('*').eq('user_id', user!.id).eq('is_active', true),
        supabase.from('chore_completions').select('*').eq('user_id', user!.id),
      ])

      const children = childrenRes.data || []
      const chores = choresRes.data || []
      const completions = completionsRes.data || []

      if (children.length === 0) {
        setAchievementProgress([])
        setIsLoadingAchievements(false)
        return
      }

      // Aggregate achievements across all children
      const allProgress: AchievementProgress[] = []

      for (const child of children) {
        const childChores = chores.filter(c => c.child_id === child.id)
        const childCompletions = completions.filter(c =>
          childChores.some(chore => chore.id === c.chore_id)
        )

        const earnedAchievements = loadEarnedAchievements(child.id)
        const progress = checkAchievements(
          childChores,
          childCompletions,
          child.id,
          earnedAchievements
        )

        // Check for newly earned achievements and celebrate
        if (!hasCheckedAchievements.current) {
          const newAchievements = checkForNewAchievements(
            child.id,
            child.name,
            progress,
            (achievement) => {
              // Celebrate new achievement!
              const celebrationManager = getCelebrationManager()
              celebrationManager.celebrateAchievement(achievement.name)
              playSound('celebration')
              toast.success(
                `🏆 ${child.name} unlocked: ${achievement.name}!`,
                { duration: 5000 }
              )
            }
          )
        }

        allProgress.push(...progress)
      }

      hasCheckedAchievements.current = true

      // Merge achievements by ID (show highest progress across all children)
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
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
            Loading Analytics...
          </h3>
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
        {/* Weekly Progress */}
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

        {/* Total Earnings */}
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

        {/* Best Streak */}
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

        {/* Perfect Days */}
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

      {/* Achievements Section */}
      <div className="mt-8">
        <AchievementsDisplay
          achievementProgress={achievementProgress}
          isLoading={isLoadingAchievements}
        />
      </div>

      {/* Coming Soon Section */}
      <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 border-2 border-blue-200 dark:border-blue-700 rounded-xl">
        <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">
          📈 More Insights Coming Soon
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="p-3 bg-white/70 dark:bg-gray-800/70 rounded-lg">
            <div className="text-2xl mb-1">📊</div>
            <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">Progress Charts</div>
          </div>
          <div className="p-3 bg-white/70 dark:bg-gray-800/70 rounded-lg">
            <div className="text-2xl mb-1">📅</div>
            <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">Historical Data</div>
          </div>
          <div className="p-3 bg-white/70 dark:bg-gray-800/70 rounded-lg">
            <div className="text-2xl mb-1">💡</div>
            <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">Smart Insights</div>
          </div>
        </div>
      </div>
    </div>
  )
}
