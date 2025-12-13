'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Only register service worker if we're on the /app path (Next.js version)
      if (window.location.pathname.startsWith('/app')) {
        // Register service worker with scope for /app only.
        // Guard against missing SW file in production routing setups.
        fetch('/app/app-sw.js', { method: 'HEAD' })
          .then((res) => {
            if (!res.ok) return
            return navigator.serviceWorker.register('/app/app-sw.js', { scope: '/app/' })
          })
          .then((registration) => {
            if (registration) console.log('Service Worker registered:', registration)
          })
          .catch((error) => {
            console.error('Service Worker registration failed:', error)
          })
      }

      // Handle PWA install prompt
      let deferredPrompt: any = null

      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault()
        deferredPrompt = e
        // You can show an install button here if needed
      })

      // Handle app installed
      window.addEventListener('appinstalled', () => {
        console.log('PWA was installed')
        deferredPrompt = null
      })
    }
  }, [])

  return null
}

