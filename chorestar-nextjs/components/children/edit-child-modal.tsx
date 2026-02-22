'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AvatarPicker } from '@/components/ui/avatar-picker'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { toast } from 'sonner'
import { Lock, Unlock, User, Palette, Trash2 } from 'lucide-react'
import { useSetChildPin, useRemoveChildPin } from '@/lib/hooks/useChildPin'
import type { Database } from '@/lib/supabase/database.types'

type Child = Database['public']['Tables']['children']['Row']

interface EditChildModalProps {
  child: Child
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function EditChildModal({ child, open, onOpenChange, onSuccess }: EditChildModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [formData, setFormData] = useState({
    name: child.name,
    age: child.age?.toString() || '',
    avatarUrl: child.avatar_url || '',
    avatarColor: child.avatar_color || '#6366f1',
  })

  // PIN management state
  const [showPinInput, setShowPinInput] = useState(false)
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [hasPinSet, setHasPinSet] = useState(false)
  const setChildPin = useSetChildPin()
  const removeChildPin = useRemoveChildPin()

  // Update form data when child changes
  useEffect(() => {
    setFormData({
      name: child.name,
      age: child.age?.toString() || '',
      avatarUrl: child.avatar_url || '',
      avatarColor: child.avatar_color || '#6366f1',
    })
    // Reset PIN input state when child changes
    setShowPinInput(false)
    setPin('')
    setConfirmPin('')
    checkPinStatus()
  }, [child])

  // Check if child has PIN set
  const checkPinStatus = async () => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('child_pins')
        .select('id')
        .eq('child_id', child.id)
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

    try {
      await setChildPin.mutateAsync({ childId: child.id, pin })
      toast.success(`🔐 PIN set for ${child.name}!`)
      setHasPinSet(true)
      setShowPinInput(false)
      setPin('')
      setConfirmPin('')
    } catch (error: any) {
      toast.error(error.message || 'Failed to set PIN')
    }
  }

  const handleRemovePin = async () => {
    try {
      await removeChildPin.mutateAsync(child.id)
      toast.success('PIN removed')
      setHasPinSet(false)
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove PIN')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('children')
        .update({
          name: formData.name,
          age: formData.age ? parseInt(formData.age) : null,
          avatar_color: formData.avatarColor,
          avatar_url: formData.avatarUrl,
        })
        .eq('id', child.id)

      if (error) throw error

      toast.success('Child updated successfully!')
      onSuccess()
    } catch (error: any) {
      console.error('Error updating child:', error)
      toast.error(error.message || 'Failed to update child')
    } finally {
      setIsLoading(false)
    }
  }

  const confirmDelete = async () => {
    setIsDeleting(true)

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('children')
        .delete()
        .eq('id', child.id)

      if (error) throw error

      toast.success(`${child.name} deleted successfully`)
      onSuccess()
    } catch (error: any) {
      console.error('Error deleting child:', error)
      toast.error(error.message || 'Failed to delete child')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          onClose={() => onOpenChange(false)}
          className="overflow-y-auto dialog-content-bg max-w-2xl"
        >
        <form onSubmit={handleSubmit}>
          <DialogHeader className="pb-2">
            <DialogTitle className="text-3xl font-black flex items-center gap-3" style={{
              background: 'var(--gradient-primary)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isLoading || isDeleting}
                className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg p-2 flex-shrink-0"
                title={`Delete ${child.name}`}
                aria-label={`Delete ${child.name}`}
                style={{ WebkitTextFillColor: 'initial' }}
              >
                <Trash2 className="w-5 h-5" />
              </Button>
              Edit {child.name}
            </DialogTitle>
          </DialogHeader>

          {/* Form Fields - Card-based sections */}
          <div className="space-y-6 mt-6 mb-6">

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
                  ? `${child.name} can log in with their PIN on the kid login page.`
                  : `Set a 4-6 digit PIN so ${child.name} can log in independently.`
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

          <DialogFooter className="gap-3">
            <Button
              type="button"
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isLoading || isDeleting}
              size="lg"
              className="flex-1 font-bold"
            >
              🗑️ Delete
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
              {isLoading ? '⏳ Saving...' : '✨ Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <ConfirmationDialog
      open={showDeleteConfirm}
      onOpenChange={setShowDeleteConfirm}
      onConfirm={confirmDelete}
      title="Delete Child?"
      description={`Are you sure you want to delete ${child.name}? This will also delete all their chores and cannot be undone.`}
      confirmText="Delete"
      cancelText="Cancel"
      variant="danger"
      isLoading={isDeleting}
    />
    </>
  )
}
