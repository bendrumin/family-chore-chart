'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { WeekNavigator } from '@/components/ui/week-navigator'
import { ChoreIcon } from '@/components/ui/chore-icon'
import { Plus, Filter } from 'lucide-react'
import { toast } from 'sonner'
import { AddChoreModal } from './add-chore-modal'
import { ChoreCard } from './chore-card'
import { getWeekStart } from '@/lib/utils/date-helpers'
import { getCategoryList, type ChoreCategory } from '@/lib/constants/categories'
import { useSettings } from '@/lib/contexts/settings-context'
import type { Database } from '@/lib/supabase/database.types'

type Chore = Database['public']['Tables']['chores']['Row']
type ChoreCompletion = Database['public']['Tables']['chore_completions']['Row']

interface ChoreListProps {
  childId: string
  userId: string
}

export function ChoreList({ childId, userId }: ChoreListProps) {
  const { settings } = useSettings()
  const rewardMode = (settings?.reward_mode as 'flat' | 'per_chore') || 'flat'
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

  // Pre-compute completion map: choreId → completions[] (avoids O(n*m) filter per chore)
  const completionsByChoreId = useMemo(() => {
    const map = new Map<string, ChoreCompletion[]>()
    completions.forEach(c => {
      const existing = map.get(c.chore_id)
      if (existing) {
        existing.push(c)
      } else {
        map.set(c.chore_id, [c])
      }
    })
    return map
  }, [completions])

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
      toast.error('Failed to load completions. Tap a chore to retry.')
    }
  }

  const loadChoresRef = useRef(loadChores)
  const loadCompletionsRef = useRef(loadCompletions)
  loadChoresRef.current = loadChores
  loadCompletionsRef.current = loadCompletions

  // Stable callback for ChoreCard onRefresh — avoids creating a new function per render
  const handleRefresh = useCallback(() => {
    loadChoresRef.current()
    loadCompletionsRef.current()
  }, [])

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
              <span style={{ WebkitTextFillColor: 'initial' }}>📋</span> Chores
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
              <div className="flex gap-1.5 flex-wrap">
                {/* All Categories Button */}
                <button
                  onClick={() => setSelectedCategory('all')}
                  aria-pressed={selectedCategory === 'all'}
                  className={`inline-flex items-center gap-1.5 rounded-full border pl-3 pr-1.5 py-1.5 text-sm font-semibold transition-colors duration-150 ${
                    selectedCategory === 'all'
                      ? 'border-transparent bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-800'
                  }`}
                >
                  <span>All</span>
                  <span
                    className={`min-w-[1.375rem] rounded-full px-1.5 py-0.5 text-xs font-bold tabular-nums ${
                      selectedCategory === 'all'
                        ? 'bg-white/20 text-white dark:bg-gray-900/15 dark:text-gray-900'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                    }`}
                  >
                    {categoryCounts.all || 0}
                  </span>
                </button>

                {/* Category Buttons */}
                {categories.map((category) => {
                  const count = categoryCounts[category.id] || 0
                  if (count === 0) return null // Hide categories with no chores

                  const isSelected = selectedCategory === category.id

                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      aria-pressed={isSelected}
                      className={`inline-flex items-center gap-1.5 rounded-full border pl-2 pr-1.5 py-1.5 text-sm font-semibold transition-colors duration-150 ${
                        isSelected
                          ? 'text-gray-900 dark:text-gray-50'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-800'
                      }`}
                      style={isSelected ? {
                        // Category hue drives only the tint and ring — text stays
                        // theme-aware above so contrast holds in both modes.
                        backgroundColor: `${category.color}1f`,
                        borderColor: category.color
                      } : undefined}
                    >
                      <ChoreIcon emoji={category.icon} className="w-[18px] h-[18px]" />
                      <span>{category.label}</span>
                      <span
                        className={`min-w-[1.375rem] rounded-full px-1.5 py-0.5 text-xs font-bold tabular-nums ${
                          isSelected
                            ? 'bg-white/70 text-gray-700 dark:bg-gray-900/40 dark:text-gray-200'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                        }`}
                      >
                        {count}
                      </span>
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
                  completions={completionsByChoreId.get(chore.id) || []}
                  weekStart={weekStart}
                  rewardMode={rewardMode}
                  onRefresh={handleRefresh}
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
