'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trophy, Star, TrendingUp, DollarSign, Flame, Wallet } from 'lucide-react'
import { getCelebrationManager } from '@/lib/utils/celebrations'
import { playSound } from '@/lib/utils/sound'
import { childWeekEarningsCents } from '@/lib/utils/earnings'
import { dueOn } from '@/lib/utils/schedule'
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
    /** Days this week with at least one chore due. The "out of" for perfect days. */
    dueDays: 7,
    streak: 0,
    weeklyBonusLabel: '',
    isLoading: true,
  })
  // Running allowance balance: everything earned across all weeks minus
  // everything paid out. Separate from the weekly figures above because it
  // deliberately does NOT reset on Sunday — that reset is what used to make
  // unpaid allowance disappear.
  const [balance, setBalance] = useState<{ owedCents: number; paidCents: number } | null>(null)
  // The child's active goal (2.0), from the same balance call.
  const [goal, setGoal] = useState<{ id: string; title: string; emoji: string | null; targetCents: number; progressCents: number; percent: number; reached: boolean } | null>(null)
  const [balanceUnavailable, setBalanceUnavailable] = useState(false)
  const [payingOut, setPayingOut] = useState(false)

  const loadBalance = useCallback(async () => {
    try {
      const res = await fetch(`/api/allowance?childId=${child.id}`)
      if (!res.ok) throw new Error(String(res.status))
      const data = await res.json()
      setBalance({ owedCents: data.owedCents ?? 0, paidCents: data.paidCents ?? 0 })
      setGoal(data.goal ?? null)
      setBalanceUnavailable(false)
    } catch {
      // Most likely migration 011 hasn't been applied yet — hide the section
      // rather than showing a broken tile.
      setBalanceUnavailable(true)
    }
  }, [child.id])

  useEffect(() => { loadBalance() }, [loadBalance, stats.totalEarnings])

  const handlePayOut = async (goalId?: string) => {
    if (!balance || balance.owedCents <= 0) return
    setPayingOut(true)
    try {
      const res = await fetch('/api/allowance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goalId ? { childId: child.id, goalId } : { childId: child.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'failed')
      playSound('success')
      if (goalId && goal) {
        getCelebrationManager().celebrateWithConfetti('epic')
        toast.success(`Paid ${child.name} $${(data.paidCents / 100).toFixed(2)} for ${goal.emoji ?? ''} ${goal.title}. Goal reached!`)
      } else {
        toast.success(`Paid ${child.name} $${(data.paidCents / 100).toFixed(2)}`)
      }
      await loadBalance()
    } catch {
      toast.error('Could not record the payout')
    } finally {
      setPayingOut(false)
    }
  }

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

          const isPerfectWeek = stats.dueDays > 0 && stats.perfectDays === stats.dueDays
          if (isPerfectWeek && !hasShownPerfectWeek.current) {
            setTimeout(() => {
              celebrationManager.celebratePerfectWeek()
              playSound('celebration')
              const bonusText = stats.weeklyBonusLabel
                ? ` Bonus unlocked: ${stats.weeklyBonusLabel}! 🎁`
                : ` All ${stats.dueDays} days! 🎉`
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
  }, [stats.perfectDays, stats.dueDays, stats.isLoading, child.name])

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
        setStats({ totalCompletions: 0, totalEarnings: 0, completionRate: 0, perfectDays: 0, dueDays: 0, streak: 0, weeklyBonusLabel: '', isLoading: false })
        return
      }

      const choreIds = chores.map(c => c.id)

      // Get completions for this week
      const { data: completions } = await supabase
        .from('chore_completions')
        .select('*')
        .in('chore_id', choreIds)
        .eq('week_start', weekStart)

      // Approved ticks only; pending ones are waiting for the parent's OK.
      const totalCompletions = (completions ?? []).filter(c => !c.status || c.status === 'approved').length

      // Get family settings for reward calculation
      const { data: user } = await supabase.auth.getUser()
      const { data: familySettings } = await supabase
        .from('family_settings')
        .select('daily_reward_cents, weekly_bonus_cents, reward_mode, weekly_bonus_label')
        .eq('user_id', user?.user?.id ?? '')
        .single()

      // Earnings and perfect days both come from the shared rules so this card
      // can't disagree with the dashboard hero. See lib/utils/earnings.ts.
      const { earnedCents, perfectDays, dueDays } = childWeekEarningsCents(
        chores,
        completions ?? [],
        familySettings
      )
      const totalEarnings = earnedCents

      // Completion rate is perfect days out of the days that had chores due,
      // so a weekdays-only list can reach 100%.
      const completionRate = dueDays > 0 ? Math.round((perfectDays / dueDays) * 100) : 0

      // Current streak: consecutive days with at least one completion. Days
      // with nothing due are skipped rather than breaking it.
      const streak = await calculateStreak(chores)

      setStats({
        totalCompletions,
        totalEarnings: totalEarnings / 100, // Convert cents to dollars
        completionRate,
        perfectDays,
        dueDays,
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

  const calculateStreak = async (chores: Chore[]) => {
    try {
      const supabase = createClient()
      const choreIds = chores.map(c => c.id)
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
        .select('day_of_week, week_start, status')
        .in('chore_id', choreIds)
        .gte('week_start', earliestWeekStart.toISOString().split('T')[0])

      // Build a set of "weekStart|dayOfWeek" keys for O(1) lookup (approved only)
      const completionKeys = new Set<string>()
      completions?.forEach(c => {
        if (c.status && c.status !== 'approved') return
        completionKeys.add(`${c.week_start}|${c.day_of_week}`)
      })

      let streak = 0
      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today)
        checkDate.setDate(today.getDate() - i)

        const dayOfWeek = checkDate.getDay()
        // Nothing due this weekday: not a miss, just not a day that counts.
        if (dueOn(chores, dayOfWeek).length === 0) continue

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

        {/* Unpaid allowance — accumulates across weeks until it's handed over */}
        {!balanceUnavailable && balance && (
          <div
            className="p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3"
            style={{ background: 'var(--bg-secondary)', borderColor: 'hsl(var(--border))' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg grid place-items-center bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <div className="text-2xl font-bold tabular-nums leading-tight" style={{ color: 'var(--text-primary)' }}>
                  ${(balance.owedCents / 100).toFixed(2)}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {balance.owedCents > 0
                    ? `Owed to ${child.name} · keeps adding up until paid`
                    : 'All paid up'}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePayOut()}
              disabled={payingOut || balance.owedCents <= 0}
              className="font-semibold"
            >
              {payingOut ? 'Recording…' : 'Paid Out'}
            </Button>
          </div>
        )}

        {/* The goal the kid is saving for (2.0). Progress is the unspent balance. */}
        {!balanceUnavailable && balance && goal && (
          <div
            className="p-3.5 rounded-xl border space-y-2"
            style={{ background: 'var(--bg-secondary)', borderColor: 'hsl(var(--border))' }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl" aria-hidden>{goal.emoji ?? '🎯'}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                  Saving for {goal.title}
                </div>
                <div className="text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                  ${(goal.progressCents / 100).toFixed(2)} of ${(goal.targetCents / 100).toFixed(2)}
                  {goal.reached ? ' · reached!' : ''}
                </div>
              </div>
              <Button
                variant={goal.reached ? 'gradient' : 'outline'}
                size="sm"
                onClick={() => handlePayOut(goal.id)}
                disabled={payingOut || balance.owedCents <= 0}
                className="font-semibold shrink-0"
              >
                {goal.reached ? 'Pay out the goal' : 'Pay toward goal'}
              </Button>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--card-bg)' }}>
              <div className={`h-full rounded-full ${goal.reached ? 'bg-amber-500' : 'accent-fill'}`} style={{ width: `${goal.percent}%` }} />
            </div>
          </div>
        )}

        {/* Perfect Days Stars - Compact */}
        <div className="p-3 rounded-lg shadow" style={{ background: 'var(--bg-secondary)' }}>
          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center justify-between">
            <span>Perfect Days This Week</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {stats.perfectDays}/{stats.dueDays} days
              {stats.dueDays < 7 && stats.dueDays > 0 ? ' with chores due' : ''}
            </span>
          </div>
          <div className="flex justify-center gap-1">
            {Array.from({ length: stats.dueDays }).map((_, index) => {
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
                {stats.dueDays > 0 && stats.perfectDays === stats.dueDays
                  ? `🎉 Perfect week! ${stats.weeklyBonusLabel ? `Bonus: ${stats.weeklyBonusLabel}! 🎁` : 'All chores done every day!'}`
                  : stats.perfectDays / Math.max(1, stats.dueDays) >= 0.7
                  ? '🌟 Awesome progress! Keep it up!'
                  : stats.perfectDays / Math.max(1, stats.dueDays) >= 0.4
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
