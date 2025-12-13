'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Sparkles, Star } from 'lucide-react'
import { useSettings } from '@/lib/contexts/settings-context'
import { toast } from 'sonner'

interface PremiumThemesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const PREMIUM_THEMES = [
  { id: 'ocean', name: 'Ocean', emoji: '🌊', colors: { primary: '#006994', secondary: '#17c0eb' }, premium: true },
  { id: 'sunset', name: 'Sunset', emoji: '🌅', colors: { primary: '#ff6b35', secondary: '#f7931e' }, premium: true },
  { id: 'forest', name: 'Forest', emoji: '🌲', colors: { primary: '#2d5016', secondary: '#4a7c59' }, premium: true },
  { id: 'aurora', name: 'Aurora', emoji: '🌌', colors: { primary: '#4a148c', secondary: '#7b2cbf' }, premium: true },
  { id: 'coral', name: 'Coral', emoji: '🪸', colors: { primary: '#ff6b6b', secondary: '#ee5a6f' }, premium: true },
  { id: 'lavender', name: 'Lavender', emoji: '💜', colors: { primary: '#9b59b6', secondary: '#8e44ad' }, premium: true },
]

export function PremiumThemesModal({ open, onOpenChange }: PremiumThemesModalProps) {
  const { settings, updateSettings } = useSettings()
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null)

  const handleThemeSelect = async (themeId: string) => {
    try {
      const currentCustomTheme = (settings?.custom_theme as any) || {}
      const newCustomTheme = { ...currentCustomTheme, seasonalTheme: themeId }
      
      await updateSettings({ custom_theme: newCustomTheme })
      setSelectedTheme(themeId)
      toast.success('✨ Premium theme applied!')
    } catch (error) {
      console.error('Error updating theme:', error)
      toast.error('Failed to apply theme')
    }
  }

  const currentTheme = (settings?.custom_theme as any)?.seasonalTheme || null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClose={() => onOpenChange(false)}
        className="max-w-4xl max-h-[90vh] overflow-y-auto dialog-content-bg"
      >
        <DialogHeader>
          <DialogTitle className="text-3xl font-black flex items-center gap-3" style={{
            background: 'var(--gradient-primary)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            <Sparkles className="w-8 h-8" style={{ color: 'var(--primary)' }} />
            Premium Themes
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Premium Notice */}
          <div className="p-6 rounded-xl border-2 border-yellow-200 dark:border-yellow-700 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/30 dark:to-amber-900/30 text-center">
            <div className="text-4xl mb-3">🌟</div>
            <h3 className="font-bold mb-2 text-yellow-800 dark:text-yellow-300">
              Unlock Premium Themes
            </h3>
            <p className="text-sm mb-4 text-gray-600 dark:text-gray-400">
              Upgrade to Premium to access exclusive themes and customize your ChoreStar experience!
            </p>
            <Button
              variant="gradient"
              size="lg"
              onClick={() => {
                // TODO: Open upgrade modal
                toast.info('Upgrade to Premium feature coming soon!')
              }}
              className="font-bold hover-glow"
            >
              Upgrade to Premium
            </Button>
          </div>

          {/* Themes Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {PREMIUM_THEMES.map((theme) => {
              const isActive = currentTheme === theme.id
              const isPremium = theme.premium

              return (
                <div
                  key={theme.id}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative ${
                    isActive
                      ? 'border-transparent shadow-lg scale-105'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                  }`}
                  style={{
                    background: isActive
                      ? `linear-gradient(135deg, ${theme.colors.primary}15, ${theme.colors.secondary}15)`
                      : undefined,
                    borderColor: isActive ? theme.colors.primary : undefined
                  }}
                  onClick={() => handleThemeSelect(theme.id)}
                >
                  {/* Premium Badge */}
                  {isPremium && (
                    <div className="absolute top-2 right-2">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    </div>
                  )}

                  {/* Theme Preview */}
                  <div className="text-center mb-3">
                    <div className="text-4xl mb-2">{theme.emoji}</div>
                    <div
                      className="text-sm font-bold"
                      style={{
                        color: isActive ? theme.colors.primary : 'var(--text-primary)'
                      }}
                    >
                      {theme.name}
                    </div>
                  </div>

                  {/* Color Preview */}
                  <div className="flex gap-1 justify-center">
                    <div
                      className="w-6 h-6 rounded-full border border-gray-200 dark:border-gray-700"
                      style={{ backgroundColor: theme.colors.primary }}
                    />
                    <div
                      className="w-6 h-6 rounded-full border border-gray-200 dark:border-gray-700"
                      style={{ backgroundColor: theme.colors.secondary }}
                    />
                  </div>

                  {isActive && (
                    <div className="text-xs text-center mt-2 font-bold" style={{ color: theme.colors.primary }}>
                      Active
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Info */}
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center">
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              💡 Premium themes unlock exclusive color schemes and customization options
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

