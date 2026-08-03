import {
  THEME_COLORS,
  getCurrentSeasonalTheme,
  type ThemeColors,
} from '@/lib/constants/seasonal-themes'
import {
  ensureReadable,
  accessiblePair,
  SURFACE_LIGHT,
  SURFACE_DARK,
} from '@/lib/utils/contrast'
import type { CustomTheme } from '@/lib/supabase/database.types'

export type ThemeSource = 'manual' | 'auto-seasonal'

export interface ResolvedTheme {
  id: string
  name: string
  source: ThemeSource
  colors: ThemeColors
}

/**
 * Decides which single theme is in effect.
 *
 * An explicit pick outranks auto-seasonal, and exactly one wins — themes are
 * never blended, since mixing two palettes is what produced Halloween orange
 * sitting next to brand purple.
 */
export function resolveActiveTheme(
  customTheme: CustomTheme | null | undefined,
  now: Date = new Date()
): ResolvedTheme | null {
  const manualId = customTheme?.seasonalTheme
  if (manualId) {
    const colors = THEME_COLORS[manualId]
    if (colors) return { id: manualId, name: manualId, source: 'manual', colors }
    // An unknown stored id (a renamed or removed theme) falls through to auto
    // rather than leaving the UI with no accent at all.
  }

  if (customTheme?.autoSeasonal) {
    const seasonal = getCurrentSeasonalTheme(now)
    if (seasonal) {
      return {
        id: seasonal.id,
        name: seasonal.name,
        source: 'auto-seasonal',
        colors: seasonal.colors,
      }
    }
  }

  return null
}

/**
 * The CSS custom properties a resolved theme sets — accent-sized ONLY.
 *
 * A theme deliberately does not touch --gradient-primary or --header-gradient.
 * An accent is tuned to catch the eye at badge size; at full-bleed size the same
 * color takes over the page. Letting a theme drive those turned the header and
 * hero school-bus yellow every August, because summer's accent is #ffd700. Large
 * surfaces stay on the brand palette; themes tint chips, badges, rings and icons.
 *
 * Contrast is handled by splitting the accent in two, because one color cannot
 * serve both roles. --primary is used as a *text* color far more often than as a
 * fill, so it is the contrast-corrected value (summer's gold is invisible as text
 * on white and becomes a deep gold), while --primary-fill keeps the true hue for
 * small filled elements, paired with --primary-foreground for what sits on it.
 */
export function themeCssVars(colors: ThemeColors, isDark: boolean): Record<string, string> {
  const { primary, secondary } = isDark ? colors.dark : colors.light
  const surface = isDark ? SURFACE_DARK : SURFACE_LIGHT

  const primaryPair = accessiblePair(primary)
  const secondaryPair = accessiblePair(secondary)

  return {
    '--primary': ensureReadable(primary, surface),
    '--secondary': ensureReadable(secondary, surface),
    '--primary-fill': primaryPair.fill,
    '--secondary-fill': secondaryPair.fill,
    '--primary-foreground': primaryPair.foreground,
    '--secondary-foreground': secondaryPair.foreground,
    '--seasonal-accent': ensureReadable(primary, surface),
    '--seasonal-secondary': ensureReadable(secondary, surface),
  }
}

/** Every property themeCssVars can set, for clearing back to the brand default. */
export const THEME_CSS_VAR_NAMES = Object.keys(
  themeCssVars({ light: { primary: '', secondary: '' }, dark: { primary: '', secondary: '' } }, false)
)

/**
 * Surface properties an earlier build wrote to the document. Stripped on every
 * apply so a client that loaded that version recovers without a hard reload.
 */
export const RETIRED_THEMED_SURFACE_VARS = [
  '--gradient-primary',
  '--gradient-foreground',
  '--seasonal-gradient',
  '--header-gradient',
]
