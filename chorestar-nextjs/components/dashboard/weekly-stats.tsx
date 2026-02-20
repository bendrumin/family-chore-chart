'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trophy, Star, TrendingUp, DollarSign, Flame } from 'lucide-react'
import { getCelebrationManager } from '@/lib/utils/celebrations'
import { playSound } from '@/lib/utils/sound'
import { toast } from 'sonner'
import type { Database } from '@/lib/supabase/database.types'

type Child = Database['public']['Tables']['children']['Row']
type Chore = Database['public']['Tables']['chores']['Row']
type ChoreCompletion = Database['public']['Tables']['chore_completions']['Row']

interface WeeklyStatsProps {
  child: Child
  weekStart: string
}

export function WeeklyStats({ child, weekStart }: WeeklyStatsProps) {
  const [stats, setStats] = useState({
    totalCompletions: 0,
    totalEarnings: 0,
    completionRate: 0,
    perfectDays: 0,
    streak: 0,
    isLoading: true,
  })
  const previousPerfectDays = useRef(0)
  const hasShownPerfectWeek = useRef(false)
  const hasInitiallyLoaded = useRef(false)
  const loadStatsRef = useRef<() => Promise<void>>(() => Promise.resolve())

  useEffect(() => {
    if (!stats.isLoading) {
      // Don't celebrate on initial load—only when perfect days increase during this session
      if (!hasInitiallyLoaded.current) {
        hasInitiallyLoaded.current = true
        previousPerfectDays.current = stats.perfectDays
        return
      }
      if (stats.perfectDays > previousPerfectDays.current) {
        const newPerfectDays = stats.perfectDays - previousPerfectDays.current
        if (newPerfectDays > 0) {
          const celebrationManager = getCelebrationManager()
          celebrationManager.celebrateWithConfetti('achievement')
          playSound('success')

          if (stats.perfectDays === 7 && !hasShownPerfectWeek.current) {
            setTimeout(() => {
              celebrationManager.celebratePerfectWeek()
              playSound('celebration')
              toast.success(`🎉 ${child.name} completed a PERFECT WEEK! All 7 days! 🎉`, {
                duration: 5000,
              })
            }, 500)
            hasShownPerfectWeek.current = true
          } else {
            toast.success(`⭐ ${child.name} earned a perfect day! All chores complete!`)
          }
        }
      }
      previousPerfectDays.current = stats.perfectDays
    }
  }, [stats.perfectDays, stats.isLoading, child.name])

  useEffect(() => {
    // Reset flags when week changes
    hasShownPerfectWeek.current = false
    hasInitiallyLoaded.current = false
    previousPerfectDays.current = 0
  }, [weekStart])

  useEffect(() => {
    // Set up real-time subscription for live updates (use ref to avoid stale closure)
    const supabase = createClient()
    const channel = supabase
      .channel(`weekly-stats-${child.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chore_completions'
      }, () => {
        loadStatsRef.current()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [child.id])

  const loadStats = useCallback(async () => {
    try {
      const supabase = createClient()

      // Get all chores for this child
      const { data: chores } = await supabase
        .from('chores')
        .select('*')
        .eq('child_id', child.id)
        .eq('is_active', true)

      if (!chores || chores.length === 0) {
        setStats({ totalCompletions: 0, totalEarnings: 0, completionRate: 0, perfectDays: 0, streak: 0, isLoading: false })
        return
      }

      const choreIds = chores.map(c => c.id)

      // Get completions for this week
      const { data: completions } = await supabase
        .from('chore_completions')
        .select('*')
        .in('chore_id', choreIds)
        .eq('week_start', weekStart)

      const totalCompletions = completions?.length || 0

      // Get family settings for reward calculation
      const { data: user } = await supabase.auth.getUser()
      const { data: familySettings } = await supabase
        .from('family_settings')
        .select('daily_reward_cents, weekly_bonus_cents')
        .eq('user_id', user?.user?.id)
        .single()

      // Calculate total earnings using family settings (matching Vanilla JS logic)
      // Count days with any completions
      const completionsPerDay = new Map<number, number>()
      completions?.forEach(comp => {
        const day = comp.day_of_week
        if (day !== null) {
          completionsPerDay.set(day, (completionsPerDay.get(day) || 0) + 1)
        }
      })

      // Count perfect days (days where ALL chores are completed)
      let perfectDays = 0
      for (let day = 0; day < 7; day++) {
        const completionsForDay = completionsPerDay.get(day) || 0
        if (completionsForDay >= chores.length) {
          perfectDays++
        }
      }

      // Calculate earnings: (days with any completions × daily_reward_cents) + weekly bonus if perfect week
      const dailyRewardCents = familySettings?.daily_reward_cents || 7
      const weeklyBonusCents = familySettings?.weekly_bonus_cents || 0
      const daysWithAnyCompletions = completionsPerDay.size
      const totalEarnings = (daysWithAnyCompletions * dailyRewardCents) +
        (perfectDays === 7 ? weeklyBonusCents : 0)

      // Calculate completion rate based on perfect days (matching Vanilla JS logic)
      const completionRate = Math.round((perfectDays / 7) * 100)

      // Calculate current streak (simplified - days with at least one completion)
      const streak = await calculateStreak(child.id, choreIds)

      setStats({
        totalCompletions,
        totalEarnings: totalEarnings / 100, // Convert cents to dollars
        completionRate,
        perfectDays,
        streak,
        isLoading: false,
      })
    } catch (error) {
      console.error('Error loading stats:', error)
      setStats(prev => ({ ...prev, isLoading: false }))
    }
  }, [child.id, child.name, weekStart])

  loadStatsRef.current = loadStats

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const calculateStreak = async (childId: string, choreIds: string[]) => {
    try {
      const supabase = createClient()
      let streak = 0
      let currentDate = new Date()
      currentDate.setHours(0, 0, 0, 0)

      // Check backwards from today
      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(currentDate)
        checkDate.setDate(checkDate.getDate() - i)

        const dayOfWeek = checkDate.getDay()
        const weekStart = new Date(checkDate)
        weekStart.setDate(checkDate.getDate() - dayOfWeek)
        weekStart.setHours(0, 0, 0, 0)

        const { data } = await supabase
          .from('chore_completions')
          .select('*')
          .in('chore_id', choreIds)
          .eq('day_of_week', checkDate.getDay())
          .eq('week_start', weekStart.toISOString().split('T')[0])
          .limit(1)

        if (data && data.length > 0) {
          streak++
        } else {
          break // Streak broken
        }
      }

      return streak
    } catch (error) {
      console.error('Error calculating streak:', error)
      return 0
    }
  }

  if (stats.isLoading) {
    return null
  }

  return (
    <Card className="bg-gradient-to-br from-blue-50/50 via-purple-50/50 to-pink-50/50 dark:from-blue-900/10 dark:via-purple-900/10 dark:to-pink-900/10 border border-gray-200 dark:border-gray-700 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
          <Trophy className="w-4 h-4 text-yellow-500" />
          {child.name}'s Weekly Stats
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Total Completions */}
          <div className="text-center p-2 bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              {stats.totalCompletions}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center justify-center gap-1">
              <Star className="w-3 h-3" />
              Completions
            </div>
          </div>

          {/* Total Earnings */}
          <div className="text-center p-2 bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              ${stats.totalEarnings.toFixed(2)}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center justify-center gap-1">
              <DollarSign className="w-3 h-3" />
              Earned
            </div>
          </div>

          {/* Completion Rate */}
          <div className="text-center p-2 bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {stats.completionRate}%
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center justify-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Complete
            </div>
          </div>

          {/* Streak */}
          <div className="text-center p-2 bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              {stats.streak}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center justify-center gap-1">
              <Flame className="w-3 h-3" />
              Day Streak
            </div>
          </div>
        </div>

        {/* Perfect Days Stars - Compact */}
        <div className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center justify-between">
            <span>Perfect Days This Week</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{stats.perfectDays}/7 days</span>
          </div>
          <div className="flex justify-center gap-1">
            {Array.from({ length: 7 }).map((_, index) => {
              const isPerfect = index < stats.perfectDays
              return (
                <div
                  key={index}
                  className={`text-xl transition-all duration-300 ${
                    isPerfect
                      ? 'scale-110 animate-pulse-subtle'
                      : 'opacity-30 grayscale'
                  }`}
                  title={`Day ${index + 1}: ${isPerfect ? 'All chores completed!' : 'Not yet complete'}`}
                >
                  {isPerfect ? '⭐' : '☆'}
                </div>
              )
            })}
          </div>
          {stats.perfectDays > 0 && (
            <div className="mt-1.5 text-center">
              <span className="text-xs font-medium text-green-600 dark:text-green-400">
                {stats.perfectDays === 7
                  ? '🎉 Perfect week! All chores done every day!'
                  : stats.perfectDays >= 5
                  ? '🌟 Awesome progress! Keep it up!'
                  : stats.perfectDays >= 3
                  ? '✨ Great start! You\'re doing well!'
                  : '💪 Good job! Keep going!'}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
