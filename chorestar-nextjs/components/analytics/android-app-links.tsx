'use client'

import { useEffect } from 'react'
import { isAndroidShell } from '@/lib/utils/platform'

/**
 * Android App Links inside the Capacitor shell.
 *
 * The shell's manifest claims https://chorestar.app for the app's own routes
 * (sign-in callback, password reset, family invites, kid login, dashboard),
 * verified through public/.well-known/assetlinks.json, so tapping one of
 * those links in an email or a chat opens the app instead of the browser.
 * Capacitor hands the URL to the web layer as `appUrlOpen` when the app is
 * already running and as the launch URL on a cold start; this navigates the
 * WebView there. Same-origin only, so a stray intent can never point the
 * shell at another site. Mounted once in the root layout; a no-op outside
 * the shell.
 */
type CapApp = {
  addListener: (event: 'appUrlOpen', cb: (data: { url: string }) => void) => Promise<{ remove: () => void }> | { remove: () => void }
  getLaunchUrl?: () => Promise<{ url?: string } | null | undefined>
}

const LAUNCH_KEY = 'chorestar-launch-url-followed'

function follow(url: string | null | undefined) {
  if (!url) return
  let target: URL
  try {
    target = new URL(url)
  } catch {
    return
  }
  if (target.origin !== window.location.origin) return
  if (target.href === window.location.href) return
  window.location.assign(target.href)
}

export function AndroidAppLinks() {
  useEffect(() => {
    if (!isAndroidShell()) return
    const app = (window as unknown as { Capacitor?: { Plugins?: { App?: CapApp } } }).Capacitor?.Plugins?.App
    if (!app?.addListener) return

    let handle: { remove: () => void } | null = null
    Promise.resolve(app.addListener('appUrlOpen', ({ url }) => follow(url))).then((h) => { handle = h })

    // Cold start: the launch URL stays set for the life of the activity, and
    // this component mounts again on every full page load, so follow each
    // launch URL once (a sign-in callback code is single-use).
    app.getLaunchUrl?.()
      .then((launch) => {
        const url = launch?.url
        if (!url) return
        try {
          if (sessionStorage.getItem(LAUNCH_KEY) === url) return
          sessionStorage.setItem(LAUNCH_KEY, url)
        } catch {
          // Storage unavailable: follow anyway; the same-URL check above stops a loop.
        }
        follow(url)
      })
      .catch(() => {})

    return () => { handle?.remove() }
  }, [])
  return null
}
