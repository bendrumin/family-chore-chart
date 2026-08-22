import { accentScale } from '@/lib/utils/accent-scale'

export interface SeasonalActivity {
  name: string
  icon: string
  category: string
}

/** Accent colors for a theme, per light/dark mode. */
export interface ThemeColors {
  light: { primary: string; secondary: string }
  dark: { primary: string; secondary: string }
  /**
   * An optional pale SECOND hue, for decoration only — the ambient backdrop
   * blobs and similar washes. Never a fill under text.
   *
   * This exists because a single accent can only ever produce a monochrome ramp.
   * The character of a designer's palette usually lives in the relationship
   * between two hues — pink blossom against blue sky, blush against teal — and
   * that is exactly what one hue cannot express. Photo-derived palette colors
   * are also almost never dark enough to carry white text (of the five in
   * "Edge of Paradise", none clear 4.5:1), so they can only be safe in a role
   * where no text lands on them.
   */
  tint?: string
  /**
   * An optional saturated second hue for celebration-sized accents — badges,
   * streak flames, confetti. Small or dark-inked, never a large fill.
   */
  highlight?: string
}

/** Extra palette roles a theme may declare beyond its single accent. */
export interface PaletteRoles {
  tint?: string
  highlight?: string
}

/**
 * Derives a theme's four color slots from a single accent.
 *
 * Accents no longer have to be dark enough for white text. They used to, because
 * elements hardcoded `text-white` on an accent background and no downstream
 * correction can help a literal class — the old palette had 12 of 17 themes
 * failing there, summer's #ffd700 at 1.40:1 being the "white text on yellow"
 * case. The fix at the time was to pick only deep accents, which also meant
 * every photo-derived palette color had to be darkened away from what the
 * designer chose.
 *
 * Those hardcoded classes are gone; accent fills derive their ink through
 * .accent-fill / --primary-foreground, which resolves to dark on a pale accent
 * and white on a deep one. So a true palette color is now usable as-is: the
 * paradise teal is 3.32:1 against white but 5.35:1 against dark ink. The
 * remaining constraint is narrow — a color that fails against BOTH inks (a band
 * around 4.36:1, e.g. #e7206b) still gets nudged by accessiblePair.
 *
 * Light secondary and both dark slots come off the accent's own ramp, so a theme
 * can never be an unrelated pair of hues.
 */
function paletteFrom(accent: string, roles: PaletteRoles = {}): ThemeColors {
  const ramp = accentScale(accent)
  return {
    light: { primary: accent, secondary: ramp[700] },
    dark: { primary: ramp[400], secondary: ramp[300] },
    ...(roles.tint ? { tint: roles.tint } : {}),
    ...(roles.highlight ? { highlight: roles.highlight } : {}),
  }
}

export interface SeasonalTheme {
  id: string
  name: string
  icon: string
  startDate: string // MM-DD format
  endDate: string // MM-DD format
  colors: ThemeColors
  /**
   * Festive emoji for the decorative sticker cluster. Curated rather than reused
   * from seasonalActivities, because those are chore icons — Thanksgiving's list
   * yields a bed ("Clean Guest Room") and New Year's a card-index divider, which
   * read as housework rather than decoration. Holidays only.
   */
  decorativeIcons?: string[]
  /**
   * True for a dated holiday, false for a broad season. Only holidays get the
   * decorative sticker cluster — spring/summer/fall/winter cover roughly 300
   * days a year between them, and a permanent decoration stops reading as
   * special. Seasons still get their accent colors.
   */
  isHoliday: boolean
  seasonalActivities: SeasonalActivity[]
}

export const SEASONAL_THEMES_DATA: Record<string, SeasonalTheme> = {
  christmas: {
    id: 'christmas',
    name: 'Christmas',
    icon: '🎄',
    startDate: '12-01',
    endDate: '12-31',
    // iOS SeasonalThemes — red → green (not same-hue ramp).
    colors: paletteFrom('#dc2626', { highlight: '#218733' }),
    decorativeIcons: ['🎄', '🎁', '🧦', '🍪', '⭐', '❄️'],
    isHoliday: true,
    seasonalActivities: [
      { name: 'Decorate Christmas Tree', icon: '🎄', category: 'family_time' },
      { name: 'Wrap Presents', icon: '🎁', category: 'creative_time' },
      { name: 'Bake Cookies', icon: '🍪', category: 'creative_time' },
      { name: 'Write Thank You Cards', icon: '✉️', category: 'learning_education' },
      { name: 'Hang Stockings', icon: '🧦', category: 'household_chores' },
      { name: 'Set Up Nativity', icon: '👼', category: 'family_time' }
    ]
  },
  thanksgiving: {
    id: 'thanksgiving',
    name: 'Thanksgiving',
    icon: '🦃',
    startDate: '11-20',
    endDate: '11-30',
    colors: paletteFrom('#ea8811', { highlight: '#c7590d' }),
    decorativeIcons: ['🦃', '🍁', '🥧', '🌽', '🍂'],
    isHoliday: true,
    seasonalActivities: [
      { name: 'Set Thanksgiving Table', icon: '🍽️', category: 'household_chores' },
      { name: 'Help Cook Turkey', icon: '🦃', category: 'creative_time' },
      { name: 'Make Side Dishes', icon: '🥔', category: 'creative_time' },
      { name: 'Clean Guest Room', icon: '🛏️', category: 'household_chores' },
      { name: 'Decorate with Fall Colors', icon: '🍁', category: 'creative_time' }
    ]
  },
  halloween: {
    id: 'halloween',
    name: 'Halloween',
    icon: '🎃',
    startDate: '10-01',
    endDate: '10-31',
    colors: paletteFrom('#f79307', { highlight: '#8c24ab' }),
    decorativeIcons: ['🎃', '👻', '🕷️', '🍬', '🍭', '🧙‍♀️'],
    isHoliday: true,
    seasonalActivities: [
      { name: 'Carve Pumpkin', icon: '🎃', category: 'creative_time' },
      { name: 'Decorate House', icon: '👻', category: 'creative_time' },
      { name: 'Make Costume', icon: '🧙‍♀️', category: 'creative_time' },
      { name: 'Trick or Treat Prep', icon: '🍬', category: 'family_time' },
      { name: 'Set Up Scary Decorations', icon: '🕷️', category: 'creative_time' },
      { name: 'Organize Candy', icon: '🍭', category: 'household_chores' }
    ]
  },
  easter: {
    id: 'easter',
    name: 'Easter',
    icon: '🐰',
    startDate: '04-01',
    endDate: '04-30',
    colors: paletteFrom('#a855f7', { highlight: '#ed789e' }),
    decorativeIcons: ['🐰', '🥚', '🌷', '🧺', '🌸'],
    isHoliday: true,
    seasonalActivities: [
      { name: 'Dye Easter Eggs', icon: '🥚', category: 'creative_time' },
      { name: 'Decorate Easter Basket', icon: '🧺', category: 'family_time' },
      { name: 'Spring Cleaning', icon: '🌸', category: 'household_chores' },
      { name: 'Plant Flowers', icon: '🌷', category: 'creative_time' },
      { name: 'Hide Easter Eggs', icon: '🥚', category: 'games_play' },
      { name: 'Make Easter Crafts', icon: '🎨', category: 'creative_time' }
    ]
  },
  valentine: {
    id: 'valentine',
    name: "Valentine's Day",
    icon: '💝',
    startDate: '02-10',
    endDate: '02-14',
    colors: paletteFrom('#ec4899', { highlight: '#d92e61' }),
    decorativeIcons: ['💝', '💌', '💖', '🌹', '💕'],
    isHoliday: true,
    seasonalActivities: [
      { name: 'Make Valentine Cards', icon: '💌', category: 'creative_time' },
      { name: 'Decorate with Hearts', icon: '💖', category: 'creative_time' },
      { name: 'Bake Heart Cookies', icon: '🍪', category: 'creative_time' },
      { name: 'Set Romantic Table', icon: '🕯️', category: 'family_time' },
      { name: 'Clean for Date Night', icon: '✨', category: 'household_chores' }
    ]
  },
  stPatricks: {
    id: 'stPatricks',
    name: "St. Patrick's Day",
    icon: '☘️',
    startDate: '03-15',
    endDate: '03-17',
    colors: paletteFrom('#22b84e', { highlight: '#148738' }),
    decorativeIcons: ['☘️', '🍀', '🌈', '🎩'],
    isHoliday: true,
    seasonalActivities: [
      { name: 'Decorate with Shamrocks', icon: '☘️', category: 'creative_time' },
      { name: 'Make Green Food', icon: '🥗', category: 'creative_time' },
      { name: 'Wear Green Clothes', icon: '👕', category: 'household_chores' },
      { name: 'Clean for Party', icon: '🍀', category: 'household_chores' }
    ]
  },
  summer: {
    id: 'summer',
    name: 'Summer',
    icon: '☀️',
    startDate: '06-01',
    endDate: '08-31',
    // Edge of Paradise / iOS: teal → flamingo coral.
    colors: paletteFrom('#3a9aa3', { tint: '#f1c8c1', highlight: '#ed706f' }),
    isHoliday: false,
    seasonalActivities: [
      { name: 'Water Plants', icon: '💧', category: 'physical_activity' },
      { name: 'Clean Pool', icon: '🏊', category: 'household_chores' },
      { name: 'BBQ Prep', icon: '🍖', category: 'creative_time' },
      { name: 'Beach Cleanup', icon: '🏖️', category: 'physical_activity' },
      { name: 'Mow Lawn', icon: '🌱', category: 'physical_activity' },
      { name: 'Wash Car', icon: '🚗', category: 'household_chores' }
    ]
  },
  spring: {
    id: 'spring',
    name: 'Spring',
    icon: '🌸',
    startDate: '03-20',
    endDate: '06-20',
    colors: paletteFrom('#ee3c6b', { tint: '#c5d8eb', highlight: '#e7206b' }),
    isHoliday: false,
    seasonalActivities: [
      { name: 'Spring Cleaning', icon: '🧹', category: 'household_chores' },
      { name: 'Plant Garden', icon: '🌱', category: 'creative_time' },
      { name: 'Clean Windows', icon: '🪟', category: 'household_chores' },
      { name: 'Organize Closets', icon: '👕', category: 'household_chores' },
      { name: 'Wash Curtains', icon: '🪟', category: 'household_chores' }
    ]
  },
  fall: {
    id: 'fall',
    name: 'Fall',
    icon: '🍁',
    startDate: '09-22',
    endDate: '12-20',
    colors: paletteFrom('#b31e11', { tint: '#ee9c15', highlight: '#fa6a18' }),
    isHoliday: false,
    seasonalActivities: [
      { name: 'Rake Leaves', icon: '🍂', category: 'physical_activity' },
      { name: 'Clean Gutters', icon: '🏠', category: 'household_chores' },
      { name: 'Store Summer Items', icon: '📦', category: 'household_chores' },
      { name: 'Decorate for Fall', icon: '🎃', category: 'creative_time' },
      { name: 'Make Hot Chocolate', icon: '☕', category: 'creative_time' }
    ]
  },
  winter: {
    id: 'winter',
    name: 'Winter',
    icon: '❄️',
    startDate: '12-21',
    endDate: '03-19',
    colors: paletteFrom('#1a22b0', { tint: '#a9adb1', highlight: '#2f7cc6' }),
    isHoliday: false,
    seasonalActivities: [
      { name: 'Shovel Snow', icon: '❄️', category: 'physical_activity' },
      { name: 'Salt Driveway', icon: '🧂', category: 'household_chores' },
      { name: 'Make Hot Soup', icon: '🍲', category: 'creative_time' },
      { name: 'Organize Winter Clothes', icon: '🧥', category: 'household_chores' },
      { name: 'Check Heating System', icon: '🔥', category: 'household_chores' }
    ]
  },
  newYear: {
    id: 'newYear',
    name: 'New Year',
    icon: '🎉',
    startDate: '12-28',
    endDate: '01-05',
    // iOS: indigo → purple (not gold).
    colors: paletteFrom('#6366f1', { highlight: '#8c5cf7' }),
    decorativeIcons: ['🎉', '🎊', '✨', '🎆', '⭐'],
    isHoliday: true,
    seasonalActivities: [
      { name: 'Set New Year Goals', icon: '📝', category: 'learning_education' },
      { name: 'Organize for New Year', icon: '🗂️', category: 'household_chores' },
      { name: 'Clean House for Party', icon: '🎊', category: 'household_chores' },
      { name: 'Make Resolution List', icon: '✅', category: 'learning_education' }
    ]
  }
}

/**
 * Always-available accent themes. Not tied to a date, so they never take part in
 * auto-seasonal resolution — they're only ever chosen by hand.
 */
export const ACCENT_THEMES: Record<string, { id: string; name: string; icon: string; colors: ThemeColors }> = {
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    icon: '🌅',
    colors: paletteFrom('#ea4c23', { highlight: '#f59e0a' }),
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    icon: '🌊',
    colors: paletteFrom('#0284c7', { highlight: '#0a5ca6' }),
  },
  forest: {
    id: 'forest',
    name: 'Forest',
    icon: '🌲',
    colors: paletteFrom('#158750', { highlight: '#0d6138' }),
  },
  aurora: {
    id: 'aurora',
    name: 'Aurora',
    icon: '🌌',
    colors: paletteFrom('#592eba', { highlight: '#1fab8c' }),
  },
  coral: {
    id: 'coral',
    name: 'Coral',
    icon: '🪸',
    colors: paletteFrom('#f56b5b', { highlight: '#f59e0a' }),
  },
  lavender: {
    id: 'lavender',
    name: 'Lavender',
    icon: '💜',
    colors: paletteFrom('#9466dd', { highlight: '#6640b3' }),
  },
}

/**
 * Every pickable theme id → its accent colors. Single source of truth.
 *
 * This table was previously duplicated across settings-context, the appearance
 * tab and the premium-themes modal, and the copies drifted: two ids were spelled
 * differently in one of them, four themes existed in only one copy (so picking
 * them applied no color at all), and sunset had two different color pairs.
 */
export const THEME_COLORS: Record<string, ThemeColors> = Object.fromEntries([
  ...Object.values(SEASONAL_THEMES_DATA).map(t => [t.id, t.colors]),
  ...Object.values(ACCENT_THEMES).map(t => [t.id, t.colors]),
])

/** Days spanned by an MM-DD range, inclusive, handling a year-boundary wrap. */
export function seasonalWindowLength(startDate: string, endDate: string): number {
  const toOrdinal = (md: string) => {
    const [m, d] = md.split('-').map(Number)
    const cumulative = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
    return cumulative[m - 1] + d
  }
  const start = toOrdinal(startDate)
  const end = toOrdinal(endDate)
  return (end >= start ? end - start : 365 - start + end) + 1
}

/** Is an MM-DD inside an MM-DD range (inclusive), handling a wrap? */
export function isWithinSeasonalWindow(date: string, startDate: string, endDate: string): boolean {
  // Feb 29 exists in no window's bounds; treat it as Feb 28.
  if (date === '02-29') date = '02-28'
  return startDate > endDate
    ? date >= startDate || date <= endDate
    : date >= startDate && date <= endDate
}

/**
 * The seasonal theme active on a given date, or null.
 *
 * Windows overlap heavily — Christmas sits inside Fall, New Year straddles
 * Christmas and Winter — so the NARROWEST matching window wins. Returning the
 * first match in declaration order let a broad season shadow a specific
 * holiday: New Year (12-28→01-05) was unreachable, because Christmas covered its
 * December half and Winter covered its January half.
 */
export function getCurrentSeasonalTheme(now: Date = new Date()): SeasonalTheme | null {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const today = `${month}-${day}`

  let best: SeasonalTheme | null = null
  let bestWidth = Infinity

  for (const theme of Object.values(SEASONAL_THEMES_DATA)) {
    if (!isWithinSeasonalWindow(today, theme.startDate, theme.endDate)) continue
    const width = seasonalWindowLength(theme.startDate, theme.endDate)
    if (width < bestWidth) {
      best = theme
      bestWidth = width
    }
  }

  return best
}


