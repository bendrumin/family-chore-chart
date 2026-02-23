import Image from 'next/image'

interface ChoreStarLogoProps {
  size?: number
  className?: string
  variant?: 'default' | 'white'
}

export function ChoreStarLogo({ size = 24, className = '', variant = 'default' }: ChoreStarLogoProps) {
  return (
    <Image
      src={variant === 'white' ? '/icon-white.svg' : '/icon.svg'}
      alt=""
      width={size}
      height={size}
      className={`inline-block ${className}`}
      aria-hidden="true"
    />
  )
}
