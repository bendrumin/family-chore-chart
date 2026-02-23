'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { GRADIENT, GRADIENT_TEXT } from '@/lib/constants/brand'
import {
  Menu, X, Home, LayoutDashboard, BookOpen, Handshake,
  HelpCircle, Mail, Sparkles, LogOut,
} from 'lucide-react'

const FAQModal = dynamic(() => import('@/components/help/faq-modal').then(m => ({ default: m.FAQModal })), { ssr: false })
const NewFeaturesModal = dynamic(() => import('@/components/help/new-features-modal').then(m => ({ default: m.NewFeaturesModal })), { ssr: false })
const ContactModal = dynamic(() => import('@/components/help/contact-modal').then(m => ({ default: m.ContactModal })), { ssr: false })

export function SiteNav() {
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const [isNavOpen, setIsNavOpen] = useState(false)
  const [isFAQOpen, setIsFAQOpen] = useState(false)
  const [isContactOpen, setIsContactOpen] = useState(false)
  const [isNewFeaturesOpen, setIsNewFeaturesOpen] = useState(false)

  const drawerRef = useRef<HTMLElement>(null)
  const hamburgerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user)
    })
  }, [])

  // Focus trap and keyboard handling for drawer
  useEffect(() => {
    if (!isNavOpen) return

    const drawer = drawerRef.current
    if (!drawer) return

    const focusableEls = drawer.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    const firstEl = focusableEls[0]
    const lastEl = focusableEls[focusableEls.length - 1]

    firstEl?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsNavOpen(false)
        hamburgerRef.current?.focus()
        return
      }

      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault()
          lastEl?.focus()
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault()
          firstEl?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isNavOpen])

  const handleLogout = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }, [router])

  return (
    <>
      <nav aria-label="Main navigation" className="w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            {isLoggedIn && (
              <button
                ref={hamburgerRef}
                type="button"
                onClick={() => setIsNavOpen(prev => !prev)}
                aria-label="Toggle navigation"
                aria-expanded={isNavOpen}
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-200"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <Link href="/" className="text-xl font-black" style={GRADIENT_TEXT}>
              <span style={{ WebkitTextFillColor: 'initial' }}>🌟</span> ChoreStar
            </Link>
          </div>
          <div className="flex items-center gap-3">
            {isLoggedIn !== null && (
              <Link
                href={isLoggedIn ? '/dashboard' : '/login'}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-md"
                style={{ background: GRADIENT }}
              >
                {isLoggedIn ? 'Dashboard →' : 'Sign In →'}
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Slide-out nav drawer for logged-in users */}
      {isLoggedIn && isNavOpen && (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setIsNavOpen(false)}
          />
          <nav
            ref={drawerRef}
            aria-label="Site navigation"
            className="absolute top-0 left-0 h-full w-72 shadow-2xl border-r flex flex-col bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                🌟 ChoreStar
              </span>
              <button
                type="button"
                onClick={() => { setIsNavOpen(false); hamburgerRef.current?.focus() }}
                aria-label="Close navigation menu"
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-500 dark:text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav items */}
            <div className="flex-1 py-3 px-3 space-y-1 overflow-y-auto">
              <NavLink href="/" icon={<Home className="w-5 h-5 shrink-0" />} label="Home" onClick={() => setIsNavOpen(false)} />
              <NavLink href="/dashboard" icon={<LayoutDashboard className="w-5 h-5 shrink-0" />} label="Dashboard" onClick={() => setIsNavOpen(false)} />
              <NavLink href="/how-to" icon={<BookOpen className="w-5 h-5 shrink-0" />} label="How-To Guides" onClick={() => setIsNavOpen(false)} />
              <NavLink href="/partners" icon={<Handshake className="w-5 h-5 shrink-0" />} label="Partners" onClick={() => setIsNavOpen(false)} />

              <div className="my-2 border-t border-gray-200 dark:border-gray-700" role="separator" />

              <NavButton icon={<HelpCircle className="w-5 h-5 shrink-0" />} label="FAQ & Help" onClick={() => { setIsFAQOpen(true); setIsNavOpen(false) }} />
              <NavButton icon={<Mail className="w-5 h-5 shrink-0" />} label="Contact Us" onClick={() => { setIsContactOpen(true); setIsNavOpen(false) }} />
              <NavButton icon={<Sparkles className="w-5 h-5 shrink-0" />} label="What's New" onClick={() => { setIsNewFeaturesOpen(true); setIsNavOpen(false) }} />
            </div>

            {/* Sign Out at bottom */}
            <div className="px-3 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => { handleLogout(); setIsNavOpen(false) }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
              >
                <LogOut className="w-5 h-5 shrink-0" aria-hidden="true" />
                Sign Out
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* Modals */}
      <FAQModal open={isFAQOpen} onOpenChange={setIsFAQOpen} />
      <NewFeaturesModal open={isNewFeaturesOpen} onOpenChange={setIsNewFeaturesOpen} />
      <ContactModal open={isContactOpen} onOpenChange={setIsContactOpen} />
    </>
  )
}

function NavLink({ href, icon, label, onClick }: { href: string; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-800 dark:text-gray-200"
    >
      <span className="text-indigo-500" aria-hidden="true">{icon}</span>
      {label}
    </Link>
  )
}

function NavButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-800 dark:text-gray-200"
    >
      <span className="text-indigo-500" aria-hidden="true">{icon}</span>
      {label}
    </button>
  )
}
