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

/**
 * What kind of device the browser is running on, for platform-aware promos
 * (e.g. the App Store banner). 'other' covers desktop and anything unknown.
 */
export type DevicePlatform = 'ios' | 'android' | 'other'

export function detectDevicePlatform(): DevicePlatform {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios'
  // iPadOS 13+ Safari reports itself as macOS; multi-touch gives it away
  // (desktop Macs report 0 touch points, iPads report 5).
  if (/Macintosh|MacIntel/.test(ua) && (navigator.maxTouchPoints ?? 0) > 1) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'other'
}

/**
 * Hydration-safe device detection: 'other' on the server and first client
 * render, the real platform right after mount (same pattern as
 * useAndroidShell, so SSR and the first paint always agree).
 */
export function useDevicePlatform(): DevicePlatform {
  const [platform, setPlatform] = useState<DevicePlatform>('other')
  useEffect(() => {
    setPlatform(detectDevicePlatform())
  }, [])
  return platform
}
