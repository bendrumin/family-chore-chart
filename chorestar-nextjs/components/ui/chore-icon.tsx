import { choreIconFile } from '@/lib/constants/chore-icon-manifest'

/** Color-only OpenMoji files with no matching line-art under /icons/chores/. */
const COLOR_ONLY_ICON_FILES = new Set<string>([
  '1F305', '1F307', '1F308', '1F339', '1F33D', '1F341', '1F36A', '1F36C', '1F36D',
  '1F381', '1F383', '1F384', '1F386', '1F38A', '1F3A9', '1F47B', '1F47C', '1F48C',
  '1F495', '1F496', '1F49D', '1F577', '1F954', '1F967', '1F983',
  '1F9D9-200D-2640', '1F9E6', '2600', '2618', '2699', '2705', '2709', '2764',
])

interface ChoreIconProps {
  emoji: string | null | undefined
  /** Size via Tailwind, e.g. "w-7 h-7". */
  className?: string
  /** For positioning/opacity that can't be expressed as a utility class. */
  style?: React.CSSProperties
  /**
   * When set, render OpenMoji *line art* tinted to this CSS color (matches iOS:
   * chore icons follow the child's avatar color). Without a tint, full-color
   * OpenMoji is used for decorative / picker contexts.
   */
  tint?: string
}

/**
 * Renders a chore's emoji as OpenMoji artwork, falling back to the native
 * emoji when we have no file for it.
 * Artwork: OpenMoji (openmoji.org), CC BY-SA 4.0.
 */
export function ChoreIcon({ emoji, className = 'w-6 h-6', style, tint }: ChoreIconProps) {
  const file = choreIconFile(emoji)

  if (!file) {
    if (!emoji) return null
    return (
      <span
        className={`inline-flex items-center justify-center leading-none ${className}`}
        style={{ ...style, ...(tint ? { color: tint } : undefined) }}
      >
        {emoji}
      </span>
    )
  }

  const canTint = Boolean(tint) && !COLOR_ONLY_ICON_FILES.has(file)

  // Child-tinted line art (iOS AdaptiveIcon parity). CSS mask paints the black
  // strokes with `tint`; color SVGs ignore CSS color and stay baked OpenMoji reds.
  if (canTint && tint) {
    return (
      <span
        aria-hidden="true"
        className={`inline-block shrink-0 ${className}`}
        style={{
          ...style,
          backgroundColor: tint,
          WebkitMaskImage: `url(/icons/chores/${file}.svg)`,
          maskImage: `url(/icons/chores/${file}.svg)`,
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
