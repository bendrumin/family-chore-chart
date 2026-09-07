'use client'

import { useEffect, useState } from 'react'

/**
 * Detection for the Android Capacitor shell (ChoreStar-Android/).
 *
 * Google Play forbids in-app purchase flows that bypass Play Billing, and a
 * "consumption-only" app must show NO purchase call-to-action at all, not
 * even a pointer to the website. Every upgrade surface therefore hides when
 * the app runs inside the Android shell; premium still unlocks normally for
 * accounts that subscribed elsewhere.
 *
 * The shell appends "ChoreStarAndroid" to the WebView user agent
 * (capacitor.config.ts android.appendUserAgent) and Capacitor injects its
 * bridge; either signal counts. Server render and first client render show
 * the normal page (no hydration mismatch); the shell hides surfaces right
 * after mount.
 */
export function isAndroidShell(): boolean {
  if (typeof window === 'undefined') return false
  if (typeof navigator !== 'undefined' && navigator.userAgent.includes('ChoreStarAndroid')) return true
  const cap = (window as { Capacitor?: { getPlatform?: () => string } }).Capacitor
  return cap?.getPlatform?.() === 'android'
}

export function useAndroidShell(): boolean {
  const [shell, setShell] = useState(false)
  useEffect(() => {
    if (isAndroidShell()) setShell(true)
  }, [])
  return shell
}
