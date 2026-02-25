import Link from 'next/link'
import { GRADIENT_TEXT } from '@/lib/constants/brand'
import { ChoreStarLogo } from '@/components/brand/logo'

export function SiteFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gray-900 text-gray-300 mt-16">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="text-xl font-black text-white mb-3 flex items-center gap-1.5">
              <ChoreStarLogo size={24} /> ChoreStar
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed">
              Turn household chores into a game kids love. Built by a parent who gets it.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Product</h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/signup" className="text-sm hover:text-white transition-colors">
                  Sign Up Free
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-sm hover:text-white transition-colors">
                  Sign In
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-sm hover:text-white transition-colors">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Resources</h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/how-to" className="text-sm hover:text-white transition-colors">
                  How-To Guides
                </Link>
              </li>
              <li>
                <Link href="/partners" className="text-sm hover:text-white transition-colors">
                  Partners
                </Link>
              </li>
              <li>
                <a href="mailto:support@chorestar.app" className="text-sm hover:text-white transition-colors">
                  Contact Support
                </a>
              </li>
              <li>
                <a href="mailto:hi@chorestar.app?subject=iOS%20App%20Access" className="text-sm hover:text-white transition-colors">
                  iOS App (Beta)
                </a>
              </li>
            </ul>
          </div>

          {/* Legal / Trust */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Trust</h4>
            <ul className="space-y-2.5">
              <li className="text-sm text-gray-400">🔒 Your data is private</li>
              <li className="text-sm text-gray-400">🚫 We never sell data</li>
              <li className="text-sm text-gray-400">✅ COPPA-friendly</li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-500">
            © {currentYear} ChoreStar. Made with ❤️ for families everywhere.
          </p>
          <div className="flex items-center gap-4">
            <a href="mailto:hi@chorestar.app" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
              hi@chorestar.app
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
