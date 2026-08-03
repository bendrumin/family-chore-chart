import { choreIconFile } from '@/lib/constants/chore-icon-manifest'

interface ChoreIconProps {
  emoji: string | null | undefined
  /** Size via Tailwind, e.g. "w-7 h-7". OpenMoji color art carries its own
   *  colors, so any text-color classes passed in are simply ignored. */
  className?: string
  /** For positioning/opacity that can't be expressed as a utility class. */
  style?: React.CSSProperties
}

/**
 * Renders a chore's emoji as a full-color OpenMoji icon, falling back to the
 * native emoji when we have no artwork for it. (Switched from line art —
 * thin strokes didn't read at small sizes on mobile.)
 * Artwork: OpenMoji (openmoji.org), CC BY-SA 4.0.
 */
export function ChoreIcon({ emoji, className = 'w-6 h-6', style }: ChoreIconProps) {
  const file = choreIconFile(emoji)

  if (!file) {
    if (!emoji) return null
    return <span className={`inline-flex items-center justify-center leading-none ${className}`} style={style}>{emoji}</span>
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny inline SVG icon; next/image adds no value and needs extra config for SVG
    <img
      src={`/icons/chores-color/${file}.svg`}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={`inline-block shrink-0 object-contain ${className}`}
      style={style}
    />
  )
}
