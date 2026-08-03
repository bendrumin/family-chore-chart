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
}

/**
 * Derives a theme's four color slots from a single accent.
 *
 * Every accent is deliberately deep enough that white text clears 4.5:1 on it.
 * That matters because ~38 elements put hardcoded `text-white` on an accent
 * background, and no amount of downstream correction can help those — the old
 * palette had 12 of 17 themes failing there, summer's #ffd700 at 1.40:1 being
 * the "white text on yellow" case. Picking calmer, deeper accents fixes it at
 * the source rather than papering over it.
 *
 * Light secondary and both dark slots come off the accent's own ramp, so a theme
 * can never be an unrelated pair of hues.
 */
function paletteFrom(accent: string): ThemeColors {
  const ramp = accentScale(accent)
  return {
    light: { primary: accent, secondary: ramp[700] },
    dark: { primary: ramp[400], secondary: ramp[300] },
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
    colors: paletteFrom('#c41e3a'),
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
    colors: paletteFrom('#a3541b'),
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
    colors: paletteFrom('#c2410c'),
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
    colors: paletteFrom('#7e22ce'),
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
    colors: paletteFrom('#be185d'),
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
    colors: paletteFrom('#15803d'),
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
    colors: paletteFrom('#b45309'),
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
    colors: paletteFrom('#db2777'),
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
    colors: paletteFrom('#9a3412'),
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
    colors: paletteFrom('#0369a1'),
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
    colors: paletteFrom('#a16207'),
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
    colors: paletteFrom('#b91c1c')
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    icon: '🌊',
    colors: paletteFrom('#006994')
  },
  forest: {
    id: 'forest',
    name: 'Forest',
    icon: '🌲',
    colors: paletteFrom('#2d5016')
  },
  aurora: {
    id: 'aurora',
    name: 'Aurora',
    icon: '🌌',
    colors: paletteFrom('#4a148c')
  },
  coral: {
    id: 'coral',
    name: 'Coral',
    icon: '🪸',
    colors: paletteFrom('#e11d48')
  },
  lavender: {
    id: 'lavender',
    name: 'Lavender',
    icon: '💜',
    colors: paletteFrom('#9b59b6')
  }
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


