'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Sparkles, RefreshCw, Plus, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/use-auth'
import { generateSuggestions, CATEGORY_LABELS, type ChoreSuggestion } from '@/lib/utils/chore-suggestions'
import { toast } from 'sonner'
import type { Database } from '@/lib/supabase/database.types'

type Child = Database['public']['Tables']['children']['Row']
type Chore = Database['public']['Tables']['chores']['Row']
type ChoreCompletion = Database['public']['Tables']['chore_completions']['Row']

interface AISuggestionsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AISuggestionsModal({ open, onOpenChange }: AISuggestionsModalProps) {
  const { user } = useAuth()
  const [children, setChildren] = useState<Child[]>([])
  const [chores, setChores] = useState<Chore[]>([])
  const [completions, setCompletions] = useState<ChoreCompletion[]>([])
  const [selectedChild, setSelectedChild] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<ChoreSuggestion[]>([])
  const [addedChores, setAddedChores] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [isAdding, setIsAdding] = useState<string | null>(null)

  // Load family data when modal opens
  useEffect(() => {
    if (open && user) {
      loadFamilyData()
    }
    if (!open) {
      setSuggestions([])
      setAddedChores(new Set())
      setSelectedChild(null)
    }
  }, [open, user])

  // Generate suggestions when child is selected
  useEffect(() => {
    if (selectedChild && children.length > 0) {
      refreshSuggestions()
    }
  }, [selectedChild])

  const loadFamilyData = async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const [childrenRes, choresRes, completionsRes] = await Promise.all([
        supabase.from('children').select('*').eq('user_id', user!.id),
        supabase.from('chores').select('*').eq('is_active', true),
        supabase.from('chore_completions').select('*'),
      ])

      const kids = childrenRes.data || []
      setChildren(kids)
      setChores(choresRes.data || [])
      setCompletions(completionsRes.data || [])

      // Auto-select first child
      if (kids.length > 0 && !selectedChild) {
        setSelectedChild(kids[0].id)
      }
    } catch (error) {
      console.error('Error loading family data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const refreshSuggestions = () => {
    if (!selectedChild) return

    const child = children.find(c => c.id === selectedChild)
    if (!child) return

    const childChores = chores.filter(c => c.child_id === selectedChild)
    const childCompletions = completions.filter(c =>
      childChores.some(ch => ch.id === c.chore_id)
    )

    // Calculate completion rate
    const totalPossible = childChores.length * 7
    const completionRate = totalPossible > 0
      ? Math.round((childCompletions.length / totalPossible) * 100)
      : 0

    const results = generateSuggestions({
      childName: child.name,
      childAge: child.age,
      existingChoreNames: childChores.map(c => c.name),
      completionRate,
    })

    setSuggestions(results)
  }

  const handleAddChore = async (suggestion: ChoreSuggestion) => {
    if (!user || !selectedChild) return

    setIsAdding(suggestion.name)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('chores').insert({
        child_id: selectedChild,
        name: suggestion.name,
        reward_cents: suggestion.rewardCents,
        is_active: true,
        icon: suggestion.icon,
        category: suggestion.category,
      })

      if (error) throw error

      setAddedChores(prev => new Set(prev).add(suggestion.name))
      toast.success(`Added "${suggestion.name}"!`)
    } catch (error) {
      console.error('Error adding chore:', error)
      toast.error('Failed to add chore. Please try again.')
    } finally {
      setIsAdding(null)
    }
  }

  const selectedChildData = children.find(c => c.id === selectedChild)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClose={() => onOpenChange(false)}
        className="max-w-2xl max-h-[90vh] overflow-y-auto dialog-content-bg"
      >
        <DialogHeader>
          <DialogTitle className="text-3xl font-black flex items-center gap-3" style={{
            background: 'var(--gradient-primary)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            <Sparkles className="w-8 h-8" style={{ color: 'var(--primary)' }} />
            Smart Chore Suggestions
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Child Selector */}
          {children.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {children.map(child => (
                <button
                  key={child.id}
                  onClick={() => setSelectedChild(child.id)}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                    selectedChild === child.id
                      ? 'text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  style={selectedChild === child.id ? {
                    background: 'var(--gradient-primary)',
                  } : undefined}
                >
                  {child.name}
                </button>
              ))}
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🤖</div>
              <p className="text-gray-600 dark:text-gray-400 font-medium">Analyzing your family's chores...</p>
            </div>
          )}

          {/* No children */}
          {!isLoading && children.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👶</div>
              <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                Add a child first
              </h3>
              <p style={{ color: 'var(--text-secondary)' }}>
                Head to the dashboard and add a child to get personalized suggestions.
              </p>
            </div>
          )}

          {/* Suggestions */}
          {!isLoading && suggestions.length > 0 && selectedChildData && (
            <>
              <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700">
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Suggestions for <strong style={{ color: 'var(--text-primary)' }}>{selectedChildData.name}</strong>
                  {selectedChildData.age ? ` (age ${selectedChildData.age})` : ''} based on their current chores and activity.
                </p>
              </div>

              <div className="space-y-3">
                {suggestions.map((suggestion) => {
                  const wasAdded = addedChores.has(suggestion.name)
                  return (
                    <div
                      key={suggestion.name}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        wasAdded
                          ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-purple-300 dark:hover:border-purple-600'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <span className="text-2xl">{suggestion.icon}</span>
                          <div>
                            <h4 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                              {suggestion.name}
                            </h4>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                              {CATEGORY_LABELS[suggestion.category] || suggestion.category}
                              {' · '}
                              {suggestion.rewardCents}¢ suggested
                            </p>
                            <p className="text-xs mt-1 italic" style={{ color: 'var(--text-secondary)' }}>
                              {suggestion.reason}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={wasAdded ? 'outline' : 'gradient'}
                          disabled={wasAdded || isAdding === suggestion.name}
                          onClick={() => handleAddChore(suggestion)}
                          className="flex-shrink-0 font-bold"
                        >
                          {wasAdded ? (
                            <><Check className="w-4 h-4 mr-1" /> Added</>
                          ) : isAdding === suggestion.name ? (
                            'Adding...'
                          ) : (
                            <><Plus className="w-4 h-4 mr-1" /> Add</>
                          )}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Refresh button */}
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={refreshSuggestions}
                  className="font-bold gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Show different suggestions
                </Button>
              </div>
            </>
          )}

          {/* No suggestions available */}
          {!isLoading && suggestions.length === 0 && children.length > 0 && selectedChild && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                You've covered the bases!
              </h3>
              <p style={{ color: 'var(--text-secondary)' }}>
                {selectedChildData?.name} already has a great set of chores. Keep up the good work!
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
