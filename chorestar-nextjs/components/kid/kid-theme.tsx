'use client'

import { useEffect, useMemo, useState } from 'react'
import { resolveActiveTheme, themeCssVars, THEME_CSS_VAR_NAMES } from '@/lib/utils/resolve-theme'
import { accessiblePairPreferWhite } from '@/lib/utils/contrast'
import { accentScale } from '@/lib/utils/accent-scale'
import { particleGlyph } from '@/components/dashboard/theme-particles'
import type { CustomTheme } from '@/lib/supabase/database.types'

/**
 * Kid mode wears the family's theme.
 *
 * Seventeen palettes were kept in sync between web and iOS, and the kid pages,
 * the screens the actual user looks at, were the only ones that ignored them:
 * a fixed purple gradient whatever the parent picked, on both platforms.
 *
 * Kid surfaces stay white-on-gradient (the by-design exception in CLAUDE.md).
 * What changes is WHICH gradient: the theme's hero fill pair becomes the page
 * background, the accent drives the Done ticks and progress, and the season's
 * particles drift over the page instead of the parent hero.
 *
 * The theme arrives with the kid's own session (/api/kid/child), because a kid
 * device has no parent settings in localStorage. It is cached per device so the
 * next visit paints before the fetch returns.
 */

const KID_THEME_CACHE_KEY = 'chorestar-kid-theme'
const KID_BG_VARS = ['--kid-bg-a', '--kid-bg-b', '--kid-bg-c'] as const

interface KidThemeVars {
  id: string | null
  vars: Record<string, string>
}

/** Every custom property kid mode may set, for a clean clear. */
const ALL_KID_VARS = [...THEME_CSS_VAR_NAMES, ...KID_BG_VARS]

/**
 * The properties to paint for a family theme. Light-mode values only: kid mode
 * is light-only by design, whatever the device's dark setting says.
 */
export function kidThemeVars(customTheme: CustomTheme | null | undefined, now: Date = new Date()): KidThemeVars {
  const active = resolveActiveTheme(customTheme, now)
  if (!active) return { id: null, vars: {} }

  const base = themeCssVars(active.colors, false)
  const primary = active.colors.light.primary

  // Three gradient stops, each deep enough to carry the page's white type:
  // the hero fill pair, then a lighter third stop from the theme's own tint (or
  // the accent's ramp) nudged until white passes on it. The old fixed gradient
  // ended on pale pink; this keeps the same shape with the family's hues.
  const third = active.colors.tint ?? accentScale(primary)[400]
  const vars: Record<string, string> = {
    ...base,
    '--kid-bg-a': base['--hero-fill'],
    '--kid-bg-b': base['--hero-secondary-fill'],
    '--kid-bg-c': accessiblePairPreferWhite(third).fill,
  }
  return { id: active.id, vars }
}

export function applyKidThemeVars(theme: KidThemeVars): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  for (const name of ALL_KID_VARS) root.style.removeProperty(name)
  for (const [name, value] of Object.entries(theme.vars)) root.style.setProperty(name, value)
  if (theme.id) root.setAttribute('data-kid-theme', theme.id)
  else root.removeAttribute('data-kid-theme')
}

export function clearKidThemeVars(): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  for (const name of ALL_KID_VARS) root.style.removeProperty(name)
  root.removeAttribute('data-kid-theme')
}

function readCachedTheme(): CustomTheme | null {
  try {
    const raw = localStorage.getItem(KID_THEME_CACHE_KEY)
    return raw ? (JSON.parse(raw) as CustomTheme) : null
  } catch {
    return null
  }
}

function cacheTheme(theme: CustomTheme | null): void {
  try {
    if (theme) localStorage.setItem(KID_THEME_CACHE_KEY, JSON.stringify(theme))
    else localStorage.removeItem(KID_THEME_CACHE_KEY)
  } catch {
    // Private mode or quota: the theme still applies for this visit.
  }
}

/**
 * Mounted once in the kid layout, so the theme survives navigation between
 * the dashboard and the routine player. Paints the cached theme immediately,
 * then refreshes it from the kid's session.
 */
export function KidThemeLoader() {
  const [themeId, setThemeId] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const paint = (customTheme: CustomTheme | null) => {
      const resolved = kidThemeVars(customTheme)
      applyKidThemeVars(resolved)
      if (active) setThemeId(resolved.id)
    }

    paint(readCachedTheme())

    let kidToken: string | null = null
    try {
      const raw = localStorage.getItem('kidMode')
      kidToken = raw ? (JSON.parse(raw)?.kidToken ?? null) : null
    } catch {
      kidToken = null
    }
    if (!kidToken) return () => { active = false }

    void (async () => {
      try {
        const res = await fetch('/api/kid/child', {
          headers: { Authorization: `Bearer ${kidToken}` },
          cache: 'no-store',
        })
        if (!res.ok || !active) return
        const data = await res.json()
        const theme = (data?.theme ?? null) as CustomTheme | null
        cacheTheme(theme)
        paint(theme)
      } catch {
        // Keep whatever is painted.
      }
    })()

    return () => {
      active = false
      clearKidThemeVars()
    }
  }, [])

  // Auto-seasonal can roll over while a tablet sits on the kitchen counter.
  useEffect(() => {
    const timer = setInterval(() => {
      const cached = readCachedTheme()
      if (cached?.autoSeasonal) {
        const resolved = kidThemeVars(cached)
        applyKidThemeVars(resolved)
        setThemeId(resolved.id)
      }
    }, 60 * 60 * 1000)
    return () => clearInterval(timer)
  }, [])

  return <KidThemeParticles themeId={themeId} />
}

/**
 * The season's glyphs drifting down the whole kid page. Same generator as the
 * parent hero's ThemeParticles, minus the settings context (kids have none).
 */
function KidThemeParticles({ themeId, count = 14 }: { themeId: string | null; count?: number }) {
  const glyph = particleGlyph(themeId)
  const particles = useMemo(() => {
    if (!glyph) return []
    return Array.from({ length: count }, (_, i) => {
      const seed = (i + 1) * 23
      return {
        id: i,
        left: ((seed * 37) % 92) + 4,
        delay: ((seed * 13) % 90) / 10,
        duration: 16 + ((seed * 7) % 12),
        size: 14 + (seed % 14),
        opacity: 0.16 + ((seed % 5) * 0.04),
      }
    })
  }, [glyph, count])

  if (!glyph || particles.length === 0) return null

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden z-0">
      {particles.map(p => (
        <span
          key={p.id}
          className="absolute theme-particle select-none text-white"
          style={{
            left: `${p.left}%`,
            top: '-8%',
            fontSize: p.size,
            opacity: p.opacity,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        >
          {glyph}
        </span>
      ))}
    </div>
  )
}
