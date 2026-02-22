import Link from 'next/link'
import { GRADIENT, GRADIENT_TEXT } from '@/lib/constants/brand'

interface SiteNavProps {
  ctaText?: string
  ctaHref?: string
}

export function SiteNav({ ctaText = 'Sign In →', ctaHref = '/login' }: SiteNavProps) {
  return (
    <nav aria-label="Main navigation" className="w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="text-xl font-black" style={GRADIENT_TEXT}>
          <span style={{ WebkitTextFillColor: 'initial' }}>🌟</span> ChoreStar
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-md"
            style={{ background: GRADIENT }}
          >
            {ctaText}
          </Link>
        </div>
      </div>
    </nav>
  )
}
