/**
 * Ambient aurora backdrop — soft, blurred, theme-tinted blobs.
 * Fixed and decorative (pointer-events-none, z-0); render once near the top of
 * a page and put real content in a `relative z-10` container above it.
 *
 * Every blob is drawn from the accent ramp, so a theme recolors all of them
 * together. This previously mixed var(--primary) (themed) with
 * var(--primary-light) (not themed), which left one blob following the accent
 * and another stuck on brand indigo — a yellow smear next to a purple wash.
 */
export function AmbientBackground({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none fixed inset-0 z-0 overflow-hidden ${className}`}>
      <div
        className="absolute rounded-full opacity-40 dark:opacity-25"
        style={{
          width: '44vw',
          height: '44vw',
          left: '-12vw',
          top: '-14vw',
          background: 'rgb(var(--accent-300))',
          filter: 'blur(90px)',
        }}
      />
      <div
        className="absolute rounded-full opacity-40 dark:opacity-25"
        style={{
          width: '40vw',
          height: '40vw',
          right: '-12vw',
          top: '8vh',
          background: 'rgb(var(--accent-200))',
          filter: 'blur(100px)',
        }}
      />
      <div
        className="absolute rounded-full opacity-25 dark:opacity-15"
        style={{
          width: '34vw',
          height: '34vw',
          left: '24vw',
          bottom: '-16vw',
          background: 'rgb(var(--accent-300))',
          filter: 'blur(110px)',
        }}
      />
    </div>
  )
}
