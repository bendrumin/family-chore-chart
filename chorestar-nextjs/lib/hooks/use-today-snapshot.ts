'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getWeekStart } from '@/lib/utils/date-helpers'
import { childDayEarningsCents, type EarningsSettings } from '@/lib/utils/earnings'
import type { Child } from '@/lib/types'

export interface TodaySnapshot {
  familyDone: number
  familyTotal: number
  earnedTodayCents: number
  /** childId -> today's { done, total } */
  perChild: Record<string, { done: number; total: number }>
  loading: boolean
}

const EMPTY: TodaySnapshot = { familyDone: 0, familyTotal: 0, earnedTodayCents: 0, perChild: {}, loading: true }

/**
 * Read-only summary of the family's chore progress *today* — used by the
 * dashboard hero and the child-switcher rings. Purely additive: it never writes
 * and degrades to zeros on any error so it can't break the dashboard. Live via
 * a chore_completions subscription, mirroring WeeklyStats.
 */
export function useTodaySnapshot(children: Child[], settings?: EarningsSettings | null): TodaySnapshot {
  const [snapshot, setSnapshot] = useState<TodaySnapshot>(EMPTY)
  const childIds = children.map(c => c.id).sort().join(',')
  // Only the reward rules matter here; depend on them rather than the whole
  // settings object so unrelated setting edits don't refetch.
  const rewardMode = settings?.reward_mode ?? null
  const dailyReward = settings?.daily_reward_cents ?? null
  const weeklyBonus = settings?.weekly_bonus_cents ?? null

  const load = useCallback(async () => {
    const ids = childIds ? childIds.split(',') : []
    if (ids.length === 0) {
      setSnapshot({ ...EMPTY, loading: false })
      return
    }
    try {
      const supabase = createClient()
      const weekStart = getWeekStart()
      const today = new Date().getDay() // 0=Sun … matches schema day_of_week

      const { data: chores } = await supabase
        .from('chores')
        .select('id, reward_cents, child_id')
        .in('child_id', ids)
        .eq('is_active', true)

      const choreList = chores ?? []
      if (choreList.length === 0) {
        const perChild: TodaySnapshot['perChild'] = {}
        ids.forEach(id => { perChild[id] = { done: 0, total: 0 } })
        setSnapshot({ familyDone: 0, familyTotal: 0, earnedTodayCents: 0, perChild, loading: false })
        return
      }

      const choreIds = choreList.map(c => c.id)
      const { data: completions } = await supabase
        .from('chore_completions')
        .select('chore_id')
        .in('chore_id', choreIds)
        .eq('week_start', weekStart)
        .eq('day_of_week', today)

      const doneChoreIds = new Set((completions ?? []).map(c => c.chore_id))

      const perChild: TodaySnapshot['perChild'] = {}
      ids.forEach(id => { perChild[id] = { done: 0, total: 0 } })
      const choresByChild = new Map<string, typeof choreList>()
      for (const chore of choreList) {
        const bucket = perChild[chore.child_id] ?? (perChild[chore.child_id] = { done: 0, total: 0 })
        bucket.total += 1
        if (doneChoreIds.has(chore.id)) bucket.done += 1
        const list = choresByChild.get(chore.child_id)
        if (list) list.push(chore)
        else choresByChild.set(chore.child_id, [chore])
      }

      // Money follows the family's reward mode, per child — in flat mode the
      // daily rate is earned only by a child who finished their whole list, so
      // this is NOT a sum of per-chore rewards. See lib/utils/earnings.ts.
      const rewardSettings: EarningsSettings = {
        reward_mode: rewardMode,
        daily_reward_cents: dailyReward,
        weekly_bonus_cents: weeklyBonus,
      }
      let earnedTodayCents = 0
      for (const [, childChores] of choresByChild) {
        earnedTodayCents += childDayEarningsCents(childChores, doneChoreIds, rewardSettings)
      }

      const familyTotal = choreList.length
      const familyDone = doneChoreIds.size

      setSnapshot({ familyDone, familyTotal, earnedTodayCents, perChild, loading: false })
    } catch {
      setSnapshot({ ...EMPTY, loading: false })
    }
  }, [childIds, rewardMode, dailyReward, weeklyBonus])

  useEffect(() => { load() }, [load])

  // Keep the hero/rings live as chores get checked off elsewhere on the page.
  useEffect(() => {
    if (!childIds) return
    const supabase = createClient()
    const channel = supabase
      .channel('today-snapshot')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chore_completions' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [childIds, load])

  return snapshot
}
