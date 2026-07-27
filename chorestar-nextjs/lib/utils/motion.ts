/**
 * True when the user has asked the OS/browser to reduce motion
 * (System Settings → Accessibility → Reduce Motion, or the equivalent).
 * Use to skip non-essential animations like confetti. SSR-safe.
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}
