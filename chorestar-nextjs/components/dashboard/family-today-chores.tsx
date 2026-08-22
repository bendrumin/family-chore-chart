'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TodayChoreRow } from '@/components/dashboard/today-chore-row'
import { getWeekStart } from '@/lib/utils/date-helpers'
import { useSettings } from '@/lib/contexts/settings-context'
import { toast } from 'sonner'
import { Columns2, Columns3, Rows3 } from 'lucide-react'
import type { Database } from '@/lib/supabase/database.types'
import type { Child } from '@/lib/types'

type Chore = Database['public']['Tables']['chores']['Row']
type ChoreCompletion = Database['public']['Tables']['chore_completions']['Row']

/** How many columns each child's chore grid uses (md+). Mobile stays 1. */
type ColumnLayout = '1' | '2' | '3'

const COLUMNS_STORAGE_KEY = 'chorestar_today_columns'

const COLUMN_OPTIONS: Array<{
  id: ColumnLayout
  label: string
  icon: typeof Rows3
  className: string
}> = [
  { id: '1', label: '1 column', icon: Rows3, className: 'grid-cols-1' },
  {
    id: '2',
    label: '2 columns',
    icon: Columns2,
    className: 'grid-cols-1 md:grid-cols-2',
  },
  {
    id: '3',
    label: '3 columns',
    icon: Columns3,
    className: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
  },
]

function readStoredColumns(): ColumnLayout {
  if (typeof window === 'undefined') return '2'
  const raw = localStorage.getItem(COLUMNS_STORAGE_KEY)
  if (raw === '1' || raw === '2' || raw === '3') return raw
  return '2'
}

/**
 * Family day view — chores grouped by child (so siblings never interleave
 * in a multi-column grid), matching how parents think about the day.
 */
export function FamilyTodayChores({ children }: { children: Child[] }) {
  const { settings } = useSettings()
  const rewardMode = (settings?.reward_mode as 'flat' | 'per_chore') || 'flat'
  const dailyRewardCents = settings?.daily_reward_cents ?? 0
  const weekStart = getWeekStart()
  const dayOfWeek = new Date().getDay()
  const [chores, setChores] = useState<Chore[]>([])
  const [completions, setCompletions] = useState<ChoreCompletion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [columns, setColumns] = useState<ColumnLayout>('2')

  useEffect(() => {
    setColumns(readStoredColumns())
  }, [])

  const setColumnLayout = useCallback((next: ColumnLayout) => {
    setColumns(next)
    try {
      localStorage.setItem(COLUMNS_STORAGE_KEY, next)
    } catch {
      // private mode / quota — preference is session-only
    }
  }, [])

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

  /** One block per child, in Family strip order. Kids with no chores are omitted. */
  const groups = useMemo(() => {
    const byChild = new Map<string, Chore[]>()
    for (const chore of chores) {
      const list = byChild.get(chore.child_id)
      if (list) list.push(chore)
      else byChild.set(chore.child_id, [chore])
    }
    return children
      .map(child => {
        const childChores = byChild.get(child.id) || []
        const done = childChores.filter(chore =>
          (completionsByChoreId.get(chore.id) || []).some(
            c => c.day_of_week === dayOfWeek && c.week_start === weekStart
          )
        ).length
        return { child, chores: childChores, done }
      })
      .filter(g => g.chores.length > 0)
  }, [children, chores, completionsByChoreId, dayOfWeek, weekStart])

  const totalChores = groups.reduce((n, g) => n + g.chores.length, 0)
  const doneToday = groups.reduce((n, g) => n + g.done, 0)

  const gridClass =
    COLUMN_OPTIONS.find(o => o.id === columns)?.className ?? COLUMN_OPTIONS[1].className

  if (isLoading) {
    return (
      <section className="space-y-3">
        <SectionHeader title="Today's Chores" trailing="…" />
        <p className="px-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Loading family chores…
        </p>
      </section>
    )
  }

  if (groups.length === 0) {
    return (
      <section className="space-y-3">
        <SectionHeader title="Today's Chores" />
        <div
          className="rounded-2xl px-4 py-8 text-center text-sm"
          style={{ background: 'var(--card-bg)', color: 'var(--text-secondary)' }}
        >
          No chores yet. Tap a child above, then add their first chore.
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-5">
      <SectionHeader
        title="Today's Chores"
        trailing={`${doneToday}/${totalChores}`}
        actions={<ColumnToggle value={columns} onChange={setColumnLayout} />}
      />
      {rewardMode === 'flat' && dailyRewardCents > 0 && (
        <p className="px-1 text-sm -mt-2" style={{ color: 'var(--text-secondary)' }}>
          Each child earns ${(dailyRewardCents / 100).toFixed(2)} for finishing all of their chores today.
        </p>
      )}

      {groups.map(({ child, chores: childChores, done }) => (
        <div key={child.id} className="space-y-2">
          <div className="flex items-baseline justify-between gap-3 px-1">
            <h3
              className="text-sm font-bold tracking-tight"
              style={{ color: child.avatar_color || 'var(--text-primary)' }}
            >
              {child.name}
            </h3>
            <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>
              {done}/{childChores.length}
            </span>
          </div>
          <div className={`grid gap-2 ${gridClass}`}>
            {childChores.map(chore => (
              <TodayChoreRow
                key={chore.id}
                chore={chore}
                completions={completionsByChoreId.get(chore.id) || []}
                weekStart={weekStart}
                dayOfWeek={dayOfWeek}
                rewardMode={rewardMode}
                onRefresh={load}
                iconTint={child.avatar_color}
              />
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}

function ColumnToggle({
  value,
  onChange,
}: {
  value: ColumnLayout
  onChange: (next: ColumnLayout) => void
}) {
  return (
    <div
      role="group"
      aria-label="Chore columns"
      className="hidden sm:inline-flex items-center gap-0.5 rounded-lg p-0.5 border border-black/[0.06] dark:border-white/[0.1]"
      style={{ background: 'var(--card-bg)' }}
    >
      {COLUMN_OPTIONS.map(({ id, label, icon: Icon }) => {
        const active = value === id
        return (
          <button
            key={id}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={active}
            onClick={() => onChange(id)}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
              active
                ? 'accent-fill'
                : 'text-gray-500 dark:text-gray-400 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
            }`}
          >
            <Icon className="w-4 h-4" aria-hidden />
          </button>
        )
      })}
    </div>
  )
}

function SectionHeader({
  title,
  trailing,
  actions,
}: {
  title: string
  trailing?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-1 flex-wrap">
      <div className="flex items-baseline gap-3 min-w-0">
        <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h2>
        {trailing && (
          <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>
            {trailing}
          </span>
        )}
      </div>
      {actions}
    </div>
  )
}
