'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'

// Seasonal theme colors with dark mode support
const SEASONAL_THEME_COLORS: Record<string, { light: { primary: string; secondary: string }, dark: { primary: string; secondary: string } }> = {
  christmas: {
    light: { primary: '#c41e3a', secondary: '#165b33' },
    dark: { primary: '#ff4757', secondary: '#2ed573' }
  },
  halloween: {
    light: { primary: '#ff6600', secondary: '#1a1a1a' },
    dark: { primary: '#ff8c42', secondary: '#7b68ee' }
  },
  spring: {
    light: { primary: '#ff69b4', secondary: '#90ee90' },
    dark: { primary: '#ff85c1', secondary: '#98fb98' }
  },
  summer: {
    light: { primary: '#ffd700', secondary: '#87ceeb' },
    dark: { primary: '#ffe135', secondary: '#4fc3f7' }
  },
  fall: {
    light: { primary: '#d2691e', secondary: '#8b4513' },
    dark: { primary: '#ff8c42', secondary: '#cd853f' }
  },
  winter: {
    light: { primary: '#4682b4', secondary: '#b0c4de' },
    dark: { primary: '#64b5f6', secondary: '#90caf9' }
  },
  valentine: {
    light: { primary: '#ff1493', secondary: '#ff69b4' },
    dark: { primary: '#ff4081', secondary: '#f48fb1' }
  },
  easter: {
    light: { primary: '#9370db', secondary: '#ffb6c1' },
    dark: { primary: '#ba68c8', secondary: '#f8bbd0' }
  },
  thanksgiving: {
    light: { primary: '#d2691e', secondary: '#cd853f' },
    dark: { primary: '#ff8c42', secondary: '#daa520' }
  },
  newYear: {
    light: { primary: '#ffd700', secondary: '#4169e1' },
    dark: { primary: '#ffe135', secondary: '#5e92f3' }
  },
  stPatricks: {
    light: { primary: '#228b22', secondary: '#90ee90' },
    dark: { primary: '#4caf50', secondary: '#81c784' }
  },
  ocean: {
    light: { primary: '#006994', secondary: '#17c0eb' },
    dark: { primary: '#0288d1', secondary: '#29b6f6' }
  },
  sunset: {
    light: { primary: '#f97316', secondary: '#fb923c' },
    dark: { primary: '#f97316', secondary: '#fdba74' }
  },
}

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
        applyTheme(data.custom_theme)
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
        custom_theme: { mode: 'light', seasonalTheme: null, autoSeasonal: false },
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
      applyTheme(data.custom_theme)
    } catch (error) {
      console.error('Error creating default settings:', error)
    }
  }

  const applyTheme = (customTheme: any) => {
    console.log('🎨 Applying theme:', customTheme)

    // Handle the theme from custom_theme JSONB field
    const theme = customTheme?.mode || 'light'

    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
      document.documentElement.setAttribute('data-theme', 'dark')
      document.body.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      document.documentElement.setAttribute('data-theme', 'light')
      document.body.setAttribute('data-theme', 'light')
    }

    // Remove any existing seasonal theme classes from both html and body
    const seasonalClasses = document.body.className.split(' ').filter(c => c.startsWith('seasonal-'))
    seasonalClasses.forEach(c => {
      document.body.classList.remove(c)
      document.documentElement.classList.remove(c)
    })

    // Apply seasonal theme if present to BOTH html and body (like original version)
    if (customTheme?.seasonalTheme) {
      const seasonalClass = `seasonal-${customTheme.seasonalTheme}`
      console.log('✨ Applying seasonal class:', seasonalClass)

      // Apply the seasonal class to both html and body
      document.body.classList.add(seasonalClass)
      document.documentElement.classList.add(seasonalClass)
      document.documentElement.setAttribute('data-seasonal-theme', customTheme.seasonalTheme)

      // Get theme colors based on current mode (light/dark)
      const themeColors = SEASONAL_THEME_COLORS[customTheme.seasonalTheme]
      if (themeColors) {
        const modeColors = theme === 'dark' ? themeColors.dark : themeColors.light

        // Apply colors as CSS variables for use throughout the app
        document.documentElement.style.setProperty('--seasonal-accent', modeColors.primary)
        document.documentElement.style.setProperty('--seasonal-secondary', modeColors.secondary)

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

              // Make sign out button white for visibility on gradient background
              const signOutBtn = header.querySelector('button:last-of-type')
              if (signOutBtn) {
                const btnEl = signOutBtn as HTMLElement
                btnEl.style.color = 'white'
                btnEl.style.borderColor = 'rgba(255, 255, 255, 0.3)'
              }
            } else {
              // In dark mode, just keep the normal dark mode styling
              // Don't override button colors
            }
          }

          // Update page title with theme emoji
          const themeEmojis: Record<string, string> = {
            christmas: '🎄',
            halloween: '🎃',
            easter: '🐰',
            summer: '☀️',
            spring: '🌸',
            fall: '🍂',
            winter: '❄️',
            valentine: '💕',
            stPatricks: '☘️',
            thanksgiving: '🦃',
            newYear: '🎉',
            ocean: '🌊',
            sunset: '🌅'
          }

          const emoji = themeEmojis[customTheme.seasonalTheme]
          if (emoji) {
            const headerTitle = document.querySelector('header h1')
            if (headerTitle) {
              headerTitle.textContent = `${emoji} ChoreStar`
            }
          }

          console.log('🎨 Theme colors applied:', modeColors)
        }, 50)
      }
    } else {
      document.documentElement.removeAttribute('data-seasonal-theme')
      document.documentElement.style.removeProperty('--seasonal-accent')
      document.documentElement.style.removeProperty('--seasonal-secondary')

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

        // Reset sign out button
        const signOutBtn = header.querySelector('button')
        if (signOutBtn) {
          const btnEl = signOutBtn as HTMLElement
          btnEl.style.removeProperty('color')
          btnEl.style.removeProperty('border-color')
        }
      }

      // Reset header title
      const headerTitle = document.querySelector('header h1')
      if (headerTitle) {
        headerTitle.textContent = '🌟 ChoreStar'
      }

      console.log('❌ No seasonal theme to apply')
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
        applyTheme(updates.custom_theme)
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
