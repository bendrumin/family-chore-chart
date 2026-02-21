'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { SEASONAL_THEMES_DATA, getCurrentSeasonalTheme } from '@/lib/constants/seasonal-themes'
import { useSettings } from '@/lib/contexts/settings-context'

interface SeasonalSuggestionsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  childId: string | null
  userId: string
  onSuccess?: () => void
}

export function SeasonalSuggestionsModal({
  open,
  onOpenChange,
  childId,
  userId,
  onSuccess
}: SeasonalSuggestionsModalProps) {
  const { settings } = useSettings()
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [currentTheme, setCurrentTheme] = useState<ReturnType<typeof getCurrentSeasonalTheme>>(null)

  useEffect(() => {
    // Get current seasonal theme from settings or auto-detect
    const customTheme = (settings?.custom_theme as any) || {}
    const themeId = customTheme.seasonalTheme || null
    
    if (themeId && SEASONAL_THEMES_DATA[themeId]) {
      setCurrentTheme(SEASONAL_THEMES_DATA[themeId])
    } else {
      // Auto-detect based on current date
      setCurrentTheme(getCurrentSeasonalTheme())
    }
  }, [settings])

  const handleAddActivity = async (activity: { name: string; icon: string; category: string }) => {
    if (!childId) {
      toast.error('Please select a child first')
      return
    }

    setIsLoading(activity.name)

    try {
      const supabase = createClient()
      
      const { error } = await supabase.from('chores').insert({
        child_id: childId,
        name: activity.name,
        icon: activity.icon,
        category: activity.category,
        reward_cents: 7 // Default reward (7 cents)
      })

      if (error) throw error

      toast.success(`🎉 Added ${activity.name} to your activities!`)
      onSuccess?.()
    } catch (error: any) {
      console.error('Error adding seasonal activity:', error)
      toast.error('Failed to add activity')
    } finally {
      setIsLoading(null)
    }
  }

  if (!currentTheme) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          onClose={() => onOpenChange(false)}
          className="max-w-2xl"
        >
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center gap-3">
              <Sparkles className="w-6 h-6" />
              Seasonal Activity Suggestions
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 text-center">
            <p style={{ color: 'var(--text-secondary)' }}>
              No seasonal theme is currently active. Enable a seasonal theme in Settings to see activity suggestions!
            </p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClose={() => onOpenChange(false)}
        className="max-w-3xl max-h-[90vh] overflow-y-auto dialog-content-bg"
      >
        <DialogHeader>
          <DialogTitle className="text-3xl font-black flex items-center gap-3" style={{
            background: 'var(--gradient-primary)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            <Sparkles className="w-8 h-8" style={{ color: 'var(--primary)' }} />
            <span style={{ WebkitTextFillColor: 'initial' }}>{currentTheme.icon}</span> {currentTheme.name} Activity Suggestions
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Header */}
          <div className="p-6 rounded-xl text-center relative overflow-hidden" style={{
            background: 'linear-gradient(135deg, #f59e0b, #f97316)',
            color: 'white'
          }}>
            <div className="text-5xl mb-3">{currentTheme.icon}</div>
            <h3 className="text-2xl font-bold mb-2">
              {currentTheme.name} Activity Suggestions
            </h3>
            <p className="opacity-95 font-medium">
              Add these seasonal activities to make {currentTheme.name} special!
            </p>
          </div>

          {/* Activities Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentTheme.seasonalActivities.map((activity, index) => (
              <div
                key={index}
                className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm flex items-center gap-4 hover:border-orange-400 transition-all hover:shadow-lg relative overflow-hidden group"
              >
                {/* Top border animation on hover */}
                <div 
                  className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 to-orange-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"
                />
                
                <div className="text-4xl flex-shrink-0">{activity.icon}</div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold mb-1 group-hover:text-orange-600 transition-colors" style={{ color: 'var(--text-primary)' }}>
                    {activity.name}
                  </h4>
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {activity.category.replace('_', ' ')}
                  </span>
                </div>
                <Button
                  variant="gradient"
                  size="sm"
                  onClick={() => handleAddActivity(activity)}
                  disabled={isLoading === activity.name || !childId}
                  className="flex-shrink-0"
                >
                  {isLoading === activity.name ? 'Adding...' : 'Add Activity'}
                </Button>
              </div>
            ))}
          </div>

          {!childId && (
            <div className="p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/30 border-2 border-yellow-200 dark:border-yellow-700 text-center">
              <p className="text-sm font-bold text-yellow-800 dark:text-yellow-300">
                ⚠️ Please select a child first to add activities
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

