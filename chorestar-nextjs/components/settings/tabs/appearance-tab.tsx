'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Moon, Sun, Monitor, Sparkles, Calendar, Bell, BellOff } from 'lucide-react'
import { useSettings } from '@/lib/contexts/settings-context'
import { SEASONAL_THEMES_DATA, ACCENT_THEMES, getCurrentSeasonalTheme } from '@/lib/constants/seasonal-themes'
import { ChoreIcon } from '@/components/ui/chore-icon'
import type { CustomTheme } from '@/lib/supabase/database.types'
import { toast } from 'sonner'
import { SeasonalSuggestionsModal } from '@/components/chores/seasonal-suggestions-modal'
import { useAuth } from '@/lib/hooks/use-auth'
import { notificationManager } from '@/lib/utils/notifications'

/**
 * Pickable themes, derived from the canonical tables so the picker can't drift
 * from what actually gets applied. This was a hand-kept fourth copy of the
 * colors; four of its entries (forest, aurora, coral, lavender) existed only
 * here, so choosing them applied no accent at all.
 */
const SEASONAL_THEMES = [
  ...Object.values(SEASONAL_THEMES_DATA),
  ...Object.values(ACCENT_THEMES),
].map(t => ({ id: t.id, name: t.name, emoji: t.icon, colors: t.colors }))

export function AppearanceTab() {
  const { settings, updateSettings } = useSettings()
  const { user } = useAuth()
  const [localTheme, setLocalTheme] = useState<'light' | 'dark' | 'auto'>('auto')
  const [seasonalTheme, setSeasonalTheme] = useState<string | null>(null)
  const [autoSeasonalEnabled, setAutoSeasonalEnabled] = useState(false)
  const [accentColor, setAccentColor] = useState<string | null>(null)
  const [draftAccent, setDraftAccent] = useState('#6366f1')
  const [isSeasonalSuggestionsOpen, setIsSeasonalSuggestionsOpen] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)

  useEffect(() => {
    if (settings) {
      const customTheme = (settings.custom_theme as CustomTheme) || {}
      setLocalTheme(customTheme.mode || 'auto')
      setSeasonalTheme(customTheme.seasonalTheme || null)
      setAutoSeasonalEnabled(customTheme.autoSeasonal || false)
      setAccentColor(customTheme.accentColor || null)
      setDraftAccent(customTheme.accentColor || '#6366f1')
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

      // "None" has to clear every source of a theme, not just the named pick.
      // Clearing seasonalTheme alone let auto-seasonal immediately re-resolve
      // today's season, so the accent never went away and None looked broken.
      const newCustomTheme = themeId
        ? { ...currentCustomTheme, seasonalTheme: themeId, accentColor: null }
        : { ...currentCustomTheme, seasonalTheme: null, accentColor: null, autoSeasonal: false }

      if (!themeId) {
        setAutoSeasonalEnabled(false)
        setAccentColor(null)
        setDraftAccent('#6366f1')
      } else {
        setAccentColor(null)
        setDraftAccent('#6366f1')
      }

      await updateSettings({ custom_theme: newCustomTheme })
      toast.success(themeId ? `${SEASONAL_THEMES.find(t => t.id === themeId)?.emoji} Theme applied!` : 'Back to the default accent')
    } catch (error) {
      console.error('Error updating seasonal theme:', error)
      toast.error('Failed to update seasonal theme')
      const customTheme = (settings?.custom_theme as CustomTheme) || {}
      setSeasonalTheme(customTheme.seasonalTheme || null)
      setAutoSeasonalEnabled(customTheme.autoSeasonal || false)
      setAccentColor(customTheme.accentColor || null)
      setDraftAccent(customTheme.accentColor || '#6366f1')
    }
  }

  const handleAccentColorChange = async (hex: string | null) => {
    try {
      setAccentColor(hex)
      // A custom accent replaces a named theme rather than layering on it.
      if (hex) setSeasonalTheme(null)
      const currentCustomTheme = (settings?.custom_theme as CustomTheme) || {}
      await updateSettings({
        custom_theme: { ...currentCustomTheme, accentColor: hex, seasonalTheme: hex ? null : currentCustomTheme.seasonalTheme ?? null },
      })
      toast.success(hex ? 'Accent color applied' : 'Custom accent cleared')
    } catch (error) {
      console.error('Error updating accent color:', error)
      toast.error('Failed to update accent color')
      const customTheme = (settings?.custom_theme as CustomTheme) || {}
      setAccentColor(customTheme.accentColor || null)
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
      setAccentColor(customTheme.accentColor || null)
      setDraftAccent(customTheme.accentColor || '#6366f1')
    }
  }

  // What auto-seasonal would pick right now, for the explanatory copy.
  const activeSeasonal = getCurrentSeasonalTheme()

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
                  ? `linear-gradient(180deg, ${localTheme === 'dark' ? theme.colors.dark.primary : theme.colors.light.primary}15, ${localTheme === 'dark' ? theme.colors.dark.secondary : theme.colors.light.secondary}15)`
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
                ? `Auto is on — today falls in the ${activeSeasonal.name} window.`
                : 'Auto is on — no season is active today, so no accent is applied.'
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

        {/* Custom accent */}
        <div className="mt-5 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <Label htmlFor="accent-color" className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                Custom accent color
              </Label>
              <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                {accentColor
                  ? 'Overrides the themes above.'
                  : 'Pick any color — it\'s adjusted automatically to stay readable.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="accent-color"
                type="color"
                value={draftAccent}
                // A color input fires change continuously while the picker is
                // dragged, so only the local draft tracks that; the write and
                // the toast happen once, on blur.
                onChange={(e) => setDraftAccent(e.target.value)}
                onBlur={() => {
                  if (draftAccent.toLowerCase() !== (accentColor ?? '').toLowerCase()) {
                    handleAccentColorChange(draftAccent)
                  }
                }}
                aria-label="Custom accent color"
                className="h-10 w-14 cursor-pointer rounded-lg border border-gray-300 bg-transparent p-1 dark:border-gray-600"
              />
              {accentColor && (
                <>
                  <span
                    className="rounded-full px-2.5 py-1 text-xs font-bold tabular-nums accent-fill"
                    title="Preview — this is how a badge will look"
                  >
                    {accentColor}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setDraftAccent('#6366f1'); handleAccentColorChange(null) }}
                    className="font-bold"
                  >
                    Clear
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
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

    </div>

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
