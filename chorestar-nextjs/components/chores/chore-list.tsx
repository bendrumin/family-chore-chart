'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { WeekNavigator } from '@/components/ui/week-navigator'
import { ChoreIcon } from '@/components/ui/chore-icon'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { Plus, Filter, CheckCheck, CalendarCheck } from 'lucide-react'
import { toast } from 'sonner'
import { AddChoreModal } from './add-chore-modal'
import { ChoreCard } from './chore-card'
import { reviewCompletion } from '@/components/dashboard/approval-tray'
import { getWeekStart } from '@/lib/utils/date-helpers'
import { getCategoryList, type ChoreCategory } from '@/lib/constants/categories'
import { useSettings } from '@/lib/contexts/settings-context'
import { missingDueCells, isDueOn, type MissingDueCell } from '@/lib/utils/schedule'
import { childWeekEarningsCents } from '@/lib/utils/earnings'
import { formatMoney } from '@/lib/constants/currencies'
import { playSound } from '@/lib/utils/sound'
import type { Database } from '@/lib/supabase/database.types'

type Chore = Database['public']['Tables']['chores']['Row']
type ChoreCompletion = Database['public']['Tables']['chore_completions']['Row']

interface ChoreListProps {
  childId: string
  userId: string
  /** Child avatar color — passed through to tint chore icons like iOS. */
  iconTint?: string | null
  /** For bulk-action copy ("Marked 12 chores done for Maya"). */
  childName?: string | null
}

/** One prepared bulk fill, held while the parent reads the confirm dialog. */
interface BulkPlan {
  scope: 'today' | 'week'
  /** Due, unfilled cells to insert as parent completions. */
  cells: MissingDueCell[]
  /** Existing pending ticks in range, to approve. */
  pendingIds: string[]
  /** Earnings after minus earnings before, via the shared rules. */
  deltaCents: number
}

export function ChoreList({ childId, userId, iconTint, childName }: ChoreListProps) {
  const { settings } = useSettings()
  const rewardMode = (settings?.reward_mode as 'flat' | 'per_chore') || 'flat'
  const [chores, setChores] = useState<Chore[]>([])
  const [completions, setCompletions] = useState<ChoreCompletion[]>([])
  const [weekStart, setWeekStart] = useState(getWeekStart())
  const [isLoading, setIsLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<ChoreCategory | 'all'>('all')
  const [bulkPlan, setBulkPlan] = useState<BulkPlan | null>(null)
  const [bulkBusy, setBulkBusy] = useState(false)

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

  // ── Bulk completion ("Mark today done" / "Mark week so far done") ─────────
  // Backfills the CURRENT week only, so the actions hide on other weeks.
  const isCurrentWeek = weekStart === getWeekStart()
  const kidLabel = childName || 'this child'

  /**
   * Work out what a bulk action would do, and either open the confirm dialog
   * or say "all caught up". The earnings delta is earnings(after) minus
   * earnings(before) through the shared week rules, so daily mode (which pays
   * per perfect day, plus the weekly bonus) is priced correctly, never as a
   * naive per-chore sum.
   */
  const prepareBulk = (scope: 'today' | 'week') => {
    const today = new Date().getDay()

    // Due cells with no row at all: these get inserted.
    const allMissing = missingDueCells(chores, completions, today)
    const cells = scope === 'today' ? allMissing.filter(c => c.dayOfWeek === today) : allMissing

    // Due cells that already hold a kid's pending tick: a parent bulk action
    // carries parent-tick semantics, so these get approved instead.
    const choreById = new Map(chores.map(c => [c.id, c]))
    const pendingRows = completions.filter(c => {
      if (c.status !== 'pending') return false
      if (c.day_of_week === null || c.day_of_week === undefined) return false
      const chore = choreById.get(c.chore_id)
      if (!chore || !isDueOn(chore, c.day_of_week)) return false
      return scope === 'today' ? c.day_of_week === today : c.day_of_week <= today
    })

    if (cells.length === 0 && pendingRows.length === 0) {
      toast.success(`All caught up. Nothing to mark ${scope === 'today' ? 'for today' : 'for the week so far'}.`)
      return
    }

    const approvedIds = new Set(pendingRows.map(r => r.id))
    const after = [
      ...completions.map(c => (approvedIds.has(c.id) ? { ...c, status: 'approved' } : c)),
      ...cells.map(cell => ({ chore_id: cell.choreId, day_of_week: cell.dayOfWeek, status: null })),
    ]
    const deltaCents =
      childWeekEarningsCents(chores, after, settings).earnedCents -
      childWeekEarningsCents(chores, completions, settings).earnedCents

    setBulkPlan({ scope, cells, pendingIds: pendingRows.map(r => r.id), deltaCents })
  }

  const executeBulk = async (plan: BulkPlan) => {
    setBulkBusy(true)
    try {
      // Mirror the single-cell parent tick: same fields, same client, batched.
      if (plan.cells.length > 0) {
        const supabase = createClient()
        const { error } = await supabase.from('chore_completions').insert(
          plan.cells.map(cell => ({
            chore_id: cell.choreId,
            day_of_week: cell.dayOfWeek,
            week_start: weekStart,
          }))
        )
        if (error) throw error
      }

      // Pending ticks go through the same review endpoint the single-cell tap
      // uses, so status/reviewed_at/reviewed_by are set exactly the same way
      // (and it works for shared family members, who have no RLS update path).
      const results = await Promise.all(plan.pendingIds.map(id => reviewCompletion(id, 'approve')))
      const approvedCount = results.filter(Boolean).length
      const failedApprovals = plan.pendingIds.length - approvedCount

      // Same follow-up as a single parent tick: ask the server whether each
      // filled day completed the list so APNs can buzz the parent's phone.
      const daysFilled = [...new Set(plan.cells.map(c => c.dayOfWeek))]
      for (const dayOfWeek of daysFilled) {
        void fetch('/api/push/chores-done', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ childId, weekStart, dayOfWeek }),
        }).catch(() => {})
      }

      handleRefresh()
      const total = plan.cells.length + approvedCount
      if (failedApprovals > 0) {
        toast.error(`Marked ${total} done, but ${failedApprovals} could not be approved`)
      } else {
        playSound('success')
        toast.success(`Marked ${total} ${total === 1 ? 'chore' : 'chores'} done for ${kidLabel}`)
      }
    } catch (error) {
      console.error('Error bulk-completing chores:', error)
      toast.error('Could not mark those chores done')
      handleRefresh()
    } finally {
      setBulkBusy(false)
    }
  }

  const bulkDescription = (plan: BulkPlan) => {
    const parts: string[] = []
    if (plan.cells.length > 0) {
      parts.push(`mark ${plan.cells.length} ${plan.cells.length === 1 ? 'chore' : 'chores'} done`)
    }
    if (plan.pendingIds.length > 0) {
      parts.push(`approve ${plan.pendingIds.length} waiting for your OK`)
    }
    const when = plan.scope === 'today' ? 'today' : 'for the week so far'
    const money =
      plan.deltaCents > 0
        ? `That adds ${formatMoney(plan.deltaCents, settings?.currency_code)} to ${kidLabel}'s earnings.`
        : `${kidLabel}'s earnings stay the same.`
    return `This will ${parts.join(' and ')} for ${kidLabel} ${when}. ${money}`
  }

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

          {/* Catch-up bulk actions — current week only */}
          {chores.length > 0 && isCurrentWeek && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => prepareBulk('today')}
                disabled={bulkBusy}
                className="font-semibold"
                aria-label={`Mark all of ${kidLabel}'s chores due today as done`}
              >
                <CheckCheck className="w-4 h-4" aria-hidden />
                Mark today done
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => prepareBulk('week')}
                disabled={bulkBusy}
                className="font-semibold"
                aria-label={`Mark all of ${kidLabel}'s chores due so far this week as done`}
              >
                <CalendarCheck className="w-4 h-4" aria-hidden />
                Mark week so far done
              </Button>
            </div>
          )}

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
                  iconTint={iconTint}
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

      {/* Bulk completion confirm — states the count and the money before writing */}
      {bulkPlan && (
        <ConfirmationDialog
          open
          onOpenChange={open => {
            if (!open) setBulkPlan(null)
          }}
          onConfirm={() => {
            const plan = bulkPlan
            setBulkPlan(null)
            void executeBulk(plan)
          }}
          title={bulkPlan.scope === 'today' ? 'Mark today done?' : 'Mark week so far done?'}
          description={bulkDescription(bulkPlan)}
          confirmText="Mark done"
          cancelText="Cancel"
          variant="success"
        />
      )}
    </>
  )
}
