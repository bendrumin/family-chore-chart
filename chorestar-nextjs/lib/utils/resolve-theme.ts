import {
  THEME_COLORS,
  getCurrentSeasonalTheme,
  type ThemeColors,
} from '@/lib/constants/seasonal-themes'
import {
  ensureReadable,
  accessiblePair,
  accessiblePairPreferWhite,
  hoverFill,
  normalizeHex,
  ON_ACCENT_LIGHT,
  SURFACE_LIGHT,
  SURFACE_DARK,
} from '@/lib/utils/contrast'
import { accentScaleCssVars, ACCENT_SCALE_VAR_NAMES, hexToRgbTriplet } from '@/lib/utils/accent-scale'
import type { CustomTheme } from '@/lib/supabase/database.types'

export type ThemeSource = 'custom' | 'manual' | 'auto-seasonal'

export interface ResolvedTheme {
  id: string
  name: string
  source: ThemeSource
  colors: ThemeColors
  /**
   * Whether this theme may repaint the whole interface (the Tailwind accent
   * ramp, the header, titles) or only small accent-sized elements.
   *
   * True for a theme the user chose outright — they picked the color, so a full
   * repaint is the point. False for auto-seasonal, which picks *for* them: that
   * is how an August visit silently turned the dashboard school-bus yellow,
   * summer's accent being #ffd700.
   */
  fullReach: boolean
}

/**
 * Builds a theme palette from one accent color.
 *
 * The same hex is used for both modes and for both slots; themeCssVars then runs
 * it through the contrast rules per mode, so a color that's too pale for light
 * mode gets darkened and one too dark for dark mode gets lightened. That's what
 * makes an arbitrary user-picked color safe to accept.
 */
export function colorsFromAccent(hex: string): ThemeColors {
  return {
    light: { primary: hex, secondary: hex },
    dark: { primary: hex, secondary: hex },
  }
}

/**
 * Decides which single theme is in effect.
 *
 * Precedence, highest first:
 *   1. a custom accent color — the most deliberate choice a user can make
 *   2. a named theme they picked
 *   3. auto-seasonal, by today's date
 *
 * Exactly one wins; themes are never blended, since mixing two palettes is what
 * produced Halloween orange sitting next to brand purple.
 */
export function resolveActiveTheme(
  customTheme: CustomTheme | null | undefined,
  now: Date = new Date()
): ResolvedTheme | null {
  const custom = normalizeHex(customTheme?.accentColor)
  if (custom) {
    return { id: custom, name: 'Custom', source: 'custom', colors: colorsFromAccent(custom), fullReach: true }
  }

  const manualId = customTheme?.seasonalTheme
  if (manualId) {
    // Accept iOS-stored ids (`stpatricks`) as well as web camelCase (`stPatricks`).
    const normalized =
      manualId === 'stpatricks' || manualId.toLowerCase() === 'stpatricks'
        ? 'stPatricks'
        : manualId === 'newyear'
          ? 'newYear'
          : manualId
    const colors = THEME_COLORS[normalized] ?? THEME_COLORS[manualId]
    if (colors) return { id: normalized, name: normalized, source: 'manual', colors, fullReach: true }
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
        fullReach: false,
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

  // Interactive fills (buttons, pills, chips) use the same white-preferring pair
  // as the hero, so a pale accent like Summer's teal reads as one richer fill
  // with white type everywhere. Before, the hero deepened to #2e7b82 + white
  // while buttons stayed #3a9aa3 + near-black ink, which looked like two
  // different themes side by side (dashboard header vs the marketing nav).
  const primaryPair = accessiblePairPreferWhite(primary)
  const secondaryPair = accessiblePairPreferWhite(secondary)

  // Hero / accent-header: white-preferring pairs (iOS match, AA-safe).
  const heroPrimary = accessiblePairPreferWhite(primary)
  const heroSecondarySrc = colors.highlight ?? secondary
  const heroSecondary = accessiblePairPreferWhite(heroSecondarySrc)

  const vars: Record<string, string> = {
    '--primary': ensureReadable(primary, surface),
    '--secondary': ensureReadable(secondary, surface),
    '--primary-fill': primaryPair.fill,
    '--secondary-fill': secondaryPair.fill,
    '--primary-foreground': primaryPair.foreground,
    '--secondary-foreground': secondaryPair.foreground,
    // Steered by the ink, not simply darkened — see hoverFill.
    '--primary-fill-hover': hoverFill(primaryPair.fill, primaryPair.foreground),
    '--seasonal-accent': ensureReadable(primary, surface),
    '--seasonal-secondary': ensureReadable(secondary, surface),
    // iOS-matched hero gradient + sticky accent header.
    '--hero-fill': heroPrimary.fill,
    '--hero-secondary-fill': heroSecondary.fill,
    '--hero-foreground': heroPrimary.foreground,
  }

  return vars
}

/**
 * The optional second-hue properties, for a FULL-REACH theme only.
 *
 * Deliberately not part of themeCssVars. An accent-only theme (auto-seasonal)
 * does not rewrite the Tailwind ramp, so the backdrop's other blobs stay brand
 * indigo — emitting a tint there would put one blush blob beside two indigo
 * ones. That is precisely the "themed next to unthemed" mismatch this file
 * already warns about, and it would arrive silently on the first day of a
 * season, which is how the yellow dashboard happened. The second hue only
 * appears when the user picked the theme outright and the whole ramp moved with
 * it.
 *
 * Emitted as an RGB triplet, not a hex, so consumers can use it with an alpha —
 * `rgb(var(--accent-tint) / 0.4)` — which is the only way these pale palette
 * colors are safe: translucent decoration, never something text sits on. The
 * paired ink ships alongside for the rare wash that carries a label, following
 * the same fill+ink rule as .accent-fill.
 *
 * accessiblePair rather than bestForeground: bestForeground returns the *better*
 * of the two inks, which is not necessarily a *passing* one. Cherry Blossom's
 * #e7206b tops out at 4.36:1 against either, so the pair nudges the fill until
 * it clears. Pale washes come back untouched, already at 11:1 or better.
 */
export function paletteRoleVars(colors: ThemeColors): Record<string, string> {
  const vars: Record<string, string> = {}
  if (colors.tint) {
    const pair = accessiblePair(colors.tint)
    vars['--accent-tint'] = hexToRgbTriplet(pair.fill)
    vars['--accent-tint-ink'] = pair.foreground
  }
  if (colors.highlight) {
    const pair = accessiblePair(colors.highlight)
    vars['--accent-highlight'] = hexToRgbTriplet(pair.fill)
    vars['--accent-highlight-ink'] = pair.foreground
  }
  return vars
}

/**
 * The optional palette-role properties.
 *
 * Listed explicitly rather than derived from a themeCssVars() call, because
 * those keys only appear when a theme actually declares them. Deriving the clear
 * list from a stub with no tint would omit them, and switching from a tinted
 * theme to an untinted one would leave the previous tint painted on the backdrop.
 */
export const THEME_PALETTE_VAR_NAMES = [
  '--accent-tint',
  '--accent-tint-ink',
  '--accent-highlight',
  '--accent-highlight-ink',
]

/**
 * Every property a resolved theme can set, for clearing back to the defaults.
 * Includes the Tailwind accent ramp, which only full-reach themes write.
 */
export const THEME_CSS_VAR_NAMES = [
  ...Object.keys(
    themeCssVars({ light: { primary: '', secondary: '' }, dark: { primary: '', secondary: '' } }, false)
  ),
  ...THEME_PALETTE_VAR_NAMES,
  ...ACCENT_SCALE_VAR_NAMES,
]

/**
 * All custom properties to apply for a resolved theme.
 *
 * A full-reach theme additionally rewrites the Tailwind accent ramp, which is
 * what carries the accent into the ~400 compiled indigo/purple utility classes,
 * the header and the titles. An accent-only theme leaves the ramp at its default
 * indigo so it can't repaint the interface.
 */
export function themeVarsFor(theme: ResolvedTheme, isDark: boolean): Record<string, string> {
  const base = themeCssVars(theme.colors, isDark)
  if (!theme.fullReach) return base
  const accent = isDark ? theme.colors.dark.primary : theme.colors.light.primary
  return { ...base, ...accentScaleCssVars(accent), ...paletteRoleVars(theme.colors) }
}

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

export interface HeaderInk {
  /** Color for the header title and icon buttons. */
  color: string
  /** Which logo asset reads on the header background. */
  logo: 'white' | 'default'
}

/**
 * The ink for the app header.
 *
 * In light mode the header is filled with the accent, so its ink has to be the
 * accent's guaranteed-readable foreground — hardcoding white made the title
 * vanish on a pale accent like yellow. In dark mode the header stays neutral
 * (--card-bg), so the accent itself is used as the text color instead.
 *
 * The logo is a static image with only a white and a dark variant, so it can't
 * inherit currentColor and has to be chosen here too.
 */
export function resolveHeaderInk(
  customTheme: CustomTheme | null | undefined,
  isDark: boolean,
  now: Date = new Date()
): HeaderInk {
  if (isDark) {
    // Neutral dark header: the accent reads as text, and the white logo works.
    return { color: 'var(--primary)', logo: 'white' }
  }

  const active = resolveActiveTheme(customTheme, now)
  if (!active || !active.fullReach) {
    // Brand indigo fill, white ink — the long-standing look.
    return { color: 'var(--primary-foreground)', logo: 'white' }
  }

  const { foreground } = accessiblePair(active.colors.light.primary)
  return {
    color: 'var(--primary-foreground)',
    logo: foreground === ON_ACCENT_LIGHT ? 'white' : 'default',
  }
}
