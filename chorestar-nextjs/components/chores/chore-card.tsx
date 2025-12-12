'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Check, Edit } from 'lucide-react'
import { EditChoreModal } from './edit-chore-modal'
import { CategoryBadge } from '@/components/ui/category-badge'
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

      onRefresh()
    } catch (error: any) {
      console.error('Error toggling completion:', error)
      toast.error('Failed to update completion')
    }
  }

  const choreCompletions = completions.filter(c => c.chore_id === chore.id && c.week_start === weekStart)
  const totalEarned = (choreCompletions.length * chore.reward_cents) / 100

  return (
    <>
      <Card className="overflow-hidden transition-all duration-200 hover:shadow-lg group relative">
        {/* Edit Button - Top Right */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsEditModalOpen(true)}
          className="absolute top-2 right-2 z-10 p-1.5 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity bg-white/70 hover:bg-white/90 rounded-lg"
          title="Edit chore"
        >
          <Edit className="w-4 h-4" style={{ color: 'var(--primary)' }} />
        </Button>

        <div className="p-2" style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(249,250,251,0.95) 100%)'
        }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-1.5 pb-1.5 border-b" style={{
            borderColor: 'rgba(99, 102, 241, 0.1)'
          }}>
            <div className="flex-1 pr-8">
              <div className="flex items-center gap-2 mb-1">
                {chore.icon && <span className="text-2xl">{chore.icon}</span>}
                <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                  {chore.name}
                </h3>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <CategoryBadge category={chore.category || 'household_chores'} size="sm" />
                <div
                  className="px-2 py-0.5 rounded-lg text-white font-bold text-sm"
                  style={{ background: 'var(--gradient-success)' }}
                >
                  💰 ${(chore.reward_cents / 100).toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* 7-Day Grid */}
          <div className="grid grid-cols-7 gap-1 mb-1.5">
            {days.map((day, index) => {
              const completed = isCompleted(day.dayOfWeek)

              return (
                <button
                  key={day.dayOfWeek}
                  onClick={() => toggleCompletion(day.dayOfWeek)}
                  className={`aspect-square rounded-lg border transition-all duration-200 flex flex-col items-center justify-center font-bold ${
                    completed
                      ? 'border-transparent text-white hover:scale-110'
                      : 'hover:scale-105 hover:border-purple-300'
                  }`}
                  style={{
                    ...(completed ? {
                      background: 'var(--gradient-success)',
                      boxShadow: '0 2px 8px rgba(46, 213, 115, 0.4)'
                    } : {
                      background: 'rgba(255, 255, 255, 0.8)',
                      borderColor: 'rgba(99, 102, 241, 0.2)',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                    })
                  }}
                  title={`${day.dayName} - Click to ${completed ? 'unmark' : 'mark'} as complete`}
                >
                  <div className={`text-xs font-black ${completed ? 'text-white' : 'text-gray-600'}`}>
                    {day.dayName}
                  </div>
                  {completed && <Check className="w-3.5 h-3.5 stroke-[3] mt-0.5" />}
                </button>
              )
            })}
          </div>

          {/* Stats */}
          <div className="pt-1.5 border-t flex items-center justify-between" style={{
            borderColor: 'rgba(99, 102, 241, 0.1)'
          }}>
            <div className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              <span className="font-black text-base mr-1" style={{ color: 'var(--text-primary)' }}>
                {choreCompletions.length}
              </span>
              this week {choreCompletions.length >= 5 && '🔥'}
            </div>
            <div
              className="text-xl font-black px-2.5 py-1 rounded-lg"
              style={{
                background: totalEarned > 0 ? 'var(--gradient-success)' : 'rgba(99, 102, 241, 0.1)',
                color: totalEarned > 0 ? 'white' : 'var(--text-secondary)'
              }}
            >
              ${totalEarned.toFixed(2)}
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
