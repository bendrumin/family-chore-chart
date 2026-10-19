'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useSettings } from '@/lib/contexts/settings-context'
import { RewardAmountInput } from '@/components/chores/reward-amount-input'
import { isPerChoreMode, dailyRewardCents } from '@/lib/utils/earnings'
import { Edit3, DollarSign, FileText, Palette, CalendarDays, Camera } from 'lucide-react'
import { IconPicker } from '@/components/ui/icon-picker'
import { ChoreIcon } from '@/components/ui/chore-icon'
import { DayOfWeekPicker } from '@/components/chores/day-of-week-picker'
import { scheduleDays } from '@/lib/utils/schedule'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { getCategoryList, type ChoreCategory } from '@/lib/constants/categories'
import { sharedGroupOf, type SharedChoreFields, type StopSharingAction } from '@/lib/utils/shared-chores'
import { SharedChoreBadge } from '@/components/chores/shared-chore-badge'
import type { Database } from '@/lib/supabase/database.types'

type Chore = Database['public']['Tables']['chores']['Row']

interface EditChoreModalProps {
  chore: Chore
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function EditChoreModal({ chore, open, onOpenChange, onSuccess }: EditChoreModalProps) {
  const { settings } = useSettings()
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [formData, setFormData] = useState({
    name: chore.name,
    rewardCents: chore.reward_cents ?? 0,
    icon: chore.icon || '📝',
    category: (chore.category || 'household_chores') as ChoreCategory,
    days: scheduleDays(chore),
    requiresPhoto: Boolean(chore.requires_photo),
  })

  const categories = getCategoryList()
  // A shared chore (rotating or bonus) is one row per kid: edits and
  // deletes go to the whole group through the server.
  const shared = sharedGroupOf(chore as Chore & SharedChoreFields)

  // Update form data when chore changes
  useEffect(() => {
    setFormData({
      name: chore.name,
      rewardCents: chore.reward_cents ?? 0,
      icon: chore.icon || '📝',
      category: (chore.category || 'household_chores') as ChoreCategory,
      days: scheduleDays(chore),
      requiresPhoto: Boolean(chore.requires_photo),
    })
  }, [chore])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (shared) {
        const res = await fetch(`/api/chores/shared/${shared.groupId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            rewardCents: formData.rewardCents,
            icon: formData.icon,
            category: formData.category,
            daysOfWeek: formData.days.length ? formData.days : [0, 1, 2, 3, 4, 5, 6],
            requiresPhoto: formData.requiresPhoto,
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => null)
          throw new Error(data?.error || 'Failed to update chore')
        }
        toast.success(`${formData.name} updated for every kid sharing it`)
        onSuccess()
        return
      }

      const supabase = createClient()
      const { error } = await supabase
        .from('chores')
        .update({
          name: formData.name,
          reward_cents: formData.rewardCents,
          icon: formData.icon,
          category: formData.category,
          days_of_week: formData.days,
          requires_photo: formData.requiresPhoto,
        })
        .eq('id', chore.id)

      if (error) throw error

      toast.success(`${formData.name} updated successfully!`)
      onSuccess()
    } catch (error: any) {
      console.error('Error updating chore:', error)
      toast.error(error.message || 'Failed to update chore')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStopSharing = async (action: StopSharingAction) => {
    if (!shared) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/chores/shared/${shared.groupId}?action=${action}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Could not stop sharing that chore')
      }
      toast.success(
        action === 'archive'
          ? `Stopped sharing ${chore.name}. It's archived for every kid.`
          : `Stopped sharing ${chore.name}. It's deleted for every kid.`
      )
      setShowDeleteConfirm(false)
      onSuccess()
    } catch (error: any) {
      console.error('Error stopping shared chore:', error)
      toast.error(error.message || 'Could not stop sharing that chore')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDelete = async () => {
    if (shared) return handleStopSharing('delete')
    setIsDeleting(true)

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('chores')
        .delete()
        .eq('id', chore.id)

      if (error) throw error

      toast.success(`${chore.name} deleted successfully`)
      onSuccess()
    } catch (error: any) {
      console.error('Error deleting chore:', error)
      toast.error(error.message || 'Failed to delete chore')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClose={() => onOpenChange(false)}
        className="overflow-y-auto dialog-content-bg"
      >
        <form onSubmit={handleSubmit}>
          <DialogHeader className="pb-2">
            <DialogTitle className="text-3xl font-black flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
              <Edit3 className="w-8 h-8" style={{ color: 'var(--primary)' }} />
              Edit Chore
            </DialogTitle>
          </DialogHeader>

          {shared && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-sm text-indigo-900 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-100">
              <SharedChoreBadge chore={chore as Chore & SharedChoreFields} />
              <span>
                {shared.mode === 'rotate'
                  ? 'Your kids take turns with this chore. Changes here apply to every kid sharing it.'
                  : 'The first kid to finish this each day earns it. Changes here apply to every kid sharing it.'}
              </span>
            </div>
          )}

          <div className="space-y-6 mt-6 mb-6">
            {/* Basic Info Section - Blue accent */}
            <div className="p-4 sm:p-5 rounded-2xl border-2 border-blue-200 bg-blue-50/30 dark:border-blue-800 dark:bg-blue-900/20 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h4 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  Chore Information
                </h4>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                  Chore Name
                </Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Make bed, Do homework, Clean room"
                  required
                  className="h-14 text-base font-semibold border-2 rounded-xl focus:ring-2 focus:ring-blue-200 transition-all input-bg-glass"
                />
              </div>
            </div>

            {/* Reward Section - Green accent */}
            <div className="p-4 sm:p-5 rounded-2xl border-2 border-green-200 bg-green-50/30 dark:border-green-800 dark:bg-green-900/20 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                <h4 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  Reward
                </h4>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-reward" className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                  Reward Amount
                </Label>
                <RewardAmountInput
                  id="edit-reward"
                  valueCents={formData.rewardCents}
                  onChange={(rewardCents) => setFormData({ ...formData, rewardCents })}
                  currencyCode={settings?.currency_code}
                  affectsEarnings={isPerChoreMode(settings)}
                  dailyRateCents={dailyRewardCents(settings)}
                />
              </div>
            </div>

            {/* Schedule Section - Amber accent */}
            <div className="p-4 sm:p-5 rounded-2xl border-2 border-amber-200 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-900/20 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-4">
                <CalendarDays className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h4 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  Schedule
                </h4>
              </div>
              <DayOfWeekPicker
                idPrefix="edit-days"
                value={formData.days}
                onChange={(days) => setFormData({ ...formData, days })}
              />

              <label className="mt-4 flex items-start gap-3 cursor-pointer">
                <input
                  id="edit-requires-photo"
                  type="checkbox"
                  checked={formData.requiresPhoto}
                  onChange={(e) => setFormData({ ...formData, requiresPhoto: e.target.checked })}
                  className="mt-0.5 w-5 h-5 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    <Camera className="w-4 h-4 text-amber-600 dark:text-amber-400" aria-hidden />
                    Ask for a photo
                  </span>
                  <span className="block text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    Kids snap a picture when they check this off, and it waits for your OK.
                  </span>
                </span>
              </label>
            </div>

            {/* Appearance Section - Purple accent */}
            <div className="p-4 sm:p-5 rounded-2xl border-2 border-purple-200 bg-purple-50/30 dark:border-purple-800 dark:bg-purple-900/20 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-4">
                <Palette className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h4 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  Icon & Category
                </h4>
              </div>

              <div className="space-y-4">
                {/* Icon Picker */}
                <div className="space-y-2">
                  <Label className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <ChoreIcon emoji={formData.icon} className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                    Icon
                  </Label>
                  <IconPicker
                    currentIcon={formData.icon}
                    onSelect={(icon) => setFormData({ ...formData, icon })}
                  />
                </div>

                {/* Category Selection */}
                <div className="space-y-3">
                  <Label className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                    Category
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, category: category.id })}
                        className={`p-3 rounded-xl border-2 text-left transition-colors duration-200 ${
                          formData.category === category.id
                            ? 'border-transparent shadow-lg scale-105'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white/80 dark:bg-gray-800/80'
                        }`}
                        style={{
                          background: formData.category === category.id
                            ? category.bgColor
                            : undefined,
                          borderColor: formData.category === category.id
                            ? category.color
                            : undefined
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <ChoreIcon emoji={category.icon} className="w-7 h-7" />
                          <div className="flex-1">
                            <div className="font-bold text-sm" style={{
                              color: formData.category === category.id ? category.color : 'var(--text-primary)'
                            }}>
                              {category.label}
                            </div>
                            <div className="text-xs opacity-70">
                              {category.description.split(',')[0]}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>

          <DialogFooter className="gap-3">
            <Button
              type="button"
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isLoading || isDeleting}
              size="lg"
              className="flex-1 font-bold"
            >
              {isDeleting ? (shared ? 'Stopping...' : 'Deleting...') : shared ? 'Stop sharing' : 'Delete'}
            </Button>
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
            <Button
              type="submit"
              disabled={isLoading}
              variant="gradient"
              size="lg"
              className="flex-1 font-bold hover-glow"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {shared ? (
        <StopSharingDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          choreName={chore.name}
          isLoading={isDeleting}
          onChoose={handleStopSharing}
        />
      ) : (
      <ConfirmationDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        onConfirm={handleDelete}
        title={`Delete "${chore.name}"?`}
        description="This will also delete all completion history. This cannot be undone."
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />
      )}
    </Dialog>
  )
}

/**
 * Stopping a shared chore: archive (keeps history and what each kid earned)
 * or delete, both for every copy. Removing just one kid's copy would let the
 * daily rotation hand the chore to another kid, so that isn't offered.
 */
function StopSharingDialog({
  open,
  onOpenChange,
  choreName,
  isLoading,
  onChoose,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  choreName: string
  isLoading: boolean
  onChoose: (action: StopSharingAction) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-md dialog-content-bg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
            Stop sharing &ldquo;{choreName}&rdquo;?
          </DialogTitle>
        </DialogHeader>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
          This chore is shared between your kids, so it stops for all of them. Archive keeps its history and what each kid
          already earned; delete removes it and its history for good.
        </p>
        <DialogFooter className="mt-6 gap-3 flex-col sm:flex-row">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading} className="flex-1 font-bold">
            Cancel
          </Button>
          <Button type="button" variant="outline" onClick={() => onChoose('archive')} disabled={isLoading} className="flex-1 font-bold">
            Stop sharing &amp; archive
          </Button>
          <Button type="button" variant="destructive" onClick={() => onChoose('delete')} disabled={isLoading} className="flex-1 font-bold">
            Stop sharing &amp; delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
