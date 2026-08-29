import Image from 'next/image'

interface ChoreStarLogoProps {
  size?: number
  className?: string
  variant?: 'default' | 'white'
}

/**
 * The star mark. The default variant is an inline SVG on the theme fill, so it
 * follows the family's accent like every other filled surface (the static
 * /icon.svg is brand indigo and looked orphaned next to a teal wordmark). The
 * favicon and social images keep the static file. `white` stays the flat file
 * for dark/colored backgrounds.
 */
export function ChoreStarLogo({ size = 24, className = '', variant = 'default' }: ChoreStarLogoProps) {
  if (variant === 'white') {
    return (
      <Image src="/icon-white.svg" alt="" width={size} height={size} className={`inline-block ${className}`} aria-hidden="true" />
    )
  }
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={`inline-block shrink-0 ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <rect x="6" y="6" width="52" height="52" rx="14" style={{ fill: 'var(--hero-fill, var(--primary-fill))' }} />
      <path
        d="M32 16l4.1 10.7 11.4.3-9 6.6 3.5 10.9-9.9-6-9.9 6 3.5-10.9-9-6.6 11.4-.3L32 16z"
        style={{ fill: 'var(--hero-foreground, #ffffff)', opacity: 0.95 }}
      />
    </svg>
  )
}
