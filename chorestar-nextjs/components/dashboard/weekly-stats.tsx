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
    weeklyBonusLabel: '',
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
              const bonusText = stats.weeklyBonusLabel
                ? ` Bonus unlocked: ${stats.weeklyBonusLabel}! 🎁`
                : ' All 7 days! 🎉'
              toast.success(`🎉 ${child.name} completed a PERFECT WEEK!${bonusText}`, {
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
        setStats({ totalCompletions: 0, totalEarnings: 0, completionRate: 0, perfectDays: 0, streak: 0, weeklyBonusLabel: '', isLoading: false })
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
        .select('daily_reward_cents, weekly_bonus_cents, reward_mode, weekly_bonus_label')
        .eq('user_id', user?.user?.id ?? '')
        .single()

      // Calculate total earnings using family settings
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

      // Calculate earnings based on reward mode
      let totalEarnings: number
      if (familySettings?.reward_mode === 'per_chore') {
        const choreRewardMap = new Map(chores.map(c => [c.id, c.reward_cents || 0]))
        totalEarnings = completions?.reduce((sum, comp) => {
          return sum + (choreRewardMap.get(comp.chore_id) || 0)
        }, 0) ?? 0
      } else {
        const dailyRewardCents = familySettings?.daily_reward_cents || 7
        const weeklyBonusCents = familySettings?.weekly_bonus_cents || 0
        const daysWithAnyCompletions = completionsPerDay.size
        totalEarnings = (daysWithAnyCompletions * dailyRewardCents) +
          (perfectDays === 7 ? weeklyBonusCents : 0)
      }

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
        weeklyBonusLabel: familySettings?.weekly_bonus_label || '',
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
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const thirtyDaysAgo = new Date(today)
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      // Compute the week_start for 30 days ago so we can filter in a single query
      const thirtyDaysAgoDay = thirtyDaysAgo.getDay()
      const earliestWeekStart = new Date(thirtyDaysAgo)
      earliestWeekStart.setDate(thirtyDaysAgo.getDate() - thirtyDaysAgoDay)

      const { data: completions } = await supabase
        .from('chore_completions')
        .select('day_of_week, week_start')
        .in('chore_id', choreIds)
        .gte('week_start', earliestWeekStart.toISOString().split('T')[0])

      // Build a set of "weekStart|dayOfWeek" keys for O(1) lookup
      const completionKeys = new Set<string>()
      completions?.forEach(c => {
        completionKeys.add(`${c.week_start}|${c.day_of_week}`)
      })

      let streak = 0
      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today)
        checkDate.setDate(today.getDate() - i)

        const dayOfWeek = checkDate.getDay()
        const ws = new Date(checkDate)
        ws.setDate(checkDate.getDate() - dayOfWeek)
        const wsKey = ws.toISOString().split('T')[0]

        if (completionKeys.has(`${wsKey}|${dayOfWeek}`)) {
          streak++
        } else {
          break
        }
      }

      return streak
    } catch (error) {
      console.error('Error calculating streak:', error)
      return 0
    }
  }

  if (stats.isLoading) {
    // Skeleton keeps the card's footprint so the dashboard doesn't shift when stats load
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
            <Trophy className="w-4 h-4 text-yellow-500" />
            {child.name}'s Weekly Stats
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-8 w-full rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
          <Trophy className="w-4 h-4 text-yellow-500" />
          {child.name}'s Weekly Stats
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Total Completions — brand accent (theme-driven) */}
          <div className="rounded-xl border p-3.5" style={{ background: 'var(--bg-secondary)', borderColor: 'hsl(var(--border))' }}>
            <div
              className="w-8 h-8 rounded-lg grid place-items-center mb-2"
              style={{ background: 'color-mix(in srgb, var(--primary) 14%, transparent)', color: 'var(--primary)' }}
            >
              <Star className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
              {stats.totalCompletions}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Completions</div>
          </div>

          {/* Total Earnings — semantic green */}
          <div className="rounded-xl border p-3.5" style={{ background: 'var(--bg-secondary)', borderColor: 'hsl(var(--border))' }}>
            <div className="w-8 h-8 rounded-lg grid place-items-center mb-2 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
              ${stats.totalEarnings.toFixed(2)}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Earned</div>
          </div>

          {/* Completion Rate — brand accent (theme-driven) */}
          <div className="rounded-xl border p-3.5" style={{ background: 'var(--bg-secondary)', borderColor: 'hsl(var(--border))' }}>
            <div
              className="w-8 h-8 rounded-lg grid place-items-center mb-2"
              style={{ background: 'color-mix(in srgb, var(--primary) 14%, transparent)', color: 'var(--primary)' }}
            >
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
              {stats.completionRate}%
            </div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Complete</div>
          </div>

          {/* Streak — semantic amber */}
          <div className="rounded-xl border p-3.5" style={{ background: 'var(--bg-secondary)', borderColor: 'hsl(var(--border))' }}>
            <div className="w-8 h-8 rounded-lg grid place-items-center mb-2 bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Flame className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
              {stats.streak}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Day Streak</div>
          </div>
        </div>

        {/* Perfect Days Stars - Compact */}
        <div className="p-3 rounded-lg shadow" style={{ background: 'var(--bg-secondary)' }}>
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
                  ? `🎉 Perfect week! ${stats.weeklyBonusLabel ? `Bonus: ${stats.weeklyBonusLabel}! 🎁` : 'All chores done every day!'}`
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
