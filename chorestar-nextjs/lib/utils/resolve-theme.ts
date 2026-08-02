import {
  THEME_COLORS,
  getCurrentSeasonalTheme,
  type ThemeColors,
} from '@/lib/constants/seasonal-themes'
import {
  TIME_THEME_ID_PREFIX,
  getCurrentTimeTheme,
} from '@/lib/constants/time-themes'
import type { CustomTheme } from '@/lib/supabase/database.types'

export type ThemeSource = 'manual' | 'auto-seasonal' | 'auto-time'

export interface ResolvedTheme {
  /** Theme id; time themes are prefixed so they can't collide with seasonal. */
  id: string
  /** The seasonal id for CSS class purposes, or null for time themes. */
  seasonalId: string | null
  name: string
  source: ThemeSource
  colors: ThemeColors
}

/**
 * Decides which single theme is in effect.
 *
 * Exactly one wins — themes are never blended, because mixing two palettes is
 * what produced things like Halloween orange sitting next to brand purple.
 *
 * Precedence, highest first:
 *   1. an explicit pick, which the user chose deliberately
 *   2. auto-seasonal, when today falls inside a seasonal window
 *   3. auto-time-of-day, which is the always-available fallback
 *
 * Seasonal therefore always displaces the time-of-day palette outright for the
 * duration of the season, rather than tinting it.
 */
export function resolveActiveTheme(
  customTheme: CustomTheme | null | undefined,
  now: Date = new Date()
): ResolvedTheme | null {
  const manualId = customTheme?.seasonalTheme
  if (manualId) {
    const colors = THEME_COLORS[manualId]
    if (colors) {
      return { id: manualId, seasonalId: manualId, name: manualId, source: 'manual', colors }
    }
    // An unknown stored id (a renamed or removed theme) falls through to auto
    // rather than leaving the UI with no accent at all.
  }

  if (customTheme?.autoSeasonal) {
    const seasonal = getCurrentSeasonalTheme(now)
    if (seasonal) {
      return {
        id: seasonal.id,
        seasonalId: seasonal.id,
        name: seasonal.name,
        source: 'auto-seasonal',
        colors: seasonal.colors,
      }
    }
  }

  if (customTheme?.autoTimeOfDay) {
    const time = getCurrentTimeTheme(now)
    return {
      id: `${TIME_THEME_ID_PREFIX}${time.id}`,
      seasonalId: null,
      name: time.name,
      source: 'auto-time',
      colors: time.colors,
    }
  }

  return null
}

/**
 * The CSS custom properties a resolved theme should set.
 *
 * A theme has to drive the brand variables, not just the --seasonal-* ones:
 * --primary and --gradient-primary are referenced ~90 times across the UI while
 * --seasonal-accent is referenced a handful, so setting only the latter left the
 * bulk of the interface indigo/purple regardless of the active theme.
 */
export function themeCssVars(colors: ThemeColors, isDark: boolean): Record<string, string> {
  const { primary, secondary } = isDark ? colors.dark : colors.light
  const gradient = `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`
  return {
    '--primary': primary,
    '--secondary': secondary,
    '--gradient-primary': gradient,
    '--seasonal-accent': primary,
    '--seasonal-secondary': secondary,
    '--seasonal-gradient': gradient,
  }
}

/** The properties themeCssVars can set, for clearing back to the brand default. */
export const THEME_CSS_VAR_NAMES = Object.keys(
  themeCssVars({ light: { primary: '', secondary: '' }, dark: { primary: '', secondary: '' } }, false)
)
