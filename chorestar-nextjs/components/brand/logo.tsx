import Image from 'next/image'

export function ChoreStarLogo({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <Image
      src="/icon.svg"
      alt=""
      width={size}
      height={size}
      className={`inline-block ${className}`}
      aria-hidden="true"
    />
  )
}
