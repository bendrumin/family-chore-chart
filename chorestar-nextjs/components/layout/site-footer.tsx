import Link from 'next/link'
import { GRADIENT_TEXT } from '@/lib/constants/brand'

interface FooterLink {
  href: string
  label: string
}

interface SiteFooterProps {
  links?: FooterLink[]
}

const DEFAULT_LINKS: FooterLink[] = [
  { href: '/', label: 'Home' },
  { href: '/how-to', label: 'How-To Guides' },
  { href: '/partners', label: 'Partners' },
  { href: '/login', label: 'Sign In' },
  { href: '/signup', label: 'Sign Up Free' },
]

export function SiteFooter({ links = DEFAULT_LINKS }: SiteFooterProps) {
  return (
    <footer className="text-center mt-8 pb-8 text-gray-500 dark:text-gray-400">
      <p className="mb-3 font-semibold text-sm" style={GRADIENT_TEXT}>
        <span style={{ WebkitTextFillColor: 'initial' }}>🌟</span> ChoreStar
      </p>
      <p className="text-xs mb-4">Made with ❤️ by a parent who gets it</p>
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm mb-4">
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            {label}
          </Link>
        ))}
      </div>
      <p className="text-xs">🔒 Your privacy matters. We never sell your data.</p>
    </footer>
  )
}
