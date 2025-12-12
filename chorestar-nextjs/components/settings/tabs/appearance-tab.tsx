'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Moon, Sun, Sparkles, Star, Calendar } from 'lucide-react'
import { useSettings } from '@/lib/contexts/settings-context'
import { toast } from 'sonner'
import { PremiumThemesModal } from '@/components/themes/premium-themes-modal'
import { SeasonalSuggestionsModal } from '@/components/chores/seasonal-suggestions-modal'
import { useAuth } from '@/lib/hooks/use-auth'

const SEASONAL_THEMES = [
  { id: 'christmas', name: 'Christmas', emoji: '🎄', colors: { primary: '#c41e3a', secondary: '#165b33' } },
  { id: 'halloween', name: 'Halloween', emoji: '🎃', colors: { primary: '#ff6600', secondary: '#1a1a1a' } },
  { id: 'spring', name: 'Spring', emoji: '🌸', colors: { primary: '#ff69b4', secondary: '#90ee90' } },
  { id: 'summer', name: 'Summer', emoji: '☀️', colors: { primary: '#ffd700', secondary: '#87ceeb' } },
  { id: 'fall', name: 'Fall', emoji: '🍂', colors: { primary: '#d2691e', secondary: '#8b4513' } },
  { id: 'winter', name: 'Winter', emoji: '❄️', colors: { primary: '#4682b4', secondary: '#b0c4de' } },
  { id: 'valentine', name: 'Valentine', emoji: '💕', colors: { primary: '#ff1493', secondary: '#ff69b4' } },
  { id: 'easter', name: 'Easter', emoji: '🐰', colors: { primary: '#9370db', secondary: '#ffb6c1' } },
  { id: 'thanksgiving', name: 'Thanksgiving', emoji: '🦃', colors: { primary: '#d2691e', secondary: '#cd853f' } },
  { id: 'newYear', name: 'New Year', emoji: '🎉', colors: { primary: '#ffd700', secondary: '#4169e1' } },
  { id: 'stPatricks', name: "St. Patrick's", emoji: '☘️', colors: { primary: '#228b22', secondary: '#90ee90' } },
  { id: 'ocean', name: 'Ocean', emoji: '🌊', colors: { primary: '#006994', secondary: '#17c0eb' } },
  { id: 'sunset', name: 'Sunset', emoji: '🌅', colors: { primary: '#ff6b35', secondary: '#f7931e' } },
]

export function AppearanceTab() {
  const { settings, updateSettings } = useSettings()
  const { user } = useAuth()
  const [localTheme, setLocalTheme] = useState<'light' | 'dark'>('light')
  const [seasonalTheme, setSeasonalTheme] = useState<string | null>(null)
  const [autoSeasonalEnabled, setAutoSeasonalEnabled] = useState(false)
  const [isPremiumThemesOpen, setIsPremiumThemesOpen] = useState(false)
  const [isSeasonalSuggestionsOpen, setIsSeasonalSuggestionsOpen] = useState(false)

  useEffect(() => {
    if (settings) {
      const customTheme = (settings.custom_theme as any) || {}
      setLocalTheme(customTheme.mode || 'light')
      setSeasonalTheme(customTheme.seasonalTheme || null)
      setAutoSeasonalEnabled(customTheme.autoSeasonal || false)
    }
  }, [settings])

  const handleThemeChange = async (theme: 'light' | 'dark') => {
    try {
      setLocalTheme(theme)
      const currentCustomTheme = (settings?.custom_theme as any) || {}
      const newCustomTheme = { ...currentCustomTheme, mode: theme }
      await updateSettings({ custom_theme: newCustomTheme })
      toast.success(theme === 'light' ? '☀️ Light theme activated!' : '🌙 Dark theme activated!')
    } catch (error) {
      console.error('Error updating theme:', error)
      toast.error('Failed to update theme')
      // Revert on error
      const customTheme = settings?.custom_theme as any
      setLocalTheme(customTheme?.mode || 'light')
    }
  }

  const handleSeasonalThemeChange = async (themeId: string | null) => {
    try {
      setSeasonalTheme(themeId)
      const currentCustomTheme = (settings?.custom_theme as any) || {}
      const newCustomTheme = { ...currentCustomTheme, seasonalTheme: themeId }

      console.log('🔄 Updating seasonal theme:', {
        themeId,
        currentCustomTheme,
        newCustomTheme
      })

      await updateSettings({ custom_theme: newCustomTheme })
      toast.success(themeId ? `${SEASONAL_THEMES.find(t => t.id === themeId)?.emoji} Theme applied!` : '✨ Theme removed!')
    } catch (error) {
      console.error('Error updating seasonal theme:', error)
      toast.error('Failed to update seasonal theme')
      const customTheme = settings?.custom_theme as any
      setSeasonalTheme(customTheme?.seasonalTheme || null)
    }
  }

  const handleAutoSeasonalToggle = async () => {
    try {
      const newValue = !autoSeasonalEnabled
      setAutoSeasonalEnabled(newValue)
      const currentCustomTheme = (settings?.custom_theme as any) || {}
      const newCustomTheme = { ...currentCustomTheme, autoSeasonal: newValue }
      await updateSettings({ custom_theme: newCustomTheme })
      toast.success(newValue ? '🔄 Auto seasonal themes enabled!' : '🔄 Auto seasonal themes disabled!')
    } catch (error) {
      console.error('Error updating auto seasonal:', error)
      toast.error('Failed to update auto seasonal setting')
      const customTheme = settings?.custom_theme as any
      setAutoSeasonalEnabled(customTheme?.autoSeasonal || false)
    }
  }

  return (
    <>
    <div className="space-y-6">
      {/* Theme Toggle */}
      <div className="space-y-3">
        <Label className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <span>Theme</span>
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant={localTheme === 'light' ? 'default' : 'outline'}
            onClick={() => handleThemeChange('light')}
            className="h-16 text-base font-bold hover-glow"
            size="lg"
          >
            <Sun className="w-6 h-6 mr-2" />
            Light
          </Button>
          <Button
            variant={localTheme === 'dark' ? 'default' : 'outline'}
            onClick={() => handleThemeChange('dark')}
            className="h-16 text-base font-bold hover-glow"
            size="lg"
          >
            <Moon className="w-6 h-6 mr-2" />
            Dark
          </Button>
        </div>
      </div>

      {/* Seasonal Themes Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Sparkles className="w-5 h-5" />
            Seasonal Themes
          </Label>
          <Button
            variant={autoSeasonalEnabled ? 'default' : 'outline'}
            size="sm"
            onClick={handleAutoSeasonalToggle}
            className="text-xs font-bold"
          >
            {autoSeasonalEnabled ? '🔄 Auto: ON' : '🔄 Auto: OFF'}
          </Button>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-80 overflow-y-auto p-2 bg-gray-50/50 rounded-xl">
          {/* None option */}
          <button
            onClick={() => handleSeasonalThemeChange(null)}
            className={`p-3 rounded-lg border-2 text-center transition-all duration-200 hover:scale-105 ${
              seasonalTheme === null
                ? 'border-transparent shadow-lg scale-105'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            style={{
              background: seasonalTheme === null
                ? 'rgba(99, 102, 241, 0.1)'
                : 'rgba(255, 255, 255, 0.8)',
              borderColor: seasonalTheme === null ? '#6366f1' : undefined
            }}
          >
            <div className="text-2xl mb-1">✨</div>
            <div className="text-xs font-bold" style={{
              color: seasonalTheme === null ? '#6366f1' : 'var(--text-primary)'
            }}>
              None
            </div>
          </button>

          {/* Seasonal theme options */}
          {SEASONAL_THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => handleSeasonalThemeChange(theme.id)}
              className={`p-3 rounded-lg border-2 text-center transition-all duration-200 hover:scale-105 ${
                seasonalTheme === theme.id
                  ? 'border-transparent shadow-lg scale-105'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              style={{
                background: seasonalTheme === theme.id
                  ? `linear-gradient(135deg, ${theme.colors.primary}15, ${theme.colors.secondary}15)`
                  : 'rgba(255, 255, 255, 0.8)',
                borderColor: seasonalTheme === theme.id ? theme.colors.primary : undefined
              }}
            >
              <div className="text-2xl mb-1">{theme.emoji}</div>
              <div className="text-xs font-bold" style={{
                color: seasonalTheme === theme.id ? theme.colors.primary : 'var(--text-primary)'
              }}>
                {theme.name}
              </div>
            </button>
          ))}
        </div>

        <p className="text-xs text-center px-4" style={{ color: 'var(--text-secondary)' }}>
          {autoSeasonalEnabled
            ? '🔄 Themes automatically change with holidays and seasons'
            : '💡 Enable auto mode to have themes change automatically throughout the year'}
        </p>
        {seasonalTheme && (
          <div className="mt-4 text-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSeasonalSuggestionsOpen(true)}
              className="font-bold"
            >
              <Calendar className="w-4 h-4 mr-2" />
              View Seasonal Activities
            </Button>
          </div>
        )}
      </div>

      {/* Premium Themes Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Star className="w-5 h-5" />
            Premium Themes
          </Label>
        </div>
        <div className="p-4 rounded-xl border-2 border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50">
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Unlock exclusive premium themes with unique color schemes and customization options!
          </p>
          <Button
            variant="gradient"
            size="lg"
            onClick={() => setIsPremiumThemesOpen(true)}
            className="font-bold hover-glow w-full"
          >
            <Star className="w-5 h-5 mr-2" />
            Browse Premium Themes
          </Button>
        </div>
      </div>

    </div>

    {/* Premium Themes Modal */}
    <PremiumThemesModal
      open={isPremiumThemesOpen}
      onOpenChange={setIsPremiumThemesOpen}
    />

    {/* Seasonal Suggestions Modal */}
    {user && (
      <SeasonalSuggestionsModal
        open={isSeasonalSuggestionsOpen}
        onOpenChange={setIsSeasonalSuggestionsOpen}
        childId={null}
        userId={user.id}
      />
    )}
    </>
  )
}
