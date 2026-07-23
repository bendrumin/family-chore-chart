import { choreIconFile } from '@/lib/constants/chore-icon-manifest'

interface ChoreIconProps {
  emoji: string | null | undefined
  /** Size + color via Tailwind, e.g. "w-7 h-7 text-indigo-500 dark:text-indigo-400".
   *  The line art is tinted with the current text color. */
  className?: string
}

/**
 * Renders a chore's emoji as OpenMoji line art (tinted with currentColor via
 * CSS mask), falling back to the native emoji when we have no artwork for it.
 * Artwork: OpenMoji (openmoji.org), CC BY-SA 4.0.
 */
export function ChoreIcon({ emoji, className = 'w-6 h-6' }: ChoreIconProps) {
  const file = choreIconFile(emoji)

  if (!file) {
    if (!emoji) return null
    return <span className={`inline-flex items-center justify-center leading-none ${className}`}>{emoji}</span>
  }

  const url = `url(/icons/chores/${file}.svg)`
  return (
    <span
      role="img"
      aria-hidden="true"
      className={`inline-block shrink-0 bg-current ${className}`}
      style={{
        WebkitMaskImage: url,
        maskImage: url,
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
      }}
    />
  )
}
