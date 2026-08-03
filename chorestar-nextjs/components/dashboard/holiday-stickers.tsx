'use client'

import { useEffect, useState } from 'react'
import { ChoreIcon } from '@/components/ui/chore-icon'
import { useSettings } from '@/lib/contexts/settings-context'
import { resolveActiveTheme } from '@/lib/utils/resolve-theme'
import { getHolidayDecoration, type HolidayDecoration } from '@/lib/utils/holiday-stickers'
import type { CustomTheme } from '@/lib/supabase/database.types'

/**
 * Decorative holiday art for the dashboard hero — a small cluster of the active
 * holiday's icons tucked into the right edge.
 *
 * Purely ornamental, so it's aria-hidden and non-interactive. It stays inside the
 * right-hand strip and never overlaps the text column, which is what keeps it
 * from affecting text contrast.
 *
 * Resolved in an effect rather than during render: the pick depends on the
 * current date, so computing it on the server risks a hydration mismatch when a
 * request and the browser straddle midnight or sit in different timezones.
 */
export function HolidayStickers() {
  const { settings } = useSettings()
  const [decoration, setDecoration] = useState<HolidayDecoration | null>(null)

  const customTheme = (settings?.custom_theme ?? null) as CustomTheme | null

  useEffect(() => {
    const active = resolveActiveTheme(customTheme)
    setDecoration(getHolidayDecoration(active?.id ?? null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customTheme?.seasonalTheme, customTheme?.autoSeasonal])

  if (!decoration) return null

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 right-0 hidden w-[38%] select-none sm:block"
      data-holiday={decoration.holiday.id}
    >
      {decoration.stickers.map((s, i) => (
        <ChoreIcon
          key={`${s.emoji}-${i}`}
          emoji={s.emoji}
          className="absolute"
          style={{
            top: `${s.top}%`,
            right: `${s.right}%`,
            width: s.size,
            height: s.size,
            opacity: s.opacity,
            transform: `rotate(${s.rotation}deg)`,
          }}
        />
      ))}
    </div>
  )
}
