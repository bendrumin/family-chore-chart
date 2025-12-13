import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import { ServiceWorkerRegister } from '@/components/pwa/service-worker-register'
import { VersionSwitcher } from '@/components/version-switcher'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://chorestar.app'),
  title: {
    default: 'ChoreStar - Family Activity Tracker & Reward System | Make Everything Fun',
    template: '%s | ChoreStar',
  },
  description: 'Transform chores, homework, reading, and activities into achievements with ChoreStar. Track progress, earn rewards, and build good habits with our interactive family activity tracker for families with children.',
  keywords: [
    'family activity tracker',
    'kids chores',
    'homework tracker',
    'reading log',
    'family rewards',
    'children responsibility',
    'household tasks',
    'parenting app',
    'activity management',
    'family organization',
    'kids motivation',
    'achievement tracker',
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
    title: 'ChoreStar - Family Activity Tracker & Reward System',
    description: 'Track chores, homework, reading, and all family activities with progress tracking and rewards. Help your children build responsibility and achieve goals across all their daily activities.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'ChoreStar family activity tracker interface showing colorful progress tracking and rewards',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@chorestar',
    creator: '@chorestar',
    title: 'ChoreStar - Family Activity Tracker & Reward System',
    description: 'Transform chores, homework, reading, and activities into achievements. Track progress, earn rewards, and build good habits with our interactive family tracker.',
    images: ['/twitter-image.jpg'],
  },
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
  alternates: {
    canonical: 'https://chorestar.app/',
    languages: {
      'en': 'https://chorestar.app/',
      'es': 'https://chorestar.app/es',
      'fr': 'https://chorestar.app/fr',
      'de': 'https://chorestar.app/de',
    },
  },
  verification: {
    google: 'your-google-verification-code',
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
        <ServiceWorkerRegister />
        <VersionSwitcher />
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}
