/**
 * Ambient aurora backdrop — soft, blurred, theme-tinted blobs.
 * Fixed and decorative (pointer-events-none, z-0); render once near the top of
 * a page and put real content in a `relative z-10` container above it.
 *
 * Every blob is drawn from the accent ramp, so a theme recolors all of them
 * together. This previously mixed var(--primary) (themed) with
 * var(--primary-light) (not themed), which left one blob following the accent
 * and another stuck on brand indigo — a yellow smear next to a purple wash.
 *
 * The middle blob prefers a theme's optional second hue, --accent-tint, falling
 * back to the ramp when there isn't one. This is where a photo-derived palette
 * gets to be itself: pink blossom against blue sky, blush against teal. It is
 * also the only place those colors are safe, since none of them is dark enough
 * to carry text — here they are blurred 100px, under 40% opacity, aria-hidden,
 * and nothing is ever read off them.
 *
 * The fallback matters: an undefined var() invalidates the whole declaration at
 * computed-value time and the property is dropped, so a themed-but-untinted
 * palette would lose this blob's color entirely. Falling back to --accent-200
 * keeps untinted themes rendering exactly as before.
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
          background: 'rgb(var(--accent-tint, var(--accent-200)))',
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
