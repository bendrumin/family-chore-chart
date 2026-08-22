'use client'

import { useEffect, useState, memo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Circle, CircleCheck } from 'lucide-react'
import { ChoreIcon } from '@/components/ui/chore-icon'
import { playSound } from '@/lib/utils/sound'
import { toast } from 'sonner'
import type { Database } from '@/lib/supabase/database.types'

type Chore = Database['public']['Tables']['chores']['Row']
type ChoreCompletion = Database['public']['Tables']['chore_completions']['Row']

interface TodayChoreRowProps {
  chore: Chore
  completions: ChoreCompletion[]
  weekStart: string
  /** Today's day_of_week (0=Sun … 6=Sat). */
  dayOfWeek: number
  rewardMode?: 'flat' | 'per_chore'
  onRefresh: () => void
  iconTint?: string | null
  childName?: string | null
}

/**
 * iOS Home chore row — one tap toggles *today* only.
 * Week grid lives on the per-child drill-in.
 */
export const TodayChoreRow = memo(function TodayChoreRow({
  chore,
  completions,
  weekStart,
  dayOfWeek,
  rewardMode = 'flat',
  onRefresh,
  iconTint,
  childName,
}: TodayChoreRowProps) {
  const serverDone = completions.some(
    c => c.chore_id === chore.id && c.day_of_week === dayOfWeek && c.week_start === weekStart
  )
  const [optimistic, setOptimistic] = useState<boolean | null>(null)
  const [pending, setPending] = useState(false)
  const done = optimistic ?? serverDone

  useEffect(() => {
    if (!pending) setOptimistic(null)
  }, [completions, pending])

  const toggle = async () => {
    if (pending) return
    const wasDone = done
    setOptimistic(!wasDone)
    setPending(true)

    if (wasDone) {
      playSound('notification')
    } else {
      playSound('success')
      import('@/lib/utils/celebrations').then(({ getCelebrationManager }) => {
        getCelebrationManager().celebrateChoreCompletion('', chore.name)
      }).catch(() => {})
    }

    try {
      const supabase = createClient()
      if (wasDone) {
        const completion = completions.find(
          c => c.day_of_week === dayOfWeek && c.week_start === weekStart && c.chore_id === chore.id
        )
        if (completion) {
          const { error } = await supabase.from('chore_completions').delete().eq('id', completion.id)
          if (error) throw error
        }
      } else {
        const { error } = await supabase.from('chore_completions').insert({
          chore_id: chore.id,
          day_of_week: dayOfWeek,
          week_start: weekStart,
        })
        if (error) throw error

        void fetch('/api/push/chores-done', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            childId: chore.child_id,
            weekStart,
            dayOfWeek,
          }),
        }).catch(() => {})
      }
      onRefresh()
    } catch (error: unknown) {
      console.error('Error toggling today completion:', error)
      setOptimistic(wasDone)
      toast.error('Failed to update completion')
      playSound('error')
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={done}
      aria-label={`${chore.name}${childName ? ` for ${childName}` : ''} — ${done ? 'done, tap to undo' : 'not done, tap to complete'}`}
      className={`w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-opacity duration-150 touch-manipulation ${
        done ? 'opacity-75' : 'opacity-100'
      } hover:bg-black/[0.02] dark:hover:bg-white/[0.04] active:opacity-90`}
      style={{ background: 'var(--card-bg)' }}
    >
      <span
        className="shrink-0 grid place-items-center"
        style={{ color: done ? 'var(--primary)' : 'var(--text-tertiary, var(--text-secondary))' }}
      >
        {done ? (
          <CircleCheck className="w-7 h-7" strokeWidth={2.25} aria-hidden />
        ) : (
          <Circle className="w-7 h-7 opacity-45" strokeWidth={2} aria-hidden />
        )}
      </span>

      {chore.icon ? (
        <ChoreIcon
          emoji={chore.icon}
          className={`w-7 h-7 shrink-0 ${done ? 'opacity-50 grayscale-[0.4]' : ''}`}
          tint={iconTint || undefined}
        />
      ) : (
        <span className="w-7 h-7 shrink-0" />
      )}

      <span className="min-w-0 flex-1">
        <span
          className={`block text-[0.95rem] font-medium leading-snug truncate ${done ? 'line-through' : ''}`}
          style={{ color: done ? 'var(--text-secondary)' : 'var(--text-primary)' }}
        >
          {chore.name}
        </span>
        {childName && (
          <span className="block text-xs font-medium mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
            {childName}
          </span>
        )}
      </span>

      {rewardMode === 'per_chore' && (
        <span
          className="shrink-0 text-sm font-semibold tabular-nums"
          style={{ color: done ? 'var(--primary)' : 'var(--text-secondary)' }}
        >
          ${((chore.reward_cents || 0) / 100).toFixed(2)}
        </span>
      )}
    </button>
  )
})
