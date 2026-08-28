'use client'

import { useEffect, useState } from 'react'
import { X, Smartphone } from 'lucide-react'
import { APP_STORE_URL, APP_STORE_REVIEW_URL } from '@/components/home/app-store-badge'

const DISMISS_KEY = 'chorestar-ios-banner-dismissed'

/**
 * Slim dismissible promo for the native iOS app. Dismissal persists in
 * localStorage; renders nothing until mounted so SSR and client agree.
 */
export function IosAppBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(DISMISS_KEY)) setVisible(true)
  }, [])

  if (!visible) return null

  return (
    <div className="mb-6 flex items-center gap-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white/85 dark:bg-gray-800/85 backdrop-blur px-4 py-3 shadow-sm">
      <Smartphone className="w-5 h-5 shrink-0 text-indigo-500 dark:text-indigo-400" />
      <p className="flex-1 min-w-0 text-sm text-gray-700 dark:text-gray-300">
        <span className="font-semibold text-gray-900 dark:text-white">ChoreStar is on the App Store!</span>{' '}
        Widgets, kid mode, and routine timers, synced with everything here.{' '}
        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-indigo-600 dark:text-indigo-400 underline whitespace-nowrap"
        >
          Get the iPhone &amp; iPad app →
        </a>{' '}
        <span className="text-gray-400 dark:text-gray-500">·</span>{' '}
        <a
          href={APP_STORE_REVIEW_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-indigo-600 dark:text-indigo-400 underline whitespace-nowrap"
        >
          Already have it? Rate it ★
        </a>
      </p>
      <button
        type="button"
        aria-label="Dismiss App Store banner"
        onClick={() => {
          localStorage.setItem(DISMISS_KEY, '1')
          setVisible(false)
        }}
        className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
