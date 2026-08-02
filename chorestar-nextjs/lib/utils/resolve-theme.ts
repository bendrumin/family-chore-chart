import {
  THEME_COLORS,
  getCurrentSeasonalTheme,
  type ThemeColors,
} from '@/lib/constants/seasonal-themes'
import {
  TIME_THEME_ID_PREFIX,
  getCurrentTimeTheme,
} from '@/lib/constants/time-themes'
import {
  ensureReadable,
  accessiblePair,
  shiftAwayFrom,
  SURFACE_LIGHT,
  SURFACE_DARK,
} from '@/lib/utils/contrast'
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
 *
 * Contrast is handled by splitting the accent into three tokens, because one
 * color cannot serve both roles. --primary is used as a *text* color 43 times
 * versus 3 times as a fill, so --primary is the contrast-corrected value (a raw
 * accent like summer's #ffd700 gold is invisible as text on white) while
 * --primary-fill keeps the true hue for filled surfaces, paired with
 * --primary-foreground for whatever sits on top of it.
 */
export function themeCssVars(colors: ThemeColors, isDark: boolean): Record<string, string> {
  const { primary, secondary } = isDark ? colors.dark : colors.light
  const surface = isDark ? SURFACE_DARK : SURFACE_LIGHT

  // Fills are corrected so the fill/ink pair is guaranteed to clear AA, rather
  // than merely using whichever ink happens to be the better of the two.
  const primaryPair = accessiblePair(primary)
  const secondaryPair = accessiblePair(secondary)

  // Themed surfaces get a single-hue gradient — the second stop is the fill
  // pushed further from its own ink, so both ends are at least as legible as
  // the first. The old two-hue ramp (accent → a different accent) is what made
  // Halloween orange land next to brand purple, and for 8 of 21 themes no
  // single ink cleared AA across both of its stops.
  const gradient = `linear-gradient(135deg, ${primaryPair.fill} 0%, ${shiftAwayFrom(
    primaryPair.fill,
    primaryPair.foreground,
    0.14
  )} 100%)`

  return {
    // Safe as text on the page surface — most usages are text.
    '--primary': ensureReadable(primary, surface),
    '--secondary': ensureReadable(secondary, surface),
    // True hue for filled surfaces, contrast-corrected.
    '--primary-fill': primaryPair.fill,
    '--secondary-fill': secondaryPair.fill,
    // What to put on top of those fills.
    '--primary-foreground': primaryPair.foreground,
    '--secondary-foreground': secondaryPair.foreground,
    '--gradient-primary': gradient,
    '--gradient-foreground': primaryPair.foreground,
    '--seasonal-accent': ensureReadable(primary, surface),
    '--seasonal-secondary': ensureReadable(secondary, surface),
    '--seasonal-gradient': gradient,
  }
}

/** The properties themeCssVars can set, for clearing back to the brand default. */
export const THEME_CSS_VAR_NAMES = Object.keys(
  themeCssVars({ light: { primary: '', secondary: '' }, dark: { primary: '', secondary: '' } }, false)
)
