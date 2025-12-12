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

  // Update form data when child changes
  useEffect(() => {
    setFormData({
      name: child.name,
      age: child.age?.toString() || '',
      avatarUrl: child.avatar_url || '',
      avatarColor: child.avatar_color || '#6366f1',
    })
  }, [child])

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
          className="overflow-y-auto"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(249,250,251,0.98) 100%)',
            backdropFilter: 'blur(20px)'
          }}
        >
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-3xl font-black flex items-center gap-3" style={{
              background: 'var(--gradient-primary)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Edit {child.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 my-6">
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                Child's Name
              </Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="h-14 text-base font-semibold border-2 rounded-xl focus:ring-2 focus:ring-purple-200 transition-all"
                style={{
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(10px)'
                }}
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
                className="h-14 text-base font-semibold border-2 rounded-xl focus:ring-2 focus:ring-purple-200 transition-all"
                style={{
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(10px)'
                }}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                Avatar
              </Label>
              <AvatarPicker
                currentAvatarUrl={formData.avatarUrl}
                currentColor={formData.avatarColor}
                onSelect={(url, color) => {
                  setFormData({ ...formData, avatarUrl: url, avatarColor: color })
                }}
              />
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
