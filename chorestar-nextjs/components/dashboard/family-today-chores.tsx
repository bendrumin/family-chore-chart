'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChoreCard } from '@/components/chores/chore-card'
import { getWeekStart } from '@/lib/utils/date-helpers'
import { useSettings } from '@/lib/contexts/settings-context'
import { toast } from 'sonner'
import type { Database } from '@/lib/supabase/database.types'
import type { Child } from '@/lib/types'

type Chore = Database['public']['Tables']['chores']['Row']
type ChoreCompletion = Database['public']['Tables']['chore_completions']['Row']

/**
 * Family overview — all kids' chores on one scroll, like iOS DashboardView.
 * Compact today-focused feel: still uses ChoreCard's 7-day grid so parents
 * can mark any day, but each row shows the child's name + tinted icon.
 */
export function FamilyTodayChores({ children }: { children: Child[] }) {
  const { settings } = useSettings()
  const rewardMode = (settings?.reward_mode as 'flat' | 'per_chore') || 'flat'
  const weekStart = getWeekStart()
  const [chores, setChores] = useState<Chore[]>([])
  const [completions, setCompletions] = useState<ChoreCompletion[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const childById = useMemo(() => {
    const map = new Map<string, Child>()
    children.forEach(c => map.set(c.id, c))
    return map
  }, [children])

  const childIds = useMemo(() => children.map(c => c.id), [children])

  const load = useCallback(async () => {
    if (childIds.length === 0) {
      setChores([])
      setCompletions([])
      setIsLoading(false)
      return
    }
    try {
      const supabase = createClient()
      const { data: choreRows, error: choreError } = await supabase
        .from('chores')
        .select('*')
        .in('child_id', childIds)
        .eq('is_active', true)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true })

      if (choreError) throw choreError
      const list = choreRows || []
      setChores(list)

      const ids = list.map(c => c.id)
      if (ids.length === 0) {
        setCompletions([])
        return
      }

      const { data: completionRows, error: completionError } = await supabase
        .from('chore_completions')
        .select('*')
        .in('chore_id', ids)
        .eq('week_start', weekStart)

      if (completionError) throw completionError
      setCompletions(completionRows || [])
    } catch (error) {
      console.error('Error loading family chores:', error)
      toast.error('Failed to load chores')
    } finally {
      setIsLoading(false)
    }
  }, [childIds, weekStart])

  useEffect(() => {
    setIsLoading(true)
    void load()
  }, [load])

  const completionsByChoreId = useMemo(() => {
    const map = new Map<string, ChoreCompletion[]>()
    completions.forEach(c => {
      const existing = map.get(c.chore_id)
      if (existing) existing.push(c)
      else map.set(c.chore_id, [c])
    })
    return map
  }, [completions])

  // Stable order: by child order in Family strip, then chore sort.
  const ordered = useMemo(() => {
    const order = new Map(children.map((c, i) => [c.id, i]))
    return [...chores].sort((a, b) => {
      const ai = order.get(a.child_id) ?? 999
      const bi = order.get(b.child_id) ?? 999
      if (ai !== bi) return ai - bi
      return (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name)
    })
  }, [chores, children])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          Loading family chores…
        </CardContent>
      </Card>
    )
  }

  if (ordered.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
            Today&apos;s Chores
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-8 text-center" style={{ color: 'var(--text-secondary)' }}>
          No chores yet. Tap a child above, then add their first chore.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <CardTitle className="text-xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
            Today&apos;s Chores
          </CardTitle>
          <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>
            Everyone · {ordered.length} chore{ordered.length === 1 ? '' : 's'}
          </span>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Tap a child above for their full week grid, routines, and stats — or check things off right here.
        </p>
      </CardHeader>
      <CardContent className="space-y-2 pt-2">
        {ordered.map(chore => {
          const child = childById.get(chore.child_id)
          return (
            <ChoreCard
              key={chore.id}
              chore={chore}
              completions={completionsByChoreId.get(chore.id) || []}
              weekStart={weekStart}
              rewardMode={rewardMode}
              onRefresh={load}
              iconTint={child?.avatar_color}
              childName={child?.name}
            />
          )
        })}
      </CardContent>
    </Card>
  )
}
