import { normalizeHex, rgbToHex } from '@/lib/utils/contrast'

/**
 * Generates a Tailwind-shaped 50→900 ramp from a single accent color.
 *
 * Exists because ~400 Tailwind utility classes in this app hardcode indigo and
 * purple (`text-indigo-400` alone appears 86 times). A compiled utility class
 * can't read a CSS variable, so no amount of theming reaches them — the only way
 * to make "pick a color" actually change the interface is to point Tailwind's
 * indigo/purple scales at variables and drive those from the accent.
 *
 * The step ratios are measured from Tailwind's own indigo ramp (each step's
 * distance from indigo-500 toward white or black), so an arbitrary accent gets
 * the same familiar lightness curve rather than an invented one.
 */

export const ACCENT_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const
export type AccentStep = (typeof ACCENT_STEPS)[number]

/** Mix ratio per step: toward white below 500, toward black above. */
const STEP_RATIOS: Record<AccentStep, number> = {
  50: 0.935,
  100: 0.881,
  200: 0.758,
  300: 0.573,
  400: 0.314,
  500: 0,
  600: 0.189,
  700: 0.312,
  800: 0.433,
  900: 0.506,
}

/** Tailwind's indigo, used as the default ramp when no accent is set. */
export const DEFAULT_ACCENT = '#6366f1'

function parse(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

/** `#6366f1` → `99 102 241`, the space-separated form Tailwind's alpha syntax needs. */
export function hexToRgbTriplet(hex: string): string {
  return parse(hex).join(' ')
}

/**
 * The full ramp for an accent, as hex. Returns the indigo-derived ramp for the
 * default accent, so an unthemed app looks exactly as it did before.
 */
export function accentScale(accent: string): Record<AccentStep, string> {
  const base = normalizeHex(accent) ?? DEFAULT_ACCENT
  const [r, g, b] = parse(base)

  const out = {} as Record<AccentStep, string>
  for (const step of ACCENT_STEPS) {
    const ratio = STEP_RATIOS[step]
    if (ratio === 0) {
      out[step] = base
      continue
    }
    const toward = step < 500 ? 255 : 0
    out[step] = rgbToHex(
      r + (toward - r) * ratio,
      g + (toward - g) * ratio,
      b + (toward - b) * ratio
    )
  }
  return out
}

/** The ramp as CSS custom properties, in the RGB-triplet form Tailwind consumes. */
export function accentScaleCssVars(accent: string): Record<string, string> {
  const scale = accentScale(accent)
  const vars: Record<string, string> = {}
  for (const step of ACCENT_STEPS) {
    vars[`--accent-${step}`] = hexToRgbTriplet(scale[step])
  }
  return vars
}

/** Every property accentScaleCssVars can set, for clearing back to the default. */
export const ACCENT_SCALE_VAR_NAMES = ACCENT_STEPS.map(s => `--accent-${s}`)
