'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Edit2 } from 'lucide-react'
import type { Database } from '@/lib/supabase/database.types'

type Chore = Database['public']['Tables']['chores']['Row']
type Child = Database['public']['Tables']['children']['Row']

interface BulkEditChoresModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  userId: string
}

export function BulkEditChoresModal({ open, onOpenChange, onSuccess, userId }: BulkEditChoresModalProps) {
  const [children, setChildren] = useState<Child[]>([])
  const [chores, setChores] = useState<Chore[]>([])
  const [selectedChoreIds, setSelectedChoreIds] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [bulkAction, setBulkAction] = useState<'category' | 'reward' | 'delete' | null>(null)
  const [newCategory, setNewCategory] = useState('household_chores')
  const [newReward, setNewReward] = useState('5')

  const choresPerPage = 10
  const totalPages = Math.ceil(chores.length / choresPerPage)
  const currentChores = chores.slice(currentPage * choresPerPage, (currentPage + 1) * choresPerPage)

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open, userId])

  const loadData = async () => {
    try {
      const supabase = createClient()

      // Load children
      const { data: childrenData, error: childrenError } = await supabase
        .from('children')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })

      if (childrenError) throw childrenError

      const children = childrenData || []
      const childIds = children.map(c => c.id)

      // Load all chores for this user's children
      let choresData: Chore[] = []
      if (childIds.length > 0) {
        const { data, error: choresError } = await supabase
          .from('chores')
          .select('*')
          .in('child_id', childIds)
          .eq('is_active', true)
          .order('created_at', { ascending: true })

        if (choresError) throw choresError
        choresData = data || []
      }

      setChildren(children)
      setChores(choresData)
    } catch (error: any) {
      console.error('Error loading data:', error)
      toast.error('Failed to load data')
    }
  }

  const toggleChoreSelection = (choreId: string) => {
    const newSelected = new Set(selectedChoreIds)
    if (newSelected.has(choreId)) {
      newSelected.delete(choreId)
    } else {
      newSelected.add(choreId)
    }
    setSelectedChoreIds(newSelected)
  }

  const selectAll = () => {
    setSelectedChoreIds(new Set(currentChores.map(c => c.id)))
  }

  const deselectAll = () => {
    setSelectedChoreIds(new Set())
  }

  const handleBulkUpdate = async () => {
    if (selectedChoreIds.size === 0) {
      toast.error('Please select at least one chore')
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()
      const choreIds = Array.from(selectedChoreIds)

      if (bulkAction === 'category') {
        const { error } = await supabase
          .from('chores')
          .update({ category: newCategory })
          .in('id', choreIds)

        if (error) throw error
        toast.success(`✨ Updated ${choreIds.length} chore${choreIds.length > 1 ? 's' : ''} category`)
      } else if (bulkAction === 'reward') {
        const { error } = await supabase
          .from('chores')
          .update({ reward_cents: parseInt(newReward) })
          .in('id', choreIds)

        if (error) throw error
        toast.success(`💰 Updated ${choreIds.length} chore${choreIds.length > 1 ? 's' : ''} reward`)
      } else if (bulkAction === 'delete') {
        const { error } = await supabase
          .from('chores')
          .update({ is_active: false })
          .in('id', choreIds)

        if (error) throw error
        toast.success(`🗑️ Deleted ${choreIds.length} chore${choreIds.length > 1 ? 's' : ''}`)
      }

      setSelectedChoreIds(new Set())
      setBulkAction(null)
      await loadData()
      onSuccess()
    } catch (error: any) {
      console.error('Error bulk updating chores:', error)
      toast.error(error.message || 'Failed to update chores')
    } finally {
      setIsLoading(false)
    }
  }

  const getChildName = (childId: string) => {
    const child = children.find(c => c.id === childId)
    return child?.name || 'Unknown'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="overflow-y-auto max-w-4xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(249,250,251,0.98) 100%)',
          backdropFilter: 'blur(20px)'
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-3xl font-black flex items-center gap-3" style={{
            background: 'var(--gradient-primary)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            <Edit2 className="w-8 h-8" style={{ color: 'var(--primary)' }} />
            Bulk Edit Chores
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 my-6">
          {/* Selection Controls */}
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
            <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              {selectedChoreIds.size} chore{selectedChoreIds.size !== 1 ? 's' : ''} selected
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={selectAll}
                className="font-bold"
              >
                Select All on Page
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={deselectAll}
                className="font-bold"
              >
                Deselect All
              </Button>
            </div>
          </div>

          {/* Chores List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {currentChores.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
                  No chores found
                </p>
              </div>
            ) : (
              currentChores.map((chore) => (
                <div
                  key={chore.id}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    selectedChoreIds.has(chore.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                  onClick={() => toggleChoreSelection(chore.id)}
                >
                  <div className="flex items-center gap-4">
                    <Checkbox
                      checked={selectedChoreIds.has(chore.id)}
                      onCheckedChange={() => toggleChoreSelection(chore.id)}
                      className="pointer-events-none"
                    />
                    <div className="flex-1">
                      <div className="font-bold" style={{ color: 'var(--text-primary)' }}>
                        {chore.name}
                      </div>
                      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {getChildName(chore.child_id)} • {chore.category?.replace('_', ' ')} • ${(chore.reward_cents || 0) / 100}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm font-bold">
                Page {currentPage + 1} of {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage === totalPages - 1}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {/* Bulk Actions */}
          {selectedChoreIds.size > 0 && (
            <div className="space-y-4 p-4 rounded-xl border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
              <Label className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                Bulk Actions
              </Label>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Button
                  type="button"
                  variant={bulkAction === 'category' ? 'default' : 'outline'}
                  onClick={() => setBulkAction(bulkAction === 'category' ? null : 'category')}
                  className="font-bold"
                >
                  Change Category
                </Button>
                <Button
                  type="button"
                  variant={bulkAction === 'reward' ? 'default' : 'outline'}
                  onClick={() => setBulkAction(bulkAction === 'reward' ? null : 'reward')}
                  className="font-bold"
                >
                  Change Reward
                </Button>
                <Button
                  type="button"
                  variant={bulkAction === 'delete' ? 'destructive' : 'outline'}
                  onClick={() => setBulkAction(bulkAction === 'delete' ? null : 'delete')}
                  className="font-bold"
                >
                  Delete Selected
                </Button>
              </div>

              {bulkAction === 'category' && (
                <div className="space-y-2">
                  <Label htmlFor="bulk-category">New Category</Label>
                  <select
                    id="bulk-category"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full h-12 px-4 text-sm font-semibold border-2 border-gray-300 rounded-xl bg-white"
                  >
                    <option value="household_chores">🏠 Household Chores</option>
                    <option value="learning_education">📚 Learning & Education</option>
                    <option value="physical_activity">🏃 Physical Activity</option>
                    <option value="creative_time">🎨 Creative Time</option>
                    <option value="games_play">🎮 Games & Play</option>
                    <option value="reading">📖 Reading</option>
                    <option value="family_time">❤️ Family Time</option>
                    <option value="custom">⚙️ Custom</option>
                  </select>
                </div>
              )}

              {bulkAction === 'reward' && (
                <div className="space-y-2">
                  <Label htmlFor="bulk-reward">New Reward (cents)</Label>
                  <Input
                    id="bulk-reward"
                    type="number"
                    min="0"
                    max="100"
                    value={newReward}
                    onChange={(e) => setNewReward(e.target.value)}
                    className="h-12"
                  />
                </div>
              )}

              {bulkAction === 'delete' && (
                <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                  <p className="text-sm font-bold text-red-900">
                    ⚠️ This will delete {selectedChoreIds.size} chore{selectedChoreIds.size !== 1 ? 's' : ''}. This action cannot be undone.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            size="lg"
            className="flex-1 font-bold"
          >
            Cancel
          </Button>
          {bulkAction && (
            <Button
              type="button"
              variant={bulkAction === 'delete' ? 'destructive' : 'gradient'}
              onClick={handleBulkUpdate}
              disabled={isLoading || selectedChoreIds.size === 0}
              size="lg"
              className="flex-1 font-bold hover-glow"
            >
              {isLoading ? '⏳ Updating...' : `✨ Apply ${bulkAction === 'delete' ? 'Delete' : 'Changes'}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
