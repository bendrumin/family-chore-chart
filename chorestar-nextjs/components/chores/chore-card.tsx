'use client'

import { useState, useEffect, memo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Check, Edit, CalendarDays, Clock, Camera, Circle, CheckCircle2 } from 'lucide-react'
import { EditChoreModal } from './edit-chore-modal'
import { reviewCompletion } from '@/components/dashboard/approval-tray'
import { CategoryBadge } from '@/components/ui/category-badge'
import { ChoreIcon } from '@/components/ui/chore-icon'
import { playSound } from '@/lib/utils/sound'
import { DAY_SHORT, isDueOn, isEveryDay, formatSchedule } from '@/lib/utils/schedule'
import { useWeekDisplayOrder } from '@/lib/hooks/use-week-display-order'
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
  /** Day indexes of this week covered by a vacation window: not due. */
  vacationDays?: ReadonlySet<number>
  /** One line about today instead of the seven-day grid (the phone default). */
  compact?: boolean
  /** A row inside the shared week board: no card, no repeated day labels. */
  boardRow?: boolean
  /** Alternating tint for board rows, matching the iOS week table. */
  even?: boolean
}

export const ChoreCard = memo(function ChoreCard({
  chore,
  completions,
  weekStart,
  rewardMode = 'flat',
  onRefresh,
  iconTint,
  childName,
  vacationDays,
  compact = false,
  boardRow = false,
  even = false,
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

  // The week's columns in the viewer's display order (Monday-first in en-GB,
  // Saturday-first in ar-EG, ...). dayOfWeek stays the stored 0=Sunday index —
  // completions and toggles keep mapping to the same day; only the column
  // order is localized.
  const weekOrder = useWeekDisplayOrder()
  const days = weekOrder.map(dayOfWeek => ({ dayOfWeek, dayName: DAY_SHORT[dayOfWeek] }))

  const completionFor = (dayOfWeek: number) =>
    completions.find(c => c.chore_id === chore.id && c.day_of_week === dayOfWeek && c.week_start === weekStart)

  const isCompleted = (dayOfWeek: number) => Boolean(completionFor(dayOfWeek))

  /** The kid ticked it and it is waiting for a parent (migration 016). */
  const isAwaitingApproval = (dayOfWeek: number) => completionFor(dayOfWeek)?.status === 'pending'

  const toggleCompletion = async (dayOfWeek: number) => {
    if (pendingDays.has(dayOfWeek)) return // ignore double-taps while saving

    // A parent tapping a pending cell is approving it: that is what the tick
    // means here, so it goes through the review endpoint, not a delete.
    const awaiting = completionFor(dayOfWeek)
    if (awaiting?.status === 'pending') {
      setPendingDays(prev => new Set(prev).add(dayOfWeek))
      const ok = await reviewCompletion(awaiting.id, 'approve')
      setPendingDays(prev => {
        const next = new Set(prev)
        next.delete(dayOfWeek)
        return next
      })
      if (ok) {
        playSound('success')
        toast.success(`Approved ${chore.name}`)
        onRefresh()
      } else {
        toast.error('Could not approve that one')
      }
      return
    }

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

  const choreCompletions = completions.filter(
    c => c.chore_id === chore.id && c.week_start === weekStart && (!c.status || c.status === 'approved')
  )

  if (boardRow) {
    // A row of the shared week table: the chore on its own line, then seven
    // cells that line up with the header above. The day names live in that
    // header, so they are not repeated once per chore the way the old
    // per-chore cards did.
    return (
      <>
        <div className={`px-3 py-3 ${even ? 'bg-black/[0.02] dark:bg-white/[0.03]' : ''}`}>
          <div className="flex items-center gap-2 mb-2.5">
            {chore.icon && (
              <ChoreIcon emoji={chore.icon} className="w-6 h-6 shrink-0" tint={iconTint || undefined} />
            )}
            <span
              className="min-w-0 truncate text-[0.95rem] font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              {chore.name}
            </span>
            {childName && (
              <span className="shrink-0 text-xs font-medium" style={{ color: iconTint || 'var(--text-secondary)' }}>
                {childName}
              </span>
            )}
            {!isEveryDay(chore.days_of_week) && (
              <span
                className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold"
                style={{ color: 'var(--text-secondary)' }}
              >
                <CalendarDays className="w-3.5 h-3.5" aria-hidden />
                {formatSchedule(chore.days_of_week)}
              </span>
            )}
            <span className="flex-1" />
            {rewardMode === 'per_chore' && (
              <span className="shrink-0 text-xs font-semibold text-green-600 dark:text-green-400 tabular-nums">
                ${((chore.reward_cents || 0) / 100).toFixed(2)}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsEditModalOpen(true)}
              className="shrink-0 h-8 w-8 min-h-0 min-w-0 rounded-full"
              aria-label={`Edit ${chore.name}`}
            >
              <Edit className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {days.map(day => {
              const awaiting = isAwaitingApproval(day.dayOfWeek)
              const completed = !awaiting && (optimistic[day.dayOfWeek] ?? isCompleted(day.dayOfWeek))
              const due = isDueOn(chore, day.dayOfWeek, vacationDays)
              const idle = due
                ? 'bg-black/[0.04] dark:bg-white/[0.07] border border-black/[0.06] dark:border-white/[0.1]'
                : 'bg-transparent border border-dashed border-black/[0.12] dark:border-white/[0.16] opacity-60'
              return (
                <button
                  key={day.dayOfWeek}
                  onClick={() => toggleCompletion(day.dayOfWeek)}
                  aria-pressed={completed}
                  aria-label={`${chore.name} ${day.dayName}${due ? '' : ', not scheduled'}, ${
                    awaiting ? 'waiting for your OK, click to approve' : completed ? 'completed, click to unmark' : 'not completed, click to mark'
                  }`}
                  className={`h-10 sm:h-12 rounded-lg flex items-center justify-center transition-colors duration-150 touch-manipulation ${
                    awaiting
                      ? 'border-2 border-dashed border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/30'
                      : completed
                        ? 'accent-fill'
                        : idle
                  }`}
                >
                  {awaiting && <Clock className="w-4 h-4 text-amber-600 dark:text-amber-300" aria-hidden />}
                  {completed && <Check className="w-4 h-4 stroke-[3]" aria-hidden />}
                </button>
              )
            })}
          </div>
        </div>

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
  }

  if (compact) {
    // The shape the iOS app uses: one tappable line about today. Seven
    // day-boxes per chore cost 194px on a phone, so four chores filled the
    // screen; this fits a dozen.
    const today = new Date().getDay()
    const awaiting = isAwaitingApproval(today)
    const done = !awaiting && (optimistic[today] ?? isCompleted(today))
    const due = isDueOn(chore, today, vacationDays)
    return (
      <>
        <div className="flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 bg-black/[0.03] dark:bg-white/[0.04]">
          <button
            onClick={() => toggleCompletion(today)}
            aria-pressed={done}
            aria-label={`${chore.name} today${due ? '' : ', not scheduled'}, ${
              awaiting ? 'waiting for your OK, click to approve' : done ? 'completed, click to unmark' : 'not completed, click to mark'
            }`}
            className="shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full touch-manipulation active:bg-black/[0.06] dark:active:bg-white/[0.08]"
          >
            {awaiting ? (
              <Clock className="w-6 h-6 text-amber-500" aria-hidden />
            ) : done ? (
              <CheckCircle2 className="w-6 h-6" style={{ color: 'var(--primary)' }} aria-hidden />
            ) : (
              <Circle className={`w-6 h-6 text-gray-400 dark:text-gray-500 ${due ? '' : 'opacity-50'}`} aria-hidden />
            )}
          </button>

          {chore.icon && (
            <ChoreIcon
              emoji={chore.icon}
              className={`w-6 h-6 shrink-0 ${done ? 'opacity-50 saturate-50' : ''}`}
              tint={iconTint || undefined}
            />
          )}

          <span
            className={`flex-1 min-w-0 truncate text-[0.95rem] font-semibold ${done ? 'line-through' : ''}`}
            style={{ color: done ? 'var(--text-secondary)' : 'var(--text-primary)' }}
            title={chore.name}
          >
            {chore.name}
          </span>

          {rewardMode === 'per_chore' && (
            <span className="shrink-0 text-sm font-semibold tabular-nums text-green-600 dark:text-green-400">
              ${((chore.reward_cents || 0) / 100).toFixed(2)}
            </span>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsEditModalOpen(true)}
            className="shrink-0 min-h-[44px] min-w-[44px] rounded-lg"
            aria-label={`Edit ${chore.name}`}
          >
            <Edit className="w-4 h-4" style={{ color: 'var(--primary)' }} />
          </Button>
        </div>

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
  }

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

        <div className="p-2.5 sm:p-3.5">
          {/* Header */}
          <div className="flex items-center justify-between mb-2 sm:mb-2.5 pb-1.5 sm:pb-2 border-b border-black/[0.06] dark:border-white/[0.08]">
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
                  {!isEveryDay(chore.days_of_week) && (
                    <span
                      className="inline-flex items-center gap-1 text-xs font-semibold"
                      style={{ color: 'var(--text-secondary)' }}
                      title="Days this chore is due"
                    >
                      <CalendarDays className="w-3.5 h-3.5" aria-hidden />
                      {formatSchedule(chore.days_of_week)}
                    </span>
                  )}
                  {chore.requires_photo && (
                    <span
                      className="inline-flex items-center gap-1 text-xs font-semibold"
                      style={{ color: 'var(--text-secondary)' }}
                      title="Kids attach a photo when they check this off"
                    >
                      <Camera className="w-3.5 h-3.5" aria-hidden />
                      Photo
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 7-Day Grid - Professional */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-2 sm:mb-2.5">
            {days.map((day) => {
              const awaiting = isAwaitingApproval(day.dayOfWeek)
              const completed = !awaiting && (optimistic[day.dayOfWeek] ?? isCompleted(day.dayOfWeek))
              // A vacation day reads as an off-day: dashed, dimmed, still
              // tappable so a parent can credit work anyway.
              const due = isDueOn(chore, day.dayOfWeek, vacationDays)

              if (awaiting) {
                return (
                  <button
                    key={day.dayOfWeek}
                    onClick={() => toggleCompletion(day.dayOfWeek)}
                    aria-label={`${chore.name} ${day.dayName}, waiting for your OK, click to approve`}
                    className="h-11 sm:h-16 rounded-xl transition-colors duration-150 flex flex-col items-center justify-center gap-0.5 font-semibold touch-manipulation border-2 border-dashed border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                    title={`${day.dayName} - Waiting for your OK. Click to approve`}
                  >
                    <div className="text-xs font-bold">{day.dayName}</div>
                    <Clock className="w-4 h-4" aria-hidden />
                  </button>
                )
              }

              // An off-day cell is still tappable (a parent can credit work done
              // on a different day) but reads as "not scheduled": dashed and
              // dimmed, so the week's real shape is visible at a glance.
              const idle = due
                ? 'bg-white/70 dark:bg-gray-800/60 border border-black/[0.06] dark:border-white/[0.1] hover:bg-black/[0.03] dark:hover:bg-white/[0.06]'
                : 'bg-transparent border border-dashed border-black/[0.12] dark:border-white/[0.16] opacity-60 hover:opacity-90'

              return (
                <button
                  key={day.dayOfWeek}
                  onClick={() => toggleCompletion(day.dayOfWeek)}
                  aria-label={`${chore.name} ${day.dayName}${due ? '' : ', not scheduled'}, ${completed ? 'completed, click to unmark' : 'not completed, click to mark'}`}
                  aria-pressed={completed}
                  className={`h-11 sm:h-16 rounded-xl transition-colors duration-150 flex flex-col items-center justify-center gap-0.5 font-semibold touch-manipulation ${
                    completed ? 'accent-fill' : idle
                  }`}
                  title={
                    due
                      ? `${day.dayName} - Click to ${completed ? 'unmark' : 'mark'} as complete`
                      : `${day.dayName} - Not scheduled. Click to ${completed ? 'unmark' : 'mark'} as an extra`
                  }
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
          <div className="pt-1.5 sm:pt-2 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
            <div className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
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
