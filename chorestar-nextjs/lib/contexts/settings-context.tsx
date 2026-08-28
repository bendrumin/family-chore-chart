'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { DEFAULT_DAILY_REWARD_CENTS } from '@/lib/utils/earnings'
import { createClient } from '@/lib/supabase/client'
import type { Database, CustomTheme } from '@/lib/supabase/database.types'
import {
  applyThemeClasses,
  resolveIsDark,
  setStoredThemeMode,
  type ThemeMode,
} from '@/lib/utils/theme-mode'
import {
  resolveActiveTheme,
  themeVarsFor,
  THEME_CSS_VAR_NAMES,
  RETIRED_THEMED_SURFACE_VARS,
} from '@/lib/utils/resolve-theme'

type FamilySettings = Database['public']['Tables']['family_settings']['Row']

interface SettingsContextType {
  settings: FamilySettings | null
  isLoading: boolean
  updateSettings: (updates: Partial<FamilySettings>) => Promise<void>
  refreshSettings: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children, userId }: { children: ReactNode; userId: string }) {
  const [settings, setSettings] = useState<FamilySettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadSettings = async () => {
    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('family_settings')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading settings:', error)
        // Create default settings if none exist
        await createDefaultSettings()
        return
      }

      if (data) {
        setSettings(data)
        applyTheme((data.custom_theme ?? null) as CustomTheme | null)
      } else {
        await createDefaultSettings()
      }
    } catch (error) {
      console.error('Error in loadSettings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const createDefaultSettings = async () => {
    try {
      const supabase = createClient()

      const defaultSettings = {
        user_id: userId,
        language: 'en',
        currency_code: 'USD',
        locale: 'en-US',
        date_format: 'auto',
        custom_theme: { mode: 'auto', seasonalTheme: null, autoSeasonal: false },
        daily_reward_cents: DEFAULT_DAILY_REWARD_CENTS,
        weekly_bonus_cents: 1,
        timezone: 'UTC',
      }

      const { data, error } = await supabase
        .from('family_settings')
        .insert(defaultSettings)
        .select()
        .single()

      if (error) throw error

      setSettings(data)
      applyTheme((data.custom_theme ?? null) as CustomTheme | null)
    } catch (error) {
      console.error('Error creating default settings:', error)
    }
  }

  const applyTheme = (customTheme: CustomTheme | null | undefined) => {
    const mode = (customTheme?.mode || 'auto') as ThemeMode
    setStoredThemeMode(mode)
    const isDark = resolveIsDark(mode)
    applyThemeClasses(isDark)

    const root = document.documentElement
    const active = resolveActiveTheme(customTheme)

    // The `seasonal-<id>` class is deliberately NOT applied.
    //
    // globals.css carries a second, entirely CSS-driven seasonal system keyed on
    // that class, and it paints full-bleed surfaces with !important:
    //   html.seasonal-summer      { background: var(--seasonal-bg) !important }
    //   html[class*="seasonal-"]  { --header-gradient: var(--seasonal-gradient) }
    //   header.glass              { background: var(--header-gradient) !important }
    // With summer's #fffbeb page tint and #f59e0b header, that is what turned the
    // dashboard yellow. Making the JS accent-only wasn't enough while the class
    // was still being applied, because the CSS path is independent of it.
    //
    // Removing the class leaves those selectors unmatched, so all of it is inert.
    // Themes now reach the UI solely through the inline accent properties below.
    for (const c of document.body.className.split(' ').filter(c => c.startsWith('seasonal-'))) {
      document.body.classList.remove(c)
      root.classList.remove(c)
    }

    // Strip any surface property an older build wrote, and never set them again.
    for (const name of RETIRED_THEMED_SURFACE_VARS) root.style.removeProperty(name)
    // Clear every theme property first, so switching from a full-reach theme to
    // an accent-only one can't leave the previous accent ramp in place.
    for (const name of THEME_CSS_VAR_NAMES) root.style.removeProperty(name)

    if (!active) {
      root.removeAttribute('data-seasonal-theme')
      root.removeAttribute('data-theme-reach')
      for (const name of THEME_CSS_VAR_NAMES) root.style.removeProperty(name)
      return
    }

    // Inert marker — no CSS matches it. Useful for inspecting the active theme.
    root.setAttribute('data-seasonal-theme', active.id)

    // A full-reach theme also rewrites the Tailwind accent ramp, which is what
    // carries the accent into the compiled indigo/purple utility classes.
    for (const [name, value] of Object.entries(themeVarsFor(active, isDark))) {
      root.style.setProperty(name, value)
    }
    root.setAttribute('data-theme-reach', active.fullReach ? 'full' : 'accent')
  }

  const updateSettings = async (updates: Partial<FamilySettings>) => {
    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('family_settings')
        .upsert({ user_id: userId, ...updates }, { onConflict: 'user_id' })
        .select()
        .single()

      if (error) throw error

      setSettings(data)

      // Apply theme if it was updated
      if (updates.custom_theme !== undefined) {
        applyTheme((updates.custom_theme ?? null) as CustomTheme | null)
      }
    } catch (error) {
      console.error('Error updating settings:', error)
      throw error
    }
  }

  const refreshSettings = async () => {
    await loadSettings()
  }

  useEffect(() => {
    if (userId) {
      loadSettings()
    }
  }, [userId])

  const customTheme = (settings?.custom_theme ?? null) as CustomTheme | null

  // Auto-seasonal is a function of today's date, so a tab left open across
  // midnight would otherwise keep yesterday's accent. Re-check hourly.
  useEffect(() => {
    if (!customTheme?.autoSeasonal) return
    const timer = setInterval(() => applyTheme(customTheme), 60 * 60 * 1000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customTheme?.autoSeasonal, customTheme?.seasonalTheme])

  return (
    <SettingsContext.Provider value={{ settings, isLoading, updateSettings, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}
