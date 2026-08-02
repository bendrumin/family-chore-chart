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

export interface SeasonalTheme {
  id: string
  name: string
  icon: string
  startDate: string // MM-DD format
  endDate: string // MM-DD format
  colors: ThemeColors
  seasonalActivities: SeasonalActivity[]
}

export const SEASONAL_THEMES_DATA: Record<string, SeasonalTheme> = {
  christmas: {
    id: 'christmas',
    name: 'Christmas',
    icon: '🎄',
    startDate: '12-01',
    endDate: '12-31',
    colors: {
      light: { primary: '#c41e3a', secondary: '#165b33' },
      dark: { primary: '#ff4757', secondary: '#2ed573' }
    },
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
    colors: {
      light: { primary: '#d2691e', secondary: '#cd853f' },
      dark: { primary: '#ff8c42', secondary: '#daa520' }
    },
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
    colors: {
      light: { primary: '#ff6600', secondary: '#1a1a1a' },
      dark: { primary: '#ff8c42', secondary: '#7b68ee' }
    },
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
    colors: {
      light: { primary: '#9370db', secondary: '#ffb6c1' },
      dark: { primary: '#ba68c8', secondary: '#f8bbd0' }
    },
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
    colors: {
      light: { primary: '#ff1493', secondary: '#ff69b4' },
      dark: { primary: '#ff4081', secondary: '#f48fb1' }
    },
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
    colors: {
      light: { primary: '#228b22', secondary: '#90ee90' },
      dark: { primary: '#4caf50', secondary: '#81c784' }
    },
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
    colors: {
      light: { primary: '#ffd700', secondary: '#87ceeb' },
      dark: { primary: '#ffe135', secondary: '#4fc3f7' }
    },
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
    colors: {
      light: { primary: '#ff69b4', secondary: '#90ee90' },
      dark: { primary: '#ff85c1', secondary: '#98fb98' }
    },
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
    colors: {
      light: { primary: '#d2691e', secondary: '#8b4513' },
      dark: { primary: '#ff8c42', secondary: '#cd853f' }
    },
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
    colors: {
      light: { primary: '#4682b4', secondary: '#b0c4de' },
      dark: { primary: '#64b5f6', secondary: '#90caf9' }
    },
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
    colors: {
      light: { primary: '#ffd700', secondary: '#4169e1' },
      dark: { primary: '#ffe135', secondary: '#5e92f3' }
    },
    seasonalActivities: [
      { name: 'Set New Year Goals', icon: '📝', category: 'learning_education' },
      { name: 'Organize for New Year', icon: '🗂️', category: 'household_chores' },
      { name: 'Clean House for Party', icon: '🎊', category: 'household_chores' },
      { name: 'Make Resolution List', icon: '✅', category: 'learning_education' }
    ]
  }
}

/**
 * Always-available accent themes. Not tied to a date, so they never take part
 * in auto-seasonal resolution — they're only ever chosen by hand.
 */
export const ACCENT_THEMES: Record<string, { id: string; name: string; icon: string; colors: ThemeColors }> = {
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    icon: '🌅',
    colors: {
      light: { primary: '#f97316', secondary: '#fb923c' },
      dark: { primary: '#f97316', secondary: '#fdba74' }
    }
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    icon: '🌊',
    colors: {
      light: { primary: '#006994', secondary: '#17c0eb' },
      dark: { primary: '#0288d1', secondary: '#29b6f6' }
    }
  },
  forest: {
    id: 'forest',
    name: 'Forest',
    icon: '🌲',
    colors: {
      light: { primary: '#2d5016', secondary: '#4a7c59' },
      dark: { primary: '#166534', secondary: '#22c55e' }
    }
  },
  aurora: {
    id: 'aurora',
    name: 'Aurora',
    icon: '🌌',
    colors: {
      light: { primary: '#4a148c', secondary: '#7b2cbf' },
      dark: { primary: '#6d28d9', secondary: '#8b5cf6' }
    }
  },
  coral: {
    id: 'coral',
    name: 'Coral',
    icon: '🪸',
    colors: {
      light: { primary: '#ff6b6b', secondary: '#ee5a6f' },
      dark: { primary: '#ef4444', secondary: '#f87171' }
    }
  },
  lavender: {
    id: 'lavender',
    name: 'Lavender',
    icon: '💜',
    colors: {
      light: { primary: '#9b59b6', secondary: '#8e44ad' },
      dark: { primary: '#a78bfa', secondary: '#c4b5fd' }
    }
  }
}

/**
 * Every pickable theme id → its accent colors. Single source of truth: this
 * table used to be duplicated in settings-context and the appearance tab, and
 * the copies drifted (two ids were spelled differently in one of them, so those
 * themes silently applied no colors at all).
 */
export const THEME_COLORS: Record<string, ThemeColors> = Object.fromEntries([
  ...Object.values(SEASONAL_THEMES_DATA).map(t => [t.id, t.colors]),
  ...Object.values(ACCENT_THEMES).map(t => [t.id, t.colors]),
])

const isLeapDayRange = (d: string) => d === '02-29'

/** Days spanned by an MM-DD range, inclusive, handling a year-boundary wrap. */
export function seasonalWindowLength(startDate: string, endDate: string): number {
  const toOrdinal = (md: string) => {
    const [m, d] = md.split('-').map(Number)
    // Day-of-year in a non-leap year is enough for comparing window widths.
    const cumulative = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
    return cumulative[m - 1] + d
  }
  const start = toOrdinal(startDate)
  const end = toOrdinal(endDate)
  return (end >= start ? end - start : 365 - start + end) + 1
}

/** Is an MM-DD inside an MM-DD range (inclusive), handling a wrap? */
export function isWithinSeasonalWindow(date: string, startDate: string, endDate: string): boolean {
  if (isLeapDayRange(date)) date = '02-28'
  return startDate > endDate
    ? date >= startDate || date <= endDate
    : date >= startDate && date <= endDate
}

/**
 * The seasonal theme active on a given date, or null.
 *
 * Windows overlap heavily — Christmas sits inside Fall, New Year straddles
 * Christmas and Winter — so the NARROWEST matching window wins. Picking the
 * first match in declaration order meant a specific holiday could be shadowed
 * by a broad season: New Year (12-28→01-05) was unreachable, because Christmas
 * covered its December half and Winter covered its January half.
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

