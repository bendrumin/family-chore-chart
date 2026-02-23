'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Moon, Sun, Monitor, Sparkles, Star, Calendar, Bell, BellOff } from 'lucide-react'
import { useSettings } from '@/lib/contexts/settings-context'
import { toast } from 'sonner'
import { PremiumThemesModal } from '@/components/themes/premium-themes-modal'
import { SeasonalSuggestionsModal } from '@/components/chores/seasonal-suggestions-modal'
import { useAuth } from '@/lib/hooks/use-auth'
import { notificationManager } from '@/lib/utils/notifications'

const SEASONAL_THEMES = [
  {
    id: 'christmas',
    name: 'Christmas',
    emoji: '🎄',
    colors: {
      light: { primary: '#c41e3a', secondary: '#165b33' },
      dark: { primary: '#ff4757', secondary: '#2ed573' }
    }
  },
  {
    id: 'halloween',
    name: 'Halloween',
    emoji: '🎃',
    colors: {
      light: { primary: '#ff6600', secondary: '#1a1a1a' },
      dark: { primary: '#ff8c42', secondary: '#7b68ee' }
    }
  },
  {
    id: 'spring',
    name: 'Spring',
    emoji: '🌸',
    colors: {
      light: { primary: '#ff69b4', secondary: '#90ee90' },
      dark: { primary: '#ff85c1', secondary: '#98fb98' }
    }
  },
  {
    id: 'summer',
    name: 'Summer',
    emoji: '☀️',
    colors: {
      light: { primary: '#ffd700', secondary: '#87ceeb' },
      dark: { primary: '#ffe135', secondary: '#4fc3f7' }
    }
  },
  {
    id: 'fall',
    name: 'Fall',
    emoji: '🍂',
    colors: {
      light: { primary: '#d2691e', secondary: '#8b4513' },
      dark: { primary: '#ff8c42', secondary: '#cd853f' }
    }
  },
  {
    id: 'winter',
    name: 'Winter',
    emoji: '❄️',
    colors: {
      light: { primary: '#4682b4', secondary: '#b0c4de' },
      dark: { primary: '#64b5f6', secondary: '#90caf9' }
    }
  },
  {
    id: 'valentine',
    name: 'Valentine',
    emoji: '💕',
    colors: {
      light: { primary: '#ff1493', secondary: '#ff69b4' },
      dark: { primary: '#ff4081', secondary: '#f48fb1' }
    }
  },
  {
    id: 'easter',
    name: 'Easter',
    emoji: '🐰',
    colors: {
      light: { primary: '#9370db', secondary: '#ffb6c1' },
      dark: { primary: '#ba68c8', secondary: '#f8bbd0' }
    }
  },
  {
    id: 'thanksgiving',
    name: 'Thanksgiving',
    emoji: '🦃',
    colors: {
      light: { primary: '#d2691e', secondary: '#cd853f' },
      dark: { primary: '#ff8c42', secondary: '#daa520' }
    }
  },
  {
    id: 'newYear',
    name: 'New Year',
    emoji: '🎉',
    colors: {
      light: { primary: '#ffd700', secondary: '#4169e1' },
      dark: { primary: '#ffe135', secondary: '#5e92f3' }
    }
  },
  {
    id: 'stPatricks',
    name: "St. Patrick's",
    emoji: '☘️',
    colors: {
      light: { primary: '#228b22', secondary: '#90ee90' },
      dark: { primary: '#4caf50', secondary: '#81c784' }
    }
  },
  {
    id: 'sunset',
    name: 'Sunset',
    emoji: '🌅',
    colors: {
      light: { primary: '#f97316', secondary: '#fb923c' },
      dark: { primary: '#f97316', secondary: '#fdba74' }
    }
  },
  {
    id: 'ocean',
    name: 'Ocean',
    emoji: '🌊',
    colors: {
      light: { primary: '#006994', secondary: '#17c0eb' },
      dark: { primary: '#0288d1', secondary: '#29b6f6' }
    }
  },
  {
    id: 'forest',
    name: 'Forest',
    emoji: '🌲',
    colors: {
      light: { primary: '#2d5016', secondary: '#4a7c59' },
      dark: { primary: '#166534', secondary: '#22c55e' }
    }
  },
  {
    id: 'aurora',
    name: 'Aurora',
    emoji: '🌌',
    colors: {
      light: { primary: '#4a148c', secondary: '#7b2cbf' },
      dark: { primary: '#6d28d9', secondary: '#8b5cf6' }
    }
  },
  {
    id: 'coral',
    name: 'Coral',
    emoji: '🪸',
    colors: {
      light: { primary: '#ff6b6b', secondary: '#ee5a6f' },
      dark: { primary: '#ef4444', secondary: '#f87171' }
    }
  },
  {
    id: 'lavender',
    name: 'Lavender',
    emoji: '💜',
    colors: {
      light: { primary: '#9b59b6', secondary: '#8e44ad' },
      dark: { primary: '#a78bfa', secondary: '#c4b5fd' }
    }
  },
]

export function AppearanceTab() {
  const { settings, updateSettings } = useSettings()
  const { user } = useAuth()
  const [localTheme, setLocalTheme] = useState<'light' | 'dark' | 'auto'>('auto')
  const [seasonalTheme, setSeasonalTheme] = useState<string | null>(null)
  const [autoSeasonalEnabled, setAutoSeasonalEnabled] = useState(false)
  const [isPremiumThemesOpen, setIsPremiumThemesOpen] = useState(false)
  const [isSeasonalSuggestionsOpen, setIsSeasonalSuggestionsOpen] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)

  useEffect(() => {
    if (settings) {
      const customTheme = (settings.custom_theme as any) || {}
      setLocalTheme(customTheme.mode || 'auto')
      setSeasonalTheme(customTheme.seasonalTheme || null)
      setAutoSeasonalEnabled(customTheme.autoSeasonal || false)
    }
    
    // Check notification permission
    if (typeof window !== 'undefined') {
      setNotificationsEnabled(notificationManager.isEnabled())
    }
  }, [settings])
  
  const handleNotificationToggle = async () => {
    if (notificationsEnabled) {
      // Can't revoke permission, but we can note it's disabled
      setNotificationsEnabled(false)
      toast.info('Notifications disabled. Enable in browser settings to re-enable.')
    } else {
      const granted = await notificationManager.requestPermission()
      if (granted) {
        setNotificationsEnabled(true)
        toast.success('🔔 Notifications enabled!')
      } else {
        toast.error('Notification permission denied')
      }
    }
  }

  const handleThemeChange = async (theme: 'light' | 'dark' | 'auto') => {
    try {
      setLocalTheme(theme)
      const currentCustomTheme = (settings?.custom_theme as any) || {}
      const newCustomTheme = { ...currentCustomTheme, mode: theme }
      await updateSettings({ custom_theme: newCustomTheme })
      toast.success(theme === 'auto' ? '🔄 Auto theme activated!' : theme === 'light' ? '☀️ Light theme activated!' : '🌙 Dark theme activated!')
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
        <div className="grid grid-cols-3 gap-3">
          <Button
            variant={localTheme === 'auto' ? 'default' : 'outline'}
            onClick={() => handleThemeChange('auto')}
            className="h-16 text-base font-bold hover-glow"
            size="lg"
          >
            <Monitor className="w-6 h-6 mr-2" />
            Auto
          </Button>
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
        {localTheme === 'auto' && (
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Follows your system preference and time of day (dark after 7 PM)
          </p>
        )}
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

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-80 overflow-y-auto p-2 bg-gray-50/50 dark:bg-gray-900/50 rounded-xl">
          {/* None option */}
          <button
            onClick={() => handleSeasonalThemeChange(null)}
            className={`p-3 rounded-lg border-2 text-center transition-all duration-200 hover:scale-105 ${
              seasonalTheme === null
                ? 'border-transparent shadow-lg scale-105'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white/80 dark:bg-gray-800/80'
            }`}
            style={{
              background: seasonalTheme === null
                ? 'rgba(99, 102, 241, 0.1)'
                : undefined,
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
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white/80 dark:bg-gray-800/80'
              }`}
              style={{
                background: seasonalTheme === theme.id
                  ? `linear-gradient(135deg, ${localTheme === 'dark' ? theme.colors.dark.primary : theme.colors.light.primary}15, ${localTheme === 'dark' ? theme.colors.dark.secondary : theme.colors.light.secondary}15)`
                  : undefined,
                borderColor: seasonalTheme === theme.id ? (localTheme === 'dark' ? theme.colors.dark.primary : theme.colors.light.primary) : undefined
              }}
            >
              <div className="text-2xl mb-1">{theme.emoji}</div>
              <div className="text-xs font-bold" style={{
                color: seasonalTheme === theme.id ? (localTheme === 'dark' ? theme.colors.dark.primary : theme.colors.light.primary) : 'var(--text-primary)'
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

      {/* Notifications Section */}
      <div className="space-y-3">
        <Label className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          {notificationsEnabled ? (
            <Bell className="w-5 h-5" />
          ) : (
            <BellOff className="w-5 h-5" />
          )}
          Push Notifications
        </Label>
        <div className="p-4 rounded-xl border-2 border-blue-200 dark:border-blue-700 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30">
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Get reminders for daily chores and weekly progress reports
          </p>
          <Button
            variant={notificationsEnabled ? 'outline' : 'gradient'}
            size="lg"
            onClick={handleNotificationToggle}
            className="font-bold hover-glow w-full"
          >
            {notificationsEnabled ? (
              <>
                <BellOff className="w-5 h-5 mr-2" />
                Disable Notifications
              </>
            ) : (
              <>
                <Bell className="w-5 h-5 mr-2" />
                Enable Notifications
              </>
            )}
          </Button>
        </div>
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
