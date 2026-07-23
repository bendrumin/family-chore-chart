'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getWeekStart } from '@/lib/utils/date-helpers'
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
export function useTodaySnapshot(children: Child[]): TodaySnapshot {
  const [snapshot, setSnapshot] = useState<TodaySnapshot>(EMPTY)
  const childIds = children.map(c => c.id).sort().join(',')

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
      let earnedTodayCents = 0
      for (const chore of choreList) {
        const bucket = perChild[chore.child_id] ?? (perChild[chore.child_id] = { done: 0, total: 0 })
        bucket.total += 1
        if (doneChoreIds.has(chore.id)) {
          bucket.done += 1
          earnedTodayCents += chore.reward_cents ?? 0
        }
      }
      const familyTotal = choreList.length
      const familyDone = doneChoreIds.size

      setSnapshot({ familyDone, familyTotal, earnedTodayCents, perChild, loading: false })
    } catch {
      setSnapshot({ ...EMPTY, loading: false })
    }
  }, [childIds])

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
