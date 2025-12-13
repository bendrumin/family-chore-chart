'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Sparkles, DollarSign } from 'lucide-react'
import { IconPicker } from '@/components/ui/icon-picker'
import { getCategoryList, type ChoreCategory } from '@/lib/constants/categories'
import { playSound } from '@/lib/utils/sound'

interface AddChoreModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  childId: string
  userId: string
  onSuccess: () => void
}

export function AddChoreModal({ open, onOpenChange, childId, userId, onSuccess }: AddChoreModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    rewardAmount: '1.00',
    icon: '📝',
    category: 'household_chores' as ChoreCategory
  })

  const categories = getCategoryList()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.from('chores').insert({
        child_id: childId,
        name: formData.name,
        reward_cents: Math.round(parseFloat(formData.rewardAmount) * 100),
        is_active: true,
        icon: formData.icon,
        category: formData.category,
      })

      if (error) throw error

      playSound('success')
      toast.success(`🎉 ${formData.name} added successfully!`)
      setFormData({ name: '', rewardAmount: '1.00', icon: '📝', category: 'household_chores' })
      onSuccess()
    } catch (error: any) {
      console.error('Error adding chore:', error)
      playSound('error')
      toast.error(error.message || 'Failed to add chore')
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
              <Sparkles className="w-8 h-8" style={{ color: 'var(--primary)' }} />
              Add New Chore
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 my-6">
            {/* Chore Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                Chore Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Make bed, Do homework, Clean room"
                required
                className="h-14 text-base font-semibold border-2 rounded-xl focus:ring-2 focus:ring-purple-200 transition-all input-bg-glass"
              />
            </div>

            {/* Icon Picker */}
            <div className="space-y-2">
              <Label className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <span>{formData.icon}</span>
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
                    className={`p-3 rounded-xl border-2 text-left transition-all duration-200 hover:scale-105 ${
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
                      <span className="text-2xl">{category.icon}</span>
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

            {/* Reward Amount */}
            <div className="space-y-2">
              <Label htmlFor="reward" className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <DollarSign className="w-5 h-5" />
                Reward Amount
              </Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-gray-500 dark:text-gray-400">$</span>
                <Input
                  id="reward"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.rewardAmount}
                  onChange={(e) => setFormData({ ...formData, rewardAmount: e.target.value })}
                  required
                  className="h-14 pl-10 text-xl font-bold border-2 rounded-xl focus:ring-2 focus:ring-purple-200 transition-all input-bg-glass"
                />
              </div>
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Child earns this amount for each completion
              </p>
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
              {isLoading ? '⏳ Adding...' : '✨ Add Chore'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
