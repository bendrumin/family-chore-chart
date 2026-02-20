'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { WeekNavigator } from '@/components/ui/week-navigator'
import { Plus, Filter } from 'lucide-react'
import { toast } from 'sonner'
import { AddChoreModal } from './add-chore-modal'
import { ChoreCard } from './chore-card'
import { getWeekStart } from '@/lib/utils/date-helpers'
import { getCategoryList, type ChoreCategory } from '@/lib/constants/categories'
import type { Database } from '@/lib/supabase/database.types'

type Chore = Database['public']['Tables']['chores']['Row']
type ChoreCompletion = Database['public']['Tables']['chore_completions']['Row']

interface ChoreListProps {
  childId: string
  userId: string
}

export function ChoreList({ childId, userId }: ChoreListProps) {
  const [chores, setChores] = useState<Chore[]>([])
  const [completions, setCompletions] = useState<ChoreCompletion[]>([])
  const [weekStart, setWeekStart] = useState(getWeekStart())
  const [isLoading, setIsLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<ChoreCategory | 'all'>('all')

  const categories = getCategoryList()

  // Filter chores by selected category
  const filteredChores = useMemo(() => {
    if (selectedCategory === 'all') {
      return chores
    }
    return chores.filter(chore => chore.category === selectedCategory)
  }, [chores, selectedCategory])

  // Get category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: chores.length }
    chores.forEach(chore => {
      const category = chore.category || 'household_chores'
      counts[category] = (counts[category] || 0) + 1
    })
    return counts
  }, [chores])

  const loadChores = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('chores')
        .select('*')
        .eq('child_id', childId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true })

      if (error) throw error
      setChores(data || [])
    } catch (error) {
      console.error('Error loading chores:', error)
      toast.error('Failed to load chores')
    } finally {
      setIsLoading(false)
    }
  }

  const loadCompletions = async () => {
    try {
      const supabase = createClient()

      const choreIds = chores.map(c => c.id)
      if (choreIds.length === 0) {
        setCompletions([])
        return
      }

      const { data, error } = await supabase
        .from('chore_completions')
        .select('*')
        .in('chore_id', choreIds)
        .eq('week_start', weekStart)

      if (error) throw error
      setCompletions(data || [])
    } catch (error) {
      console.error('Error loading completions:', error)
    }
  }

  const loadChoresRef = useRef(loadChores)
  const loadCompletionsRef = useRef(loadCompletions)
  loadChoresRef.current = loadChores
  loadCompletionsRef.current = loadCompletions

  useEffect(() => {
    loadChores()
  }, [childId])

  useEffect(() => {
    if (chores.length > 0) {
      loadCompletions()
    }
  }, [chores, weekStart])

  useEffect(() => {
    // Set up real-time subscription for live updates
    const supabase = createClient()
    const channel = supabase
      .channel(`chore-updates-${childId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chores',
        filter: `child_id=eq.${childId}`
      }, () => {
        loadChoresRef.current()
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chore_completions'
      }, () => {
        loadCompletionsRef.current()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [childId])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">Loading chores...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold" style={{
              background: 'var(--gradient-primary)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              📋 Chores
            </CardTitle>
            <Button
              size="lg"
              variant="gradient"
              onClick={() => setIsAddModalOpen(true)}
              className="hover-glow font-bold"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Chore
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Week Navigator */}
          <WeekNavigator weekStart={weekStart} onWeekChange={setWeekStart} />

          {/* Category Filter */}
          {chores.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Filter by Category
                </span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {/* All Categories Button */}
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-4 py-2 rounded-xl font-bold text-sm transition-all duration-200 hover:scale-105 ${
                    selectedCategory === 'all'
                      ? 'shadow-lg scale-105'
                      : 'hover:shadow-md'
                  }`}
                  style={{
                    background: selectedCategory === 'all'
                      ? 'var(--gradient-primary)'
                      : 'rgba(107, 114, 128, 0.1)',
                    color: selectedCategory === 'all' ? 'white' : 'var(--text-secondary)',
                    border: selectedCategory === 'all' ? 'none' : '1px solid rgba(107, 114, 128, 0.2)'
                  }}
                >
                  All ({categoryCounts.all || 0})
                </button>

                {/* Category Buttons */}
                {categories.map((category) => {
                  const count = categoryCounts[category.id] || 0
                  if (count === 0) return null // Hide categories with no chores

                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`px-4 py-2 rounded-xl font-bold text-sm transition-all duration-200 hover:scale-105 flex items-center gap-2 ${
                        selectedCategory === category.id
                          ? 'shadow-lg scale-105'
                          : 'hover:shadow-md bg-white/50 dark:bg-gray-800/50'
                      }`}
                      style={{
                        background: selectedCategory === category.id
                          ? category.bgColor
                          : undefined,
                        color: selectedCategory === category.id ? category.color : 'var(--text-secondary)',
                        border: `1px solid ${selectedCategory === category.id ? category.color : 'rgba(107, 114, 128, 0.2)'}`
                      }}
                    >
                      <span>{category.icon}</span>
                      <span>{category.label}</span>
                      <span className="ml-1 opacity-70">({count})</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Chores List */}
          {chores.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                No chores yet. Add the first chore to get started!
              </p>
              <Button
                onClick={() => setIsAddModalOpen(true)}
                variant="gradient"
                size="lg"
                className="hover-glow font-bold"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add First Chore
              </Button>
            </div>
          ) : filteredChores.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">
                No chores in this category
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredChores.map((chore) => (
                <ChoreCard
                  key={chore.id}
                  chore={chore}
                  completions={completions.filter(c => c.chore_id === chore.id)}
                  weekStart={weekStart}
                  onRefresh={() => {
                    loadChores()
                    loadCompletions()
                  }}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddChoreModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        childId={childId}
        userId={userId}
        onSuccess={() => {
          setIsAddModalOpen(false)
          loadChores()
        }}
      />
    </>
  )
}
