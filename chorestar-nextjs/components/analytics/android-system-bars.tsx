'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { isAndroidShell } from '@/lib/utils/platform'
import { relativeLuminance, rgbToHex } from '@/lib/utils/contrast'

/**
 * The Android status bar and navigation bar wear the app's own colors.
 *
 * Android 15 ignores the status-bar color API (verified on a Galaxy S25 Ultra:
 * the strip stayed #FAFAFA above a deep red seasonal header), so the shell
 * paints those strips itself and this tells it what to paint. Whatever sits at
 * the very top of the page decides the status bar, whatever sits at the very
 * bottom decides the navigation bar, so themed headers, kid mode's gradient and
 * the shell tab bar all carry through without listing them here.
 *
 * A no-op outside the shell.
 */
type SystemBarsPlugin = {
  apply: (options: { statusColor: string; navColor: string; lightStatusIcons: boolean; lightNavIcons: boolean }) => Promise<void>
}

function parseColor(value: string): { hex: string; alpha: number } | null {
  const m = value.match(/^rgba?\(([^)]+)\)$/)
  if (!m) return null
  const parts = m[1].split(',').map((p) => parseFloat(p.trim()))
  if (parts.length < 3 || parts.some((p) => Number.isNaN(p))) return null
  return { hex: rgbToHex(parts[0], parts[1], parts[2]), alpha: parts.length > 3 ? parts[3] : 1 }
}

function cssVar(name: string): string | null {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return /^#[0-9a-f]{6}$/i.test(raw) ? raw : null
}

/**
 * A gradient is a background image, so it has no computed color to read. Kid
 * mode is painted that way, and its first stop is what sits under the status
 * bar while its last stop sits under the navigation bar.
 */
function gradientStop(backgroundImage: string, edge: 'top' | 'bottom'): string | null {
  const stops = backgroundImage.match(/rgba?\([^)]+\)/g)
  if (!stops || stops.length === 0) return null
  const parsed = parseColor(edge === 'top' ? stops[0] : stops[stops.length - 1])
  return parsed && parsed.alpha >= 0.99 ? parsed.hex : null
}

/**
 * The color painted at a point on screen: the topmost element there with an
 * opaque background, walking up through transparent ancestors, taking a
 * gradient's nearest stop when one is in the way.
 */
function colorAt(x: number, y: number, edge: 'top' | 'bottom', fallbackVars: string[]): string {
  let el = document.elementFromPoint(x, y) as HTMLElement | null
  while (el) {
    const style = getComputedStyle(el)
    if (style.backgroundImage !== 'none') {
      const stop = gradientStop(style.backgroundImage, edge)
      if (stop) return stop
    }
    const parsed = parseColor(style.backgroundColor)
    if (parsed && parsed.alpha >= 0.99) return parsed.hex
    el = el.parentElement
  }
  for (const name of fallbackVars) {
    const value = cssVar(name)
    if (value) return value
  }
  const body = parseColor(getComputedStyle(document.body).backgroundColor)
  return body?.alpha ? body.hex : '#ffffff'
}

function readBars() {
  const x = Math.round(window.innerWidth / 2)
  const statusColor = colorAt(x, 1, 'top', ['--kid-bg-a', '--hero-fill', '--card-bg'])
  const navColor = colorAt(x, window.innerHeight - 1, 'bottom', ['--kid-bg-c', '--card-bg'])
  return {
    statusColor,
    navColor,
    lightStatusIcons: relativeLuminance(statusColor) < 0.5,
    lightNavIcons: relativeLuminance(navColor) < 0.5,
  }
}

export function AndroidSystemBars() {
  const pathname = usePathname()

  useEffect(() => {
    if (!isAndroidShell()) return
    const plugin = (window as unknown as { Capacitor?: { Plugins?: { SystemBarsTheme?: SystemBarsPlugin } } })
      .Capacitor?.Plugins?.SystemBarsTheme
    if (!plugin) return

    let last = ''
    let frame = 0
    const sync = () => {
      const bars = readBars()
      const key = JSON.stringify(bars)
      if (key === last) return
      last = key
      void plugin.apply(bars).catch(() => {
        // A rejected color (a page painting something exotic) is not worth a log line.
      })
    }
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(sync)
    }

    // The theme lands as CSS variables on <html> and a dark-mode class, and a
    // page swap changes what sits at the screen edges, so both are watched. The
    // delayed pass catches a page still painting on the first frame.
    const observer = new MutationObserver(schedule)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class', 'data-seasonal-theme', 'data-kid-theme'] })
    observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'style'] })
    window.addEventListener('resize', schedule)

    schedule()
    const settled = window.setTimeout(sync, 600)
    const painted = window.setTimeout(sync, 2000)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', schedule)
      cancelAnimationFrame(frame)
      window.clearTimeout(settled)
      window.clearTimeout(painted)
    }
  }, [pathname])

  return null
}
