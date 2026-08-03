/**
 * Brand tokens.
 *
 * The two-hue indigo→purple gradient is gone. It couldn't be made accessible —
 * across the seasonal and accent themes, 8 of 21 light-mode gradients had stops
 * far enough apart in luminance that no single ink cleared 4.5:1 on both — and a
 * solid accent is both safer and what the app now uses everywhere.
 *
 * These reference CSS variables so they follow the active theme. A compiled hex
 * here is what left the header title stuck on purple no matter what accent was
 * picked.
 */

/** Solid accent fill, for surfaces. Prefer ACCENT_SURFACE_STYLE, which also
 *  carries the readable ink. */
export const ACCENT_SURFACE = 'var(--primary-fill)'

/**
 * A filled accent surface plus the ink that reads on it.
 *
 * Always set both. A fill on its own inherits whatever color was there before —
 * usually white — which is unreadable the moment the accent is pale. The pair is
 * guaranteed to clear WCAG AA for any accent (lib/utils/contrast.ts).
 */
export const ACCENT_SURFACE_STYLE = {
  background: 'var(--primary-fill)',
  color: 'var(--primary-foreground)',
} as const

/**
 * Formerly a gradient clipped to the text. Now a solid accent color, contrast-
 * corrected for the page background, so it stays legible for any accent.
 */
export const GRADIENT_TEXT = {
  color: 'var(--primary)',
} as const

export const BRAND_COLORS = {
  indigo: '#6366f1',
  purple: '#8b5cf6',
} as const

/** @deprecated Use ACCENT_SURFACE. Kept as a solid so old call sites don't break. */
export const GRADIENT = ACCENT_SURFACE
