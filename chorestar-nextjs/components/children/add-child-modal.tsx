'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { UserPlus, Sparkles } from 'lucide-react'

interface AddChildModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const AVATAR_SEEDS = ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Mason', 'Sophia', 'Lucas', 'Mia', 'Ethan']
const AVATAR_COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444', '#14b8a6']

export function AddChildModal({ open, onOpenChange, onSuccess }: AddChildModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    avatarSeed: AVATAR_SEEDS[Math.floor(Math.random() * AVATAR_SEEDS.length)],
    avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        toast.error('You must be logged in')
        return
      }

      const dicebearUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${formData.avatarSeed}`

      const { error } = await supabase.from('children').insert({
        user_id: user.id,
        name: formData.name,
        age: formData.age ? parseInt(formData.age) : null,
        avatar_color: formData.avatarColor,
        avatar_url: dicebearUrl,
      })

      if (error) throw error

      toast.success(`🎉 ${formData.name} added successfully!`)
      setFormData({
        name: '',
        age: '',
        avatarSeed: AVATAR_SEEDS[0],
        avatarColor: AVATAR_COLORS[0]
      })
      onSuccess()
    } catch (error: any) {
      console.error('Error adding child:', error)
      toast.error(error.message || 'Failed to add child')
    } finally {
      setIsLoading(false)
    }
  }

  return (
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
              <UserPlus className="w-8 h-8" style={{ color: 'var(--primary)' }} />
              Add Child
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 my-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                Child's Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Emma"
                required
                className="h-14 text-base font-semibold border-2 rounded-xl focus:ring-2 focus:ring-purple-200 transition-all"
                style={{
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(10px)'
                }}
              />
            </div>

            {/* Age */}
            <div className="space-y-2">
              <Label htmlFor="age" className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                Age (optional)
              </Label>
              <Input
                id="age"
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

            {/* Avatar Preview */}
            <div className="space-y-3">
              <Label className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Sparkles className="w-5 h-5" />
                Avatar
              </Label>
              <div
                className="flex items-center justify-between p-4 rounded-2xl border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 transition-all duration-300 hover:shadow-lg"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-20 h-20 rounded-2xl border-4 border-white overflow-hidden shadow-lg transition-transform duration-300 hover:scale-110"
                    style={{
                      background: `linear-gradient(135deg, ${formData.avatarColor} 0%, ${formData.avatarColor}dd 100%)`
                    }}
                  >
                    <img
                      src={`https://api.dicebear.com/7.x/bottts/svg?seed=${formData.avatarSeed}`}
                      alt="Avatar preview"
                      className="w-full h-full"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-700">Random Avatar</p>
                    <p className="text-xs text-gray-500">Click to randomize</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="gradient"
                  size="sm"
                  className="font-bold hover-glow"
                  onClick={() => {
                    const newSeed = AVATAR_SEEDS[Math.floor(Math.random() * AVATAR_SEEDS.length)]
                    const newColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
                    setFormData({ ...formData, avatarSeed: newSeed, avatarColor: newColor })
                  }}
                >
                  🎲 Randomize
                </Button>
              </div>
            </div>
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
            <Button
              type="submit"
              disabled={isLoading}
              variant="gradient"
              size="lg"
              className="flex-1 font-bold hover-glow"
            >
              {isLoading ? '⏳ Adding...' : '✨ Add Child'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
