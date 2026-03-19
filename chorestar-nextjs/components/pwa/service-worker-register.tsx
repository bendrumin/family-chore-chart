'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      fetch('/sw.js', { method: 'HEAD' })
        .then((res) => {
          if (!res.ok) return;
          return navigator.serviceWorker.register('/sw.js', { scope: '/' });
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });

      // Handle PWA install prompt
      let deferredPrompt: any = null

      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault()
        deferredPrompt = e
        // You can show an install button here if needed
      })

      // Handle app installed
      window.addEventListener('appinstalled', () => {
        // PWA installed successfully
        deferredPrompt = null
      })
    }
  }, [])

  return null
}

