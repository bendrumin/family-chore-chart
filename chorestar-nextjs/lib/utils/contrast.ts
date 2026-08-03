/**
 * WCAG contrast helpers, used to keep theme accents legible.
 *
 * Theme accents are chosen for character, not contrast. Across the seasonal and
 * accent themes, most accent colors fail 4.5:1 against white text and are more
 * legible against dark text; Easter's pink is 1.65:1. Feeding a raw accent
 * straight into a text color or a filled chip produces unreadable UI, so every
 * accent goes through here first.
 */

/** The app's page surfaces, from globals.css. */
export const SURFACE_LIGHT = '#ffffff'
export const SURFACE_DARK = '#1f2937'

/** Text colors we're willing to place on top of an accent fill. */
export const ON_ACCENT_LIGHT = '#ffffff'
export const ON_ACCENT_DARK = '#111827'

/** WCAG AA for normal-size text. */
export const AA_NORMAL = 4.5
/** WCAG AA for large text and UI components. */
export const AA_LARGE = 3

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '').trim()
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ]
}

const toHex = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function mix(hex: string, toward: string, amount: number): string {
  const [r1, g1, b1] = parseHex(hex)
  const [r2, g2, b2] = parseHex(toward)
  return rgbToHex(r1 + (r2 - r1) * amount, g1 + (g2 - g1) * amount, b1 + (b2 - b1) * amount)
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex)
    .map(c => c / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

/**
 * Nudges `color` toward black or white until it clears `target` contrast against
 * `background`, preserving hue. Returns the original when it already passes.
 *
 * Used for accents that appear as *text* on a page surface — the dominant use of
 * --primary in this codebase — where a pale accent is simply invisible.
 */
export function ensureReadable(
  color: string,
  background: string,
  target: number = AA_NORMAL
): string {
  if (contrastRatio(color, background) >= target) return color

  // Move away from the background: darken on light surfaces, lighten on dark.
  const toward = relativeLuminance(background) > 0.5 ? '#000000' : '#ffffff'

  let best = color
  for (let step = 1; step <= 20; step++) {
    const candidate = mix(color, toward, step / 20)
    best = candidate
    if (contrastRatio(candidate, background) >= target) return candidate
  }
  return best
}

/** Whichever of dark/light ink reads better on this fill. */
export function bestForeground(background: string): string {
  return contrastRatio(background, ON_ACCENT_LIGHT) >= contrastRatio(background, ON_ACCENT_DARK)
    ? ON_ACCENT_LIGHT
    : ON_ACCENT_DARK
}

export interface AccessiblePair {
  fill: string
  foreground: string
}

/**
 * A fill and an ink guaranteed to clear `target` together.
 *
 * bestForeground alone only picks the *better* of the two inks, which isn't the
 * same as passing: St Patrick's green reaches 4.39:1 against white and Winter's
 * blue 4.32:1 against dark ink — both short of 4.5. So the fill itself is nudged
 * until the pair passes, preserving hue.
 */
export function accessiblePair(fill: string, target: number = AA_NORMAL): AccessiblePair {
  const foreground = bestForeground(fill)
  return { fill: ensureReadable(fill, foreground, target), foreground }
}
