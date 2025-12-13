'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AvatarPicker } from '@/components/ui/avatar-picker'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    avatarUrl: '',
    avatarColor: '#6366f1',
  })

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
    }
  }, [currentIndex, children])

  const loadChildren = async () => {
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClose={() => onOpenChange(false)}
        className="overflow-y-auto dialog-content-bg"
      >
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-3xl font-black flex items-center gap-3" style={{
              background: 'var(--gradient-primary)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              👶 Edit Children
            </DialogTitle>
          </DialogHeader>

          {children.length > 0 && (
            <>
              {/* Navigation */}
              <div className="space-y-3 my-4">
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

              {/* Form Fields */}
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
                    className="h-14 text-base font-semibold border-2 rounded-xl focus:ring-2 focus:ring-purple-200 transition-all input-bg-glass"
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
                    className="h-14 text-base font-semibold border-2 rounded-xl focus:ring-2 focus:ring-purple-200 transition-all input-bg-glass"
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
  )
}
