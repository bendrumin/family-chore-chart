'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trophy, Star, TrendingUp, DollarSign, Flame } from 'lucide-react'
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
    streak: 0,
    isLoading: true,
  })

  useEffect(() => {
    loadStats()
  }, [child.id, weekStart])

  const loadStats = async () => {
    try {
      const supabase = createClient()

      // Get all chores for this child
      const { data: chores } = await supabase
        .from('chores')
        .select('*')
        .eq('child_id', child.id)
        .eq('is_active', true)

      if (!chores || chores.length === 0) {
        setStats({ totalCompletions: 0, totalEarnings: 0, completionRate: 0, streak: 0, isLoading: false })
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

      // Calculate total earnings
      const totalEarnings = completions?.reduce((sum, completion) => {
        const chore = chores.find(c => c.id === completion.chore_id)
        return sum + (chore?.reward_cents || 0)
      }, 0) || 0

      // Calculate completion rate (percentage of possible completions)
      const possibleCompletions = chores.length * 7 // 7 days
      const completionRate = possibleCompletions > 0
        ? Math.round((totalCompletions / possibleCompletions) * 100)
        : 0

      // Calculate current streak (simplified - days with at least one completion)
      const streak = await calculateStreak(child.id, choreIds)

      setStats({
        totalCompletions,
        totalEarnings: totalEarnings / 100, // Convert cents to dollars
        completionRate,
        streak,
        isLoading: false,
      })
    } catch (error) {
      console.error('Error loading stats:', error)
      setStats({ ...stats, isLoading: false })
    }
  }

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
    <Card className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20 border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          {child.name}'s Weekly Stats
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Completions */}
          <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              {stats.totalCompletions}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 flex items-center justify-center gap-1">
              <Star className="w-3 h-3" />
              Completions
            </div>
          </div>

          {/* Total Earnings */}
          <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              ${stats.totalEarnings.toFixed(2)}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 flex items-center justify-center gap-1">
              <DollarSign className="w-3 h-3" />
              Earned
            </div>
          </div>

          {/* Completion Rate */}
          <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {stats.completionRate}%
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 flex items-center justify-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Complete
            </div>
          </div>

          {/* Streak */}
          <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              {stats.streak}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 flex items-center justify-center gap-1">
              <Flame className="w-3 h-3" />
              Day Streak
            </div>
          </div>
        </div>

        {/* Achievement Milestones - Fixed Height */}
        <div className="mt-4 min-h-[32px] flex flex-wrap gap-2">
          {stats.totalCompletions > 0 && (
            <>
              {stats.streak >= 5 && (
                <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                  🔥 {stats.streak} Day Streak!
                </Badge>
              )}
              {stats.completionRate === 100 && (
                <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                  ⭐ Perfect Week!
                </Badge>
              )}
              {stats.totalCompletions >= 10 && (
                <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                  🏆 Super Productive!
                </Badge>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
