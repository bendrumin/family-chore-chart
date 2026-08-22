'use client'

import { useMemo } from 'react'
import { useSettings } from '@/lib/contexts/settings-context'
import { resolveActiveTheme } from '@/lib/utils/resolve-theme'
import { SEASONAL_THEMES_DATA } from '@/lib/constants/seasonal-themes'
import type { CustomTheme } from '@/lib/supabase/database.types'

/**
 * Soft drifting glyphs inside the hero — iOS ThemeParticleOverlay energy,
 * without sticker clutter. Uses the active theme's icon (holidays and seasons).
 * Pure CSS animation; aria-hidden.
 */
const FALLBACK_GLYPH: Record<string, string> = {
  winter: '❄',
  christmas: '❄',
  valentine: '♥',
  halloween: '✦',
  stPatricks: '✦',
  newYear: '✦',
  easter: '❀',
  spring: '❀',
  summer: '✦',
  fall: '🍂',
  thanksgiving: '🍂',
  ocean: '◦',
  coral: '◦',
  aurora: '✦',
  forest: '❀',
  sunset: '✦',
  lavender: '✿',
}

function particleGlyph(themeId: string | null | undefined): string | null {
  if (!themeId) return null
  const data = SEASONAL_THEMES_DATA[themeId]
  if (data?.icon) return data.icon
  return FALLBACK_GLYPH[themeId] ?? null
}

export function ThemeParticles({ count = 10 }: { count?: number }) {
  const { settings } = useSettings()
  const active = resolveActiveTheme((settings?.custom_theme ?? null) as CustomTheme | null)
  const glyph = particleGlyph(active?.id)

  const particles = useMemo(() => {
    if (!glyph) return []
    return Array.from({ length: count }, (_, i) => {
      const seed = (i + 1) * 17
      return {
        id: i,
        left: ((seed * 37) % 90) + 5,
        delay: ((seed * 13) % 80) / 10,
        duration: 14 + ((seed * 7) % 10),
        size: 11 + (seed % 10),
        opacity: 0.12 + ((seed % 5) * 0.03),
      }
    })
  }, [glyph, count])

  if (!glyph || particles.length === 0) return null

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map(p => (
        <span
          key={p.id}
          className="absolute theme-particle select-none"
          style={{
            left: `${p.left}%`,
            top: '-12%',
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
