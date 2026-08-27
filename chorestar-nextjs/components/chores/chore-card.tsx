'use client'

import { useState, useEffect, memo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Check, Edit } from 'lucide-react'
import { EditChoreModal } from './edit-chore-modal'
import { CategoryBadge } from '@/components/ui/category-badge'
import { ChoreIcon } from '@/components/ui/chore-icon'
import { playSound } from '@/lib/utils/sound'
import type { Database } from '@/lib/supabase/database.types'

type Chore = Database['public']['Tables']['chores']['Row']
type ChoreCompletion = Database['public']['Tables']['chore_completions']['Row']

interface ChoreCardProps {
  chore: Chore
  completions: ChoreCompletion[]
  weekStart: string
  rewardMode?: 'flat' | 'per_chore'
  onRefresh: () => void
  /** Child avatar color — tints the chore icon like iOS. */
  iconTint?: string | null
  /** Shown under the title in family overview mode. */
  childName?: string | null
}

export const ChoreCard = memo(function ChoreCard({
  chore,
  completions,
  weekStart,
  rewardMode = 'flat',
  onRefresh,
  iconTint,
  childName,
}: ChoreCardProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  // Optimistic overrides so the grid responds instantly, before the DB round-trip
  const [optimistic, setOptimistic] = useState<Record<number, boolean>>({})
  const [pendingDays, setPendingDays] = useState<Set<number>>(new Set())

  // Once fresh completions arrive, drop optimistic overrides (except in-flight ones)
  useEffect(() => {
    setOptimistic(prev => {
      if (Object.keys(prev).length === 0) return prev
      const next: Record<number, boolean> = {}
      for (const key of Object.keys(prev)) {
        const day = Number(key)
        if (pendingDays.has(day)) next[day] = prev[day]
      }
      return next
    })
  }, [completions, pendingDays])

  // Get last 7 days with day of week
  const getLast7Days = () => {
    const days = []
    for (let i = 0; i < 7; i++) {
      days.push({ dayOfWeek: i, dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i] })
    }
    return days
  }

  const days = getLast7Days()

  const isCompleted = (dayOfWeek: number) => {
    return completions.some(c => c.chore_id === chore.id && c.day_of_week === dayOfWeek && c.week_start === weekStart)
  }

  const toggleCompletion = async (dayOfWeek: number) => {
    if (pendingDays.has(dayOfWeek)) return // ignore double-taps while saving

    const completed = optimistic[dayOfWeek] ?? isCompleted(dayOfWeek)

    // Flip immediately for instant feedback; revert on error below
    setOptimistic(prev => ({ ...prev, [dayOfWeek]: !completed }))
    setPendingDays(prev => new Set(prev).add(dayOfWeek))

    // Play sound + celebration right away
    if (completed) {
      playSound('notification')
    } else {
      playSound('success')
      import('@/lib/utils/celebrations').then(({ getCelebrationManager }) => {
        const celebrationManager = getCelebrationManager()
        celebrationManager.celebrateChoreCompletion('', chore.name)
      }).catch(() => {})
    }

    try {
      const supabase = createClient()

      if (completed) {
        // Remove completion
        const completion = completions.find(c => c.day_of_week === dayOfWeek && c.week_start === weekStart && c.chore_id === chore.id)
        if (completion) {
          const { error } = await supabase
            .from('chore_completions')
            .delete()
            .eq('id', completion.id)

          if (error) throw error
        }
      } else {
        // Add completion
        const { error } = await supabase
          .from('chore_completions')
          .insert({
            chore_id: chore.id,
            day_of_week: dayOfWeek,
            week_start: weekStart,
          })

        if (error) throw error

        // Parent-path completions skip the kid API — ask the server whether
        // this filled the day's list so APNs can buzz the parent's phone.
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
    } catch (error: any) {
      console.error('Error toggling completion:', error)
      // Revert the optimistic flip
      setOptimistic(prev => ({ ...prev, [dayOfWeek]: completed }))
      toast.error('Failed to update completion')
      playSound('error')
    } finally {
      setPendingDays(prev => {
        const next = new Set(prev)
        next.delete(dayOfWeek)
        return next
      })
    }
  }

  const choreCompletions = completions.filter(c => c.chore_id === chore.id && c.week_start === weekStart)

  return (
    <>
      <Card className="overflow-hidden group relative !border-transparent dark:!border-transparent bg-black/[0.03] dark:bg-white/[0.04]">
        {/* Edit Button - Top Right */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsEditModalOpen(true)}
          className="absolute top-2 right-2 z-10 min-h-[44px] min-w-[44px] opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity rounded-lg touch-device-visible"
          title="Edit chore"
          aria-label="Edit chore"
        >
          <Edit className="w-4 h-4" style={{ color: 'var(--primary)' }} />
        </Button>

        <div className="p-3.5">
          {/* Header */}
          <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-black/[0.06] dark:border-white/[0.08]">
            <div className="flex-1 pr-10">
              <div className="flex items-center gap-2.5">
                {chore.icon && (
                  <ChoreIcon
                    emoji={chore.icon}
                    className="w-7 h-7 shrink-0"
                    tint={iconTint || undefined}
                  />
                )}
                <div className="flex items-center gap-x-3 gap-y-0.5 flex-wrap min-w-0">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-[0.95rem] leading-snug" style={{ color: 'var(--text-primary)' }}>
                      {chore.name}
                    </h3>
                    {childName && (
                      <p className="text-xs font-medium mt-0.5" style={{ color: iconTint || 'var(--text-secondary)' }}>
                        {childName}
                      </p>
                    )}
                  </div>
                  <CategoryBadge category={chore.category || 'household_chores'} size="sm" />
                </div>
              </div>
            </div>
          </div>

          {/* 7-Day Grid - Professional */}
          <div className="grid grid-cols-7 gap-1.5 mb-2.5">
            {days.map((day, index) => {
              const completed = optimistic[day.dayOfWeek] ?? isCompleted(day.dayOfWeek)

              return (
                <button
                  key={day.dayOfWeek}
                  onClick={() => toggleCompletion(day.dayOfWeek)}
                  aria-label={`${chore.name} ${day.dayName}, ${completed ? 'completed, click to unmark' : 'not completed, click to mark'}`}
                  aria-pressed={completed}
                  className={`h-14 sm:h-16 rounded-xl transition-colors duration-150 flex flex-col items-center justify-center gap-0.5 font-semibold touch-manipulation ${
                    completed
                      ? 'accent-fill'
                      : 'bg-white/70 dark:bg-gray-800/60 border border-black/[0.06] dark:border-white/[0.1] hover:bg-black/[0.03] dark:hover:bg-white/[0.06]'
                  }`}
                  title={`${day.dayName} - Click to ${completed ? 'unmark' : 'mark'} as complete`}
                >
                  {/* A completed cell is the theme accent, via .accent-fill. The
                      old fixed green was only 3.77:1 against its hardcoded white
                      text, and clashed with warm themes. currentColor here means
                      the label and tick follow --primary-foreground, so they stay
                      readable on a pale accent where white would vanish. */}
                  <div className={`text-xs font-bold ${completed ? '' : 'text-gray-700 dark:text-gray-300'}`}>
                    {day.dayName}
                  </div>
                  {completed && <Check className="w-4 h-4 stroke-[2.5]" />}
                </button>
              )
            })}
          </div>

          {/* Stats */}
          <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
              <span className="font-bold text-base mr-1 text-gray-900 dark:text-gray-100">
                {choreCompletions.length}
              </span>
              this week{choreCompletions.length >= 5 ? ' · on a roll' : ''}
            </div>
            {rewardMode === 'per_chore' && (
              <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                ${((chore.reward_cents || 0) / 100).toFixed(2)} each
              </div>
            )}
          </div>
        </div>
      </Card>

      <EditChoreModal
        chore={chore}
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onSuccess={() => {
          setIsEditModalOpen(false)
          onRefresh()
        }}
      />
    </>
  )
})
