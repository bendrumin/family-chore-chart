import { SEASONAL_THEMES_DATA, type SeasonalTheme } from '@/lib/constants/seasonal-themes'

export interface HolidaySticker {
  emoji: string
  /** Percentage offsets within the decoration layer. */
  top: number
  right: number
  /** Rendered size in px. */
  size: number
  rotation: number
  opacity: number
}

export interface HolidayDecoration {
  holiday: SeasonalTheme
  stickers: HolidaySticker[]
}

/**
 * Fixed slots for the cluster. Deliberately hand-placed rather than randomised:
 * the cluster has to stay clear of the hero's text column and its progress ring,
 * and random placement can't promise that. Only *which* emoji lands where varies.
 */
const SLOTS: Array<Omit<HolidaySticker, 'emoji'>> = [
  { top: 6, right: 3, size: 34, rotation: -14, opacity: 0.22 },
  { top: 44, right: 15, size: 24, rotation: 11, opacity: 0.16 },
  { top: 72, right: 6, size: 28, rotation: -6, opacity: 0.19 },
]

/**
 * Deterministic index from a date + salt.
 *
 * Not Math.random: the cluster must be stable for the whole day or it reshuffles
 * on every re-render and flickers, and it must agree between renders so React
 * doesn't report a hydration mismatch.
 */
function dailyIndex(now: Date, salt: number, modulo: number): number {
  if (modulo <= 0) return 0
  const key = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()
  let h = (key ^ (salt * 0x9e3779b1)) >>> 0
  h ^= h << 13
  h >>>= 0
  h ^= h >> 17
  h ^= h << 5
  h >>>= 0
  return h % modulo
}

/**
 * The decoration for whichever theme is currently in effect, or null.
 *
 * Keyed on the *active theme* rather than today's date, so picking Halloween by
 * hand in August shows pumpkins to match the orange accents. Broad seasons
 * (spring/summer/fall/winter) return null — they get accent colors but no art,
 * since between them they cover roughly 300 days a year and a permanent
 * decoration stops reading as special.
 *
 * Picks are distinct, so a cluster never shows the same emoji twice.
 */
export function getHolidayDecoration(
  activeThemeId: string | null | undefined,
  now: Date = new Date()
): HolidayDecoration | null {
  if (!activeThemeId) return null

  const holiday = SEASONAL_THEMES_DATA[activeThemeId]
  if (!holiday?.isHoliday) return null

  const unique = [...new Set(holiday.decorativeIcons ?? [holiday.icon])]
  if (unique.length === 0) return null

  const remaining = [...unique]
  const stickers: HolidaySticker[] = []

  for (const [i, slot] of SLOTS.entries()) {
    if (remaining.length === 0) break
    const [emoji] = remaining.splice(dailyIndex(now, i + 1, remaining.length), 1)
    stickers.push({ ...slot, emoji })
  }

  return { holiday, stickers }
}
