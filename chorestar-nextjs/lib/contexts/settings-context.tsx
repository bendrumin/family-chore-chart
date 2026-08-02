'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
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
  themeCssVars,
  THEME_CSS_VAR_NAMES,
} from '@/lib/utils/resolve-theme'
import { msUntilNextTimeTheme } from '@/lib/constants/time-themes'

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
        daily_reward_cents: 7,
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

    const theme = isDark ? 'dark' : 'light'

    // Exactly one theme is in effect — explicit pick, else auto-seasonal, else
    // auto-time-of-day. See lib/utils/resolve-theme.ts.
    const active = resolveActiveTheme(customTheme)

    // Remove any existing seasonal theme classes from both html and body
    const seasonalClasses = document.body.className.split(' ').filter(c => c.startsWith('seasonal-'))
    seasonalClasses.forEach(c => {
      document.body.classList.remove(c)
      document.documentElement.classList.remove(c)
    })
    document.documentElement.removeAttribute('data-time-theme')

    if (active) {
      // Only seasonal ids have matching CSS in globals.css; time themes are
      // driven purely by the custom properties below.
      if (active.seasonalId) {
        const seasonalClass = `seasonal-${active.seasonalId}`
        document.body.classList.add(seasonalClass)
        document.documentElement.classList.add(seasonalClass)
        document.documentElement.setAttribute('data-seasonal-theme', active.seasonalId)
      } else {
        document.documentElement.removeAttribute('data-seasonal-theme')
        document.documentElement.setAttribute('data-time-theme', active.id)
      }

      {
        const modeColors = theme === 'dark' ? active.colors.dark : active.colors.light

        // Drive the brand variables too, not just --seasonal-*, so the active
        // theme replaces the indigo/purple palette instead of sitting beside it.
        const vars = themeCssVars(active.colors, isDark)
        for (const [name, value] of Object.entries(vars)) {
          document.documentElement.style.setProperty(name, value)
        }

        // Wait for CSS to load, then apply additional theme styling
        setTimeout(() => {
          // Apply gradient to header if it exists
          const header = document.querySelector('header.glass')
          if (header) {
            const gradient = `linear-gradient(135deg, ${modeColors.primary} 0%, ${modeColors.secondary} 100%)`

            // Only apply gradient background for light themes with seasonal themes
            if (theme !== 'dark') {
              (header as HTMLElement).style.background = gradient

              // Make header text white for readability on gradient
              const headerTitle = header.querySelector('h1')
              const headerSubtitle = header.querySelector('p')
              if (headerTitle) {
                const titleEl = headerTitle as HTMLElement
                titleEl.style.color = 'white'
                titleEl.style.webkitTextFillColor = 'white'
                titleEl.style.backgroundClip = 'unset'
                titleEl.style.webkitBackgroundClip = 'unset'
              }
              if (headerSubtitle) {
                const subtitleEl = headerSubtitle as HTMLElement
                subtitleEl.style.color = 'rgba(255, 255, 255, 0.9)'
              }

              // Button colors are managed by React state in dashboard-client.tsx
            } else {
              // In dark mode, just keep the normal dark mode styling
              // Don't override button colors
            }
          }

        }, 50)
      }
    } else {
      document.documentElement.removeAttribute('data-seasonal-theme')
      // Clear every property a theme can set so the brand palette returns.
      THEME_CSS_VAR_NAMES.forEach(name => {
        document.documentElement.style.removeProperty(name)
      })

      // Reset header
      const header = document.querySelector('header.glass')
      if (header) {
        (header as HTMLElement).style.background = ''

        // Reset header text styles
        const headerTitle = header.querySelector('h1')
        const headerSubtitle = header.querySelector('p')
        if (headerTitle) {
          const titleEl = headerTitle as HTMLElement
          titleEl.style.removeProperty('color')
          titleEl.style.removeProperty('-webkit-text-fill-color')
          titleEl.style.removeProperty('background-clip')
          titleEl.style.removeProperty('-webkit-background-clip')
        }
        if (headerSubtitle) {
          const subtitleEl = headerSubtitle as HTMLElement
          subtitleEl.style.removeProperty('color')
        }

        // Button colors are managed by React state in dashboard-client.tsx
      }

    }
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
  const autoSeasonal = customTheme?.autoSeasonal ?? false
  const autoTimeOfDay = customTheme?.autoTimeOfDay ?? false

  // An auto theme is a function of the current time, so it has to be
  // re-evaluated as the clock moves — otherwise a tab left open overnight keeps
  // yesterday's palette. Re-apply at each time-window boundary (and hourly as a
  // backstop against a suspended timer or a clock change).
  useEffect(() => {
    if (!autoSeasonal && !autoTimeOfDay) return

    let timer: ReturnType<typeof setTimeout>

    const schedule = () => {
      const untilBoundary = msUntilNextTimeTheme()
      const wait = Math.min(untilBoundary, 60 * 60 * 1000) + 1000
      timer = setTimeout(() => {
        applyTheme((settings?.custom_theme ?? null) as CustomTheme | null)
        schedule()
      }, wait)
    }
    schedule()

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSeasonal, autoTimeOfDay, settings?.custom_theme])

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
