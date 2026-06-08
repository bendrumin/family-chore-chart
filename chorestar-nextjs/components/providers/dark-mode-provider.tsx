'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CustomTheme } from '@/lib/supabase/database.types'
import {
  applyThemeMode,
  getEffectiveThemeMode,
  setStoredThemeMode,
  type ThemeMode,
} from '@/lib/utils/theme-mode'

async function syncThemeModeFromAccount(): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data } = await supabase
    .from('family_settings')
    .select('custom_theme')
    .eq('user_id', user.id)
    .maybeSingle()

  const mode = ((data?.custom_theme as CustomTheme | null)?.mode as ThemeMode | undefined) ?? 'auto'
  setStoredThemeMode(mode)
}

export function DarkModeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let cancelled = false

    async function init() {
      await syncThemeModeFromAccount()
      if (!cancelled) {
        applyThemeMode(getEffectiveThemeMode())
      }
    }

    function applyIfAuto() {
      if (getEffectiveThemeMode() === 'auto') {
        applyThemeMode('auto')
      }
    }

    init()

    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    mql.addEventListener('change', applyIfAuto)

    const interval = setInterval(applyIfAuto, 60_000)

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'chorestar-theme-mode') {
        applyThemeMode(getEffectiveThemeMode())
      }
    }
    window.addEventListener('storage', onStorage)

    return () => {
      cancelled = true
      mql.removeEventListener('change', applyIfAuto)
      clearInterval(interval)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  return <>{children}</>
}
