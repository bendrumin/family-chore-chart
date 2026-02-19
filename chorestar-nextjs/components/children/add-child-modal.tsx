'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { UserPlus, Sparkles, Crown, AlertCircle } from 'lucide-react'
import { playSound } from '@/lib/utils/sound'
import type { Database } from '@/lib/supabase/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

interface AddChildModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  currentChildCount?: number
}

const AVATAR_SEEDS = ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Mason', 'Sophia', 'Lucas', 'Mia', 'Ethan']
const AVATAR_COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444', '#14b8a6']

export function AddChildModal({ open, onOpenChange, onSuccess, currentChildCount = 0 }: AddChildModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    avatarSeed: AVATAR_SEEDS[Math.floor(Math.random() * AVATAR_SEEDS.length)],
    avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
  })

  useEffect(() => {
    if (open) {
      loadProfile()
    }
  }, [open])

  const loadProfile = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile(data)
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  const canAddChild = () => {
    const tier = profile?.subscription_tier || 'free'
    if (tier === 'free') {
      return currentChildCount < 3
    }
    return true // Premium and lifetime have unlimited
  }

  const isAtLimit = !canAddChild()

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

      playSound('celebration')
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
      playSound('error')
      toast.error(error.message || 'Failed to add child')
    } finally {
      setIsLoading(false)
    }
  }

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
              <UserPlus className="w-8 h-8" style={{ color: 'var(--primary)' }} />
              Add Child
            </DialogTitle>
          </DialogHeader>

          {/* Upgrade Prompt for Free Users at Limit */}
          {isAtLimit && (
            <div className="my-6 p-5 rounded-2xl border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50 dark:border-purple-700 dark:from-purple-900/30 dark:to-pink-900/30">
              <div className="flex items-start gap-3 mb-4">
                <Crown className="w-6 h-6 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                    Upgrade to Premium
                  </h4>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Free plan is limited to 3 children. Upgrade to add unlimited children and unlock all premium features!
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="gradient"
                size="lg"
                className="w-full font-bold hover-glow"
                onClick={() => {
                  onOpenChange(false)
                  // User can upgrade via Settings > Billing tab
                  toast.info('💡 Go to Settings → Billing to upgrade to Premium')
                }}
              >
                <Crown className="w-5 h-5 mr-2" />
                See Upgrade Options
              </Button>
            </div>
          )}

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
                className="h-14 text-base font-semibold border-2 rounded-xl focus:ring-2 focus:ring-purple-200 transition-all input-bg-glass"
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
                className="h-14 text-base font-semibold border-2 rounded-xl focus:ring-2 focus:ring-purple-200 transition-all input-bg-glass"
              />
            </div>

            {/* Avatar Preview */}
            <div className="space-y-3">
              <Label className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Sparkles className="w-5 h-5" />
                Avatar
              </Label>
              <div
                className="flex items-center justify-between p-4 rounded-2xl border-2 border-purple-200 dark:border-purple-700 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 transition-all duration-300 hover:shadow-lg"
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
              disabled={isLoading || isAtLimit}
              variant="gradient"
              size="lg"
              className="flex-1 font-bold hover-glow"
            >
              {isLoading ? '⏳ Adding...' : isAtLimit ? '🔒 Upgrade Required' : '✨ Add Child'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
