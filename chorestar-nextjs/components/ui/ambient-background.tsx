/**
 * Ambient aurora backdrop — soft, blurred, theme-tinted blobs.
 * Fixed and decorative (pointer-events-none, z-0); render once near the top of
 * a page and put real content in a `relative z-10` container above it.
 *
 * Blobs use hero fills so accent-only auto-seasonal themes still tint the wash
 * (iOS ThemedScreenBackground) without rewriting the Tailwind ramp or full-bleed
 * surfaces (yellow-dashboard safe).
 */
export function AmbientBackground({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none fixed inset-0 z-0 overflow-hidden ${className}`}>
      <div
        className="absolute rounded-full opacity-[0.28] dark:opacity-[0.22]"
        style={{
          width: '44vw',
          height: '44vw',
          left: '-12vw',
          top: '-14vw',
          background: 'var(--hero-fill, var(--primary-fill))',
          filter: 'blur(90px)',
        }}
      />
      <div
        className="absolute rounded-full opacity-[0.26] dark:opacity-[0.20]"
        style={{
          width: '40vw',
          height: '40vw',
          right: '-12vw',
          top: '8vh',
          background: 'var(--hero-secondary-fill, var(--secondary-fill, var(--primary-fill)))',
          filter: 'blur(100px)',
        }}
      />
      <div
        className="absolute rounded-full opacity-[0.18] dark:opacity-[0.14]"
        style={{
          width: '34vw',
          height: '34vw',
          left: '24vw',
          bottom: '-16vw',
          background: 'var(--hero-fill, var(--primary-fill))',
          filter: 'blur(110px)',
        }}
      />
    </div>
  )
}
