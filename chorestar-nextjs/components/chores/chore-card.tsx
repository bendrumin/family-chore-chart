'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Check, Edit } from 'lucide-react'
import { EditChoreModal } from './edit-chore-modal'
import { CategoryBadge } from '@/components/ui/category-badge'
import { playSound } from '@/lib/utils/sound'
import type { Database } from '@/lib/supabase/database.types'

type Chore = Database['public']['Tables']['chores']['Row']
type ChoreCompletion = Database['public']['Tables']['chore_completions']['Row']

interface ChoreCardProps {
  chore: Chore
  completions: ChoreCompletion[]
  weekStart: string
  onRefresh: () => void
}

export function ChoreCard({ chore, completions, weekStart, onRefresh }: ChoreCardProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

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
    try {
      const supabase = createClient()

      const completed = isCompleted(dayOfWeek)

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
      }

      // Play sound effect
      if (completed) {
        playSound('notification')
      } else {
        playSound('success')
        // Celebrate chore completion
        import('@/lib/utils/celebrations').then(({ getCelebrationManager }) => {
          const celebrationManager = getCelebrationManager()
          celebrationManager.celebrateChoreCompletion('', chore.name)
        })
      }

      onRefresh()
    } catch (error: any) {
      console.error('Error toggling completion:', error)
      toast.error('Failed to update completion')
      playSound('error')
    }
  }

  const choreCompletions = completions.filter(c => c.chore_id === chore.id && c.week_start === weekStart)

  return (
    <>
      <Card className="overflow-hidden transition-all duration-300 hover:shadow-xl group relative border border-gray-200 dark:border-gray-700">
        {/* Edit Button - Top Right */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsEditModalOpen(true)}
          className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-all bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 backdrop-blur-sm rounded-lg shadow-sm"
          title="Edit chore"
          aria-label="Edit chore"
        >
          <Edit className="w-4 h-4" style={{ color: 'var(--primary)' }} />
        </Button>

        <div className="p-4 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-800/50">
          {/* Header */}
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex-1 pr-10">
              <div className="flex items-center gap-2.5 mb-1.5">
                {chore.icon && <span className="text-2xl">{chore.icon}</span>}
                <h3 className="font-bold text-base leading-snug" style={{ color: 'var(--text-primary)' }}>
                  {chore.name}
                </h3>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <CategoryBadge category={chore.category || 'household_chores'} size="sm" />
              </div>
            </div>
          </div>

          {/* 7-Day Grid - Professional */}
          <div className="grid grid-cols-7 gap-1.5 mb-3">
            {days.map((day, index) => {
              const completed = isCompleted(day.dayOfWeek)

              return (
                <button
                  key={day.dayOfWeek}
                  onClick={() => toggleCompletion(day.dayOfWeek)}
                  className={`aspect-square min-h-[52px] rounded-lg transition-all duration-300 flex flex-col items-center justify-center font-bold touch-manipulation ${
                    completed
                      ? 'text-white hover:scale-110 active:scale-95 shadow-md'
                      : 'bg-white dark:bg-gray-700 hover:scale-105 hover:shadow-md active:scale-95 border border-gray-200 dark:border-gray-600'
                  }`}
                  style={{
                    ...(completed ? {
                      background: 'var(--gradient-success)',
                      boxShadow: 'var(--shadow-md)'
                    } : {})
                  }}
                  title={`${day.dayName} - Click to ${completed ? 'unmark' : 'mark'} as complete`}
                >
                  <div className={`text-xs font-bold ${completed ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                    {day.dayName}
                  </div>
                  {completed && <Check className="w-4 h-4 stroke-[2.5]" />}
                </button>
              )
            })}
          </div>

          {/* Stats */}
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-center">
            <div className="text-sm font-semibold text-gray-600 dark:text-gray-400">
              <span className="font-bold text-lg mr-1 text-gray-900 dark:text-gray-100">
                {choreCompletions.length}
              </span>
              this week {choreCompletions.length >= 5 && '🔥'}
            </div>
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
}
