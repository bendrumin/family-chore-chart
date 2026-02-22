'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Register for Next.js app routes (dashboard, kid, login, etc.) - skip legacy
      const path = window.location.pathname;
      const isAppRoute = path.startsWith('/app') || path.startsWith('/dashboard') ||
        path.startsWith('/kid') || path.startsWith('/kid-login') || path.startsWith('/login') ||
        path.startsWith('/signup') || path === '/' || path.startsWith('/forgot-password') ||
        path.startsWith('/reset-password') || path.startsWith('/resend-confirmation');
      const isLegacy = path.startsWith('/legacy');

      if (isAppRoute && !isLegacy) {
        const swPath = '/sw.js';
        const scope = '/';
        fetch(swPath, { method: 'HEAD' })
          .then((res) => {
            if (!res.ok) return;
            return navigator.serviceWorker.register(swPath, { scope });
          })
          .then((registration) => {
            if (registration) console.log('Service Worker registered:', registration.scope);
          })
          .catch((error) => {
            console.error('Service Worker registration failed:', error);
          });
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

