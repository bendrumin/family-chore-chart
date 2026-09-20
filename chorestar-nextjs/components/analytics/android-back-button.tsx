'use client'

import { useEffect } from 'react'
import { isAndroidShell } from '@/lib/utils/platform'

/**
 * Android's system back button inside the Capacitor shell.
 *
 * Capacitor's default is WebView history: with Settings open, back left the
 * dialog "open" and navigated the page underneath it (seen on a Galaxy S25
 * Ultra, 2026-09-20). Once the web layer listens for `backButton`, the
 * native side defers to it, so this decides:
 *   1. a dialog is open      -> close it (click its close control, else Escape)
 *   2. a root screen          -> hand the app to the launcher (never exit)
 *   3. anything else          -> ordinary history back
 * Mounted once in the root layout; a no-op outside the shell.
 */
const ROOT_PATHS = [/^\/dashboard\/?$/, /^\/kid\/[^/]+\/?$/, /^\/kid-login\/?$/, /^\/login\/?$/]

type CapApp = {
  addListener: (event: 'backButton', cb: (state: { canGoBack: boolean }) => void) => Promise<{ remove: () => void }> | { remove: () => void }
  minimizeApp?: () => Promise<void>
  exitApp?: () => Promise<void>
}

export function AndroidBackButton() {
  useEffect(() => {
    if (!isAndroidShell()) return
    const app = (window as unknown as { Capacitor?: { Plugins?: { App?: CapApp } } }).Capacitor?.Plugins?.App
    if (!app?.addListener) return

    const onBack = ({ canGoBack }: { canGoBack: boolean }) => {
      const dialog = document.querySelector<HTMLElement>('[role="dialog"]')
      if (dialog) {
        const close = dialog.querySelector<HTMLButtonElement>(
          'button[aria-label*="close" i], button[aria-label*="Close"], button:has(> span.sr-only)'
        )
        if (close) close.click()
        else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
        return
      }
      const path = window.location.pathname
      if (ROOT_PATHS.some((re) => re.test(path)) || !canGoBack) {
        app.minimizeApp?.()
        return
      }
      window.history.back()
    }

    let handle: { remove: () => void } | null = null
    Promise.resolve(app.addListener('backButton', onBack)).then((h) => { handle = h })
    return () => { handle?.remove() }
  }, [])
  return null
}
