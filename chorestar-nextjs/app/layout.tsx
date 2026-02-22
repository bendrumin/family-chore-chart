import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import { ServiceWorkerRegister } from '@/components/pwa/service-worker-register'
import { QueryProvider } from '@/components/providers/query-provider'
import { GoogleAnalytics } from '@/components/analytics/google-analytics'
import { KeyboardShortcutsProvider } from '@/components/keyboard-shortcuts/keyboard-shortcuts-provider'
import { ReducedMotionProvider } from '@/components/providers/reduced-motion-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://chorestar.app'),
  title: {
    default: 'ChoreStar — Chore Chart App & Allowance Tracker for Families',
    template: '%s | ChoreStar',
  },
  description: 'ChoreStar is a free chore chart app that turns household chores into a game kids love. Track chores, manage allowances, and reward responsibility. Works on any device — no download needed.',
  keywords: [
    'chore chart app',
    'chore tracker for kids',
    'kids chore chart',
    'allowance tracker',
    'kids reward system',
    'family chore app',
    'chore app for families',
    'household chore tracker',
    'kids responsibility app',
    'chore management app',
    'digital chore chart',
    'family activity tracker',
    'parenting app',
    'kids motivation app',
    'chore gamification',
    'family organization app',
    'kids earning tracker',
    'daily chore chart',
    'weekly chore chart',
    'interactive chore chart',
  ],
  authors: [{ name: 'ChoreStar' }],
  creator: 'ChoreStar',
  publisher: 'ChoreStar',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://chorestar.app/',
    siteName: 'ChoreStar',
    title: 'ChoreStar — Chore Chart App & Allowance Tracker for Families',
    description: 'Free chore chart app that gamifies household tasks. Kids earn rewards, unlock achievements, and build responsibility. Works on any device — no download needed. Join 87+ happy families.',
    images: [
      {
        url: '/icon.svg',
        width: 64,
        height: 64,
        alt: 'ChoreStar — the family chore chart and reward tracking app',
      },
    ],
  },
  twitter: {
    card: 'summary',
    site: '@chorestar',
    creator: '@chorestar',
    title: 'ChoreStar — Chore Chart App & Allowance Tracker for Families',
    description: 'Free chore chart app that gamifies household tasks. Kids earn rewards, unlock achievements, and build responsibility. Join 87+ happy families.',
    images: ['/icon.svg'],
  },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
  },
  manifest: '/manifest.json',
  alternates: {
    canonical: 'https://chorestar.app/',
  },
  category: 'Family & Parenting',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg focus:text-sm focus:font-semibold"
        >
          Skip to main content
        </a>
        <GoogleAnalytics />
        <ReducedMotionProvider>
        <QueryProvider>
          <ServiceWorkerRegister />
          <KeyboardShortcutsProvider>
            {children}
          </KeyboardShortcutsProvider>
          <Toaster position="top-center" richColors toastOptions={{ duration: 5000 }} />
        </QueryProvider>
        </ReducedMotionProvider>
      </body>
    </html>
  )
}
