'use client'

import { useEffect } from 'react'

type WakeLockSentinel = { release: () => Promise<void> }
type WakeLockNavigator = Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinel> } }

/**
 * Keep the screen on while `active` (Screen Wake Lock API: Chrome, Android
 * WebView, Safari 16.4+). The lock is released by the browser whenever the
 * page is hidden, so it is re-requested when the page is visible again.
 * Unsupported browsers and refusals (low battery) fall back to the normal
 * screen timeout; nothing here is essential, so nothing here throws.
 */
export function useScreenWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined') return
    const wakeLock = (navigator as WakeLockNavigator).wakeLock
    if (!wakeLock) return

    let sentinel: WakeLockSentinel | null = null
    let cancelled = false

    const acquire = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const lock = await wakeLock.request('screen')
        if (cancelled) await lock.release()
        else sentinel = lock
      } catch {
        // Denied or unsupported: the screen times out as it normally would.
      }
    }
    const onVisibility = () => { if (document.visibilityState === 'visible') void acquire() }

    void acquire()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      sentinel?.release().catch(() => {})
      sentinel = null
    }
  }, [active])
}
