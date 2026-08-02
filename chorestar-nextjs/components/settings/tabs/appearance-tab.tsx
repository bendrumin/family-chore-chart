'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Moon, Sun, Monitor, Sparkles, Star, Calendar, Bell, BellOff, Clock } from 'lucide-react'
import { useSettings } from '@/lib/contexts/settings-context'
import { SEASONAL_THEMES_DATA, ACCENT_THEMES, getCurrentSeasonalTheme } from '@/lib/constants/seasonal-themes'
import { TIME_THEMES, getCurrentTimeTheme } from '@/lib/constants/time-themes'
import { ChoreIcon } from '@/components/ui/chore-icon'
import type { CustomTheme } from '@/lib/supabase/database.types'
import { toast } from 'sonner'
import { PremiumThemesModal } from '@/components/themes/premium-themes-modal'
import { SeasonalSuggestionsModal } from '@/components/chores/seasonal-suggestions-modal'
import { useAuth } from '@/lib/hooks/use-auth'
import { notificationManager } from '@/lib/utils/notifications'

/**
 * Pickable themes, derived from the canonical tables so the picker can't drift
 * from what actually gets applied. This list used to be a fourth hand-kept copy
 * of the colors; four of its entries (forest, aurora, coral, lavender) existed
 * only here, so choosing them applied no accent at all.
 */
const SEASONAL_THEMES = [
  ...Object.values(SEASONAL_THEMES_DATA),
  ...Object.values(ACCENT_THEMES),
].map(t => ({ id: t.id, name: t.name, emoji: t.icon, colors: t.colors }))

/** 14 -> "2pm", 0 -> "12am" */
function formatHour(hour: number): string {
  const h = ((hour % 24) + 24) % 24
  const suffix = h < 12 ? 'am' : 'pm'
  const display = h % 12 === 0 ? 12 : h % 12
  return `${display}${suffix}`
}

export function AppearanceTab() {
  const { settings, updateSettings } = useSettings()
  const { user } = useAuth()
  const [localTheme, setLocalTheme] = useState<'light' | 'dark' | 'auto'>('auto')
  const [seasonalTheme, setSeasonalTheme] = useState<string | null>(null)
  const [autoSeasonalEnabled, setAutoSeasonalEnabled] = useState(false)
  const [autoTimeOfDayEnabled, setAutoTimeOfDayEnabled] = useState(false)
  const [isPremiumThemesOpen, setIsPremiumThemesOpen] = useState(false)
  const [isSeasonalSuggestionsOpen, setIsSeasonalSuggestionsOpen] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)

  useEffect(() => {
    if (settings) {
      const customTheme = (settings.custom_theme as CustomTheme) || {}
      setLocalTheme(customTheme.mode || 'auto')
      setSeasonalTheme(customTheme.seasonalTheme || null)
      setAutoSeasonalEnabled(customTheme.autoSeasonal || false)
      setAutoTimeOfDayEnabled(customTheme.autoTimeOfDay || false)
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
      const currentCustomTheme = (settings?.custom_theme as CustomTheme) || {}
      const newCustomTheme = { ...currentCustomTheme, mode: theme }
      await updateSettings({ custom_theme: newCustomTheme })
      toast.success(theme === 'auto' ? '🔄 Auto theme activated!' : theme === 'light' ? '☀️ Light theme activated!' : '🌙 Dark theme activated!')
    } catch (error) {
      console.error('Error updating theme:', error)
      toast.error('Failed to update theme')
      // Revert on error
      const customTheme = (settings?.custom_theme as CustomTheme) || {}
      setLocalTheme(customTheme.mode || 'light')
    }
  }

  const handleSeasonalThemeChange = async (themeId: string | null) => {
    try {
      setSeasonalTheme(themeId)
      const currentCustomTheme = (settings?.custom_theme as CustomTheme) || {}
      const newCustomTheme = { ...currentCustomTheme, seasonalTheme: themeId }

      await updateSettings({ custom_theme: newCustomTheme })
      toast.success(themeId ? `${SEASONAL_THEMES.find(t => t.id === themeId)?.emoji} Theme applied!` : '✨ Theme removed!')
    } catch (error) {
      console.error('Error updating seasonal theme:', error)
      toast.error('Failed to update seasonal theme')
      const customTheme = (settings?.custom_theme as CustomTheme) || {}
      setSeasonalTheme(customTheme.seasonalTheme || null)
    }
  }

  const handleAutoSeasonalToggle = async () => {
    try {
      const newValue = !autoSeasonalEnabled
      setAutoSeasonalEnabled(newValue)
      const currentCustomTheme = (settings?.custom_theme as CustomTheme) || {}
      const newCustomTheme = { ...currentCustomTheme, autoSeasonal: newValue }
      await updateSettings({ custom_theme: newCustomTheme })
      toast.success(newValue ? '🔄 Auto seasonal themes enabled!' : '🔄 Auto seasonal themes disabled!')
    } catch (error) {
      console.error('Error updating auto seasonal:', error)
      toast.error('Failed to update auto seasonal setting')
      const customTheme = (settings?.custom_theme as CustomTheme) || {}
      setAutoSeasonalEnabled(customTheme.autoSeasonal || false)
    }
  }

  const handleAutoTimeOfDayToggle = async () => {
    try {
      const newValue = !autoTimeOfDayEnabled
      setAutoTimeOfDayEnabled(newValue)
      const currentCustomTheme = (settings?.custom_theme as CustomTheme) || {}
      const newCustomTheme = { ...currentCustomTheme, autoTimeOfDay: newValue }
      await updateSettings({ custom_theme: newCustomTheme })
      toast.success(newValue ? 'Time of day themes enabled!' : 'Time of day themes disabled!')
    } catch (error) {
      console.error('Error updating auto time of day:', error)
      toast.error('Failed to update time of day setting')
      const customTheme = (settings?.custom_theme as CustomTheme) || {}
      setAutoTimeOfDayEnabled(customTheme.autoTimeOfDay || false)
    }
  }

  // What each auto mode would pick right now, for the explanatory copy below.
  const activeSeasonal = getCurrentSeasonalTheme()
  const activeTimeTheme = getCurrentTimeTheme()

  // An explicit pick outranks both auto modes, and seasonal outranks time —
  // mirror resolveActiveTheme() so the UI explains what's actually in effect.
  const overriddenBy = seasonalTheme
    ? 'a theme you picked'
    : autoSeasonalEnabled && activeSeasonal
      ? `the ${activeSeasonal.name} theme`
      : null

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
              <ChoreIcon emoji={theme.emoji} className="w-7 h-7 mx-auto mb-1" />
              <div className="text-xs font-bold" style={{
                color: seasonalTheme === theme.id ? (localTheme === 'dark' ? theme.colors.dark.primary : theme.colors.light.primary) : 'var(--text-primary)'
              }}>
                {theme.name}
              </div>
            </button>
          ))}
        </div>

        <p className="text-xs text-center px-4" style={{ color: 'var(--text-secondary)' }}>
          {seasonalTheme
            ? 'A theme you picked stays until you choose None.'
            : autoSeasonalEnabled
              ? activeSeasonal
                ? `Auto is on — today is in the ${activeSeasonal.name} window.`
                : 'Auto is on — no season is active today, so no seasonal accent is applied.'
              : 'Enable auto mode to have themes change automatically throughout the year.'}
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

      {/* Time of Day Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Clock className="w-5 h-5" />
            <span>Time of Day</span>
          </Label>
          <Button
            variant={autoTimeOfDayEnabled ? 'default' : 'outline'}
            size="sm"
            onClick={handleAutoTimeOfDayToggle}
            className="text-xs font-bold"
          >
            {autoTimeOfDayEnabled ? 'On' : 'Off'}
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-2 p-2 bg-gray-50/50 dark:bg-gray-900/50 rounded-xl">
          {Object.values(TIME_THEMES).map((slot) => {
            const isNow = autoTimeOfDayEnabled && slot.id === activeTimeTheme.id && !overriddenBy
            const accent = localTheme === 'dark' ? slot.colors.dark : slot.colors.light
            return (
              <div
                key={slot.id}
                className={`rounded-lg border-2 p-3 text-center transition-all duration-200 ${
                  isNow
                    ? 'border-transparent shadow-lg'
                    : 'border-gray-200 bg-white/80 dark:border-gray-700 dark:bg-gray-800/80'
                }`}
                style={
                  isNow
                    ? {
                        background: `linear-gradient(135deg, ${accent.primary}15, ${accent.secondary}15)`,
                        borderColor: accent.primary,
                      }
                    : undefined
                }
              >
                <ChoreIcon emoji={slot.icon} className="w-7 h-7 mx-auto mb-1" />
                <div
                  className="text-xs font-bold"
                  style={{ color: isNow ? accent.primary : 'var(--text-primary)' }}
                >
                  {slot.name}
                </div>
                <div className="text-[10px] tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                  {formatHour(slot.startHour)}–{formatHour(slot.endHour)}
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-xs text-center px-4" style={{ color: 'var(--text-secondary)' }}>
          {!autoTimeOfDayEnabled
            ? 'Turn this on to shift the accent color through the day.'
            : overriddenBy
              ? `Currently overridden by ${overriddenBy} — a season always replaces the time of day palette rather than mixing with it.`
              : `Following the clock — it's ${activeTimeTheme.name.toLowerCase()} right now.`}
        </p>
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
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
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
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
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
