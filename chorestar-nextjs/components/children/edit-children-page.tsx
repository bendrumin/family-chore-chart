'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AvatarPicker } from '@/components/ui/avatar-picker'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Lock, Unlock, User, Palette, Trash2 } from 'lucide-react'
import { useSetChildPin, useRemoveChildPin } from '@/lib/hooks/useChildPin'
import type { Database } from '@/lib/supabase/database.types'

type Child = Database['public']['Tables']['children']['Row']

interface EditChildrenPageProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function EditChildrenPage({ open, onOpenChange, onSuccess }: EditChildrenPageProps) {
  const [children, setChildren] = useState<Child[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isLoadingChildren, setIsLoadingChildren] = useState(true)
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    avatarUrl: '',
    avatarColor: '#6366f1',
  })

  // PIN management state
  const [showPinInput, setShowPinInput] = useState(false)
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [hasPinSet, setHasPinSet] = useState(false)
  const setChildPin = useSetChildPin()
  const removeChildPin = useRemoveChildPin()

  // Load children when modal opens
  useEffect(() => {
    if (open) {
      loadChildren()
    }
  }, [open])

  // Update form when current child changes
  useEffect(() => {
    if (children.length > 0 && currentIndex < children.length) {
      const currentChild = children[currentIndex]
      setFormData({
        name: currentChild.name,
        age: currentChild.age?.toString() || '',
        avatarUrl: currentChild.avatar_url || '',
        avatarColor: currentChild.avatar_color || '#6366f1',
      })
      // Reset PIN input state and check PIN status for new child
      setShowPinInput(false)
      setPin('')
      setConfirmPin('')
      checkPinStatus(currentChild.id)
    }
  }, [currentIndex, children])

  // Check if child has PIN set
  const checkPinStatus = async (childId: string) => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('child_pins')
        .select('id')
        .eq('child_id', childId)
        .single()
      setHasPinSet(!!data)
    } catch (error) {
      setHasPinSet(false)
    }
  }

  const handleSetPin = async () => {
    if (pin.length < 4 || pin.length > 6) {
      toast.error('PIN must be 4-6 digits')
      return
    }

    if (pin !== confirmPin) {
      toast.error('PINs do not match')
      return
    }

    const currentChild = children[currentIndex]
    try {
      await setChildPin.mutateAsync({ childId: currentChild.id, pin })
      toast.success(`🔐 PIN set for ${currentChild.name}!`)
      setHasPinSet(true)
      setShowPinInput(false)
      setPin('')
      setConfirmPin('')
    } catch (error: any) {
      toast.error(error.message || 'Failed to set PIN')
    }
  }

  const handleRemovePin = async () => {
    const currentChild = children[currentIndex]
    try {
      await removeChildPin.mutateAsync(currentChild.id)
      toast.success('PIN removed')
      setHasPinSet(false)
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove PIN')
    }
  }

  const loadChildren = async () => {
    setIsLoadingChildren(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      const { data, error } = await supabase
        .from('children')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (error) throw error

      if (!data || data.length === 0) {
        toast.error('No children to edit')
        onOpenChange(false)
        return
      }

      setChildren(data)
      setCurrentIndex(0)
    } catch (error) {
      console.error('Error loading children:', error)
      toast.error('Failed to load children')
    } finally {
      setIsLoadingChildren(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (children.length === 0) return

    setIsLoading(true)

    try {
      const supabase = createClient()
      const currentChild = children[currentIndex]

      const { error } = await supabase
        .from('children')
        .update({
          name: formData.name,
          age: formData.age ? parseInt(formData.age) : null,
          avatar_color: formData.avatarColor,
          avatar_url: formData.avatarUrl,
        })
        .eq('id', currentChild.id)

      if (error) throw error

      toast.success(`✨ ${formData.name} updated!`)

      // Move to next child or close if this was the last one
      if (currentIndex < children.length - 1) {
        setCurrentIndex(currentIndex + 1)
      } else {
        // All done!
        toast.success('🎉 All children updated!')
        onSuccess()
        onOpenChange(false)
      }
    } catch (error: any) {
      console.error('Error updating child:', error)
      toast.error(error.message || 'Failed to update child')
    } finally {
      setIsLoading(false)
    }
  }

  const confirmDelete = async () => {
    const currentChild = children[currentIndex]
    setIsDeleting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('children').delete().eq('id', currentChild.id)
      if (error) throw error

      toast.success(`${currentChild.name} deleted`)
      const updated = children.filter((_, i) => i !== currentIndex)
      if (updated.length === 0) {
        onSuccess()
        onOpenChange(false)
        return
      }
      setChildren(updated)
      setCurrentIndex(Math.min(currentIndex, updated.length - 1))
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete child')
    } finally {
      setIsDeleting(false)
    }
  }

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const goToNext = () => {
    if (currentIndex < children.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const progress = children.length > 0 ? ((currentIndex + 1) / children.length) * 100 : 0

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClose={() => onOpenChange(false)}
        className="overflow-y-auto dialog-content-bg max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="px-2">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-3xl font-black flex items-center gap-3" style={{
              background: 'var(--gradient-primary)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              {children.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isLoading || isDeleting}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg p-2 flex-shrink-0"
                  title={`Delete ${children[currentIndex]?.name}`}
                  style={{ WebkitTextFillColor: 'initial' }}
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              )}
              👶 Edit Children
            </DialogTitle>
          </DialogHeader>

          {isLoadingChildren ? (
            // Loading skeleton
            <div className="space-y-6 mt-6 animate-pulse">
              <div className="h-32 bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-2xl" />
              <div className="h-48 bg-gradient-to-r from-purple-100 to-purple-200 dark:from-purple-900 dark:to-purple-800 rounded-2xl" />
              <div className="h-40 bg-gradient-to-r from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 rounded-2xl" />
            </div>
          ) : children.length > 0 && (
            <>
              {/* Navigation */}
              <div className="space-y-3 mt-4 mb-6">
                <div className="flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={goToPrevious}
                    disabled={currentIndex === 0}
                    className="font-bold"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>

                  <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    {currentIndex + 1} of {children.length}
                  </span>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={goToNext}
                    disabled={currentIndex === children.length - 1}
                    className="font-bold"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${progress}%`,
                      background: 'var(--gradient-primary)'
                    }}
                  />
                </div>
              </div>

              {/* Form Fields - Card-based sections */}
              <div className="space-y-6 my-6">

                {/* Basic Info Section - Blue accent */}
                <div className="p-4 sm:p-5 rounded-2xl border-2 border-blue-200 bg-blue-50/30 dark:border-blue-800 dark:bg-blue-900/20 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h4 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Child Information</h4>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name" className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                        Child's Name
                      </Label>
                      <Input
                        id="edit-name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        className="h-14 text-base font-semibold border-2 rounded-xl focus:ring-2 focus:ring-blue-200 transition-all input-bg-glass"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-age" className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                        Age (optional)
                      </Label>
                      <Input
                        id="edit-age"
                        type="number"
                        min="0"
                        max="99"
                        value={formData.age}
                        onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                        placeholder="e.g., 8"
                        className="h-14 text-base font-semibold border-2 rounded-xl focus:ring-2 focus:ring-blue-200 transition-all input-bg-glass"
                      />
                    </div>
                  </div>
                </div>

                {/* Avatar Section - Purple accent */}
                <div className="p-4 sm:p-5 rounded-2xl border-2 border-purple-200 bg-purple-50/30 dark:border-purple-800 dark:bg-purple-900/20 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-4">
                    <Palette className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <h4 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Avatar & Appearance</h4>
                  </div>

                  <AvatarPicker
                    currentAvatarUrl={formData.avatarUrl}
                    currentColor={formData.avatarColor}
                    onSelect={(url, color) => {
                      setFormData({ ...formData, avatarUrl: url, avatarColor: color })
                    }}
                  />
                </div>

                {/* PIN Management Section - Green accent */}
                <div className="p-4 sm:p-5 rounded-2xl border-2 border-green-200 bg-green-50/30 dark:border-green-800 dark:bg-green-900/20 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {hasPinSet ? (
                        <Lock className="w-6 h-6 text-green-600 dark:text-green-400" />
                      ) : (
                        <Unlock className="w-6 h-6 text-gray-400" />
                      )}
                      <h4 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Kid Login PIN</h4>
                    </div>
                    {hasPinSet && !showPinInput && (
                      <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                        ✓ Set
                      </span>
                    )}
                  </div>

                  <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                    {hasPinSet
                      ? `${formData.name} can log in with their PIN on the kid login page.`
                      : `Set a 4-6 digit PIN so ${formData.name} can log in independently.`
                    }
                  </p>

                  {!showPinInput ? (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPinInput(true)}
                        className="font-semibold"
                      >
                        {hasPinSet ? 'Change PIN' : 'Set PIN'}
                      </Button>
                      {hasPinSet && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRemovePin}
                          disabled={removeChildPin.isPending}
                          className="font-semibold text-red-600 hover:text-red-700"
                        >
                          Remove PIN
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="pin" className="text-sm font-semibold">
                          Enter PIN (4-6 digits)
                        </Label>
                        <Input
                          id="pin"
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={pin}
                          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="1234"
                          className="mt-1 font-mono text-lg"
                        />
                      </div>
                      <div>
                        <Label htmlFor="confirmPin" className="text-sm font-semibold">
                          Confirm PIN
                        </Label>
                        <Input
                          id="confirmPin"
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={confirmPin}
                          onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="1234"
                          className="mt-1 font-mono text-lg"
                        />
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          type="button"
                          variant="success"
                          size="sm"
                          onClick={handleSetPin}
                          disabled={setChildPin.isPending || pin.length < 4}
                          className="font-semibold text-white"
                        >
                          {setChildPin.isPending ? 'Setting...' : 'Save PIN'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setPin('')
                            setConfirmPin('')
                          }}
                          className="font-semibold"
                        >
                          Clear
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowPinInput(false)
                            setPin('')
                            setConfirmPin('')
                          }}
                          className="font-semibold"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
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
                  {isLoading ? '⏳ Saving...' : currentIndex === children.length - 1 ? '✨ Save & Finish' : '✨ Save & Next'}
                </Button>
              </div>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>

    <ConfirmationDialog
      open={showDeleteConfirm}
      onOpenChange={setShowDeleteConfirm}
      onConfirm={confirmDelete}
      title="Delete Child?"
      description={`Are you sure you want to delete ${children[currentIndex]?.name}? This will also delete all their chores and cannot be undone.`}
      confirmText="Delete"
      cancelText="Cancel"
      variant="danger"
      isLoading={isDeleting}
    />
    </>
  )
}
