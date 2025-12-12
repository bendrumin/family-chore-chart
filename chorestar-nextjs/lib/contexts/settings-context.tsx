'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'

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

      // Get the theme colors from CSS variables to apply to elements
      const getThemeColors = () => {
        const styles = window.getComputedStyle(document.body)
        return {
          accent: styles.getPropertyValue('--seasonal-accent').trim(),
          gradient: styles.getPropertyValue('--seasonal-gradient').trim(),
          bg: styles.getPropertyValue('--seasonal-bg').trim()
        }
      }

      // Wait for CSS to load, then apply additional theme styling
      setTimeout(() => {
        const colors = getThemeColors()

        // Apply accent color as CSS variable for use throughout the app
        if (colors.accent) {
          document.documentElement.style.setProperty('--seasonal-accent', colors.accent)
        }

        // Apply gradient to header if it exists
        const header = document.querySelector('header.glass')
        if (header && colors.gradient && theme !== 'dark') {
          (header as HTMLElement).style.background = colors.gradient

          // Make header text white for readability
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

          // Make sign out button white
          const signOutBtn = header.querySelector('button')
          if (signOutBtn) {
            const btnEl = signOutBtn as HTMLElement
            btnEl.style.color = 'white'
            btnEl.style.borderColor = 'rgba(255, 255, 255, 0.3)'
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

        console.log('🎨 Theme colors applied:', colors)
      }, 50)
    } else {
      document.documentElement.removeAttribute('data-seasonal-theme')
      document.documentElement.style.removeProperty('--seasonal-accent')

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
        .update(updates)
        .eq('user_id', userId)
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
