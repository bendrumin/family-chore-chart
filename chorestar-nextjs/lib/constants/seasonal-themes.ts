export interface SeasonalActivity {
  name: string
  icon: string
  category: string
}

export interface SeasonalTheme {
  id: string
  name: string
  icon: string
  startDate: string // MM-DD format
  endDate: string // MM-DD format
  seasonalActivities: SeasonalActivity[]
}

export const SEASONAL_THEMES_DATA: Record<string, SeasonalTheme> = {
  christmas: {
    id: 'christmas',
    name: 'Christmas',
    icon: '🎄',
    startDate: '12-01',
    endDate: '12-31',
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
    seasonalActivities: [
      { name: 'Dye Easter Eggs', icon: '🥚', category: 'creative_time' },
      { name: 'Decorate Easter Basket', icon: '🧺', category: 'family_time' },
      { name: 'Spring Cleaning', icon: '🌸', category: 'household_chores' },
      { name: 'Plant Flowers', icon: '🌷', category: 'creative_time' },
      { name: 'Hide Easter Eggs', icon: '🥚', category: 'games_play' },
      { name: 'Make Easter Crafts', icon: '🎨', category: 'creative_time' }
    ]
  },
  valentines: {
    id: 'valentines',
    name: "Valentine's Day",
    icon: '💝',
    startDate: '02-10',
    endDate: '02-14',
    seasonalActivities: [
      { name: 'Make Valentine Cards', icon: '💌', category: 'creative_time' },
      { name: 'Decorate with Hearts', icon: '💖', category: 'creative_time' },
      { name: 'Bake Heart Cookies', icon: '🍪', category: 'creative_time' },
      { name: 'Set Romantic Table', icon: '🕯️', category: 'family_time' },
      { name: 'Clean for Date Night', icon: '✨', category: 'household_chores' }
    ]
  },
  stpatricks: {
    id: 'stpatricks',
    name: "St. Patrick's Day",
    icon: '☘️',
    startDate: '03-15',
    endDate: '03-17',
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
    seasonalActivities: [
      { name: 'Set New Year Goals', icon: '📝', category: 'learning_education' },
      { name: 'Organize for New Year', icon: '🗂️', category: 'household_chores' },
      { name: 'Clean House for Party', icon: '🎊', category: 'household_chores' },
      { name: 'Make Resolution List', icon: '✅', category: 'learning_education' }
    ]
  }
}

// Helper function to get current seasonal theme based on date
export function getCurrentSeasonalTheme(): SeasonalTheme | null {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const currentDate = `${month}-${day}`

  for (const theme of Object.values(SEASONAL_THEMES_DATA)) {
    const start = theme.startDate
    const end = theme.endDate
    
    // Handle themes that span across year boundary (e.g., winter)
    if (start > end) {
      // Theme spans year boundary
      if (currentDate >= start || currentDate <= end) {
        return theme
      }
    } else {
      // Normal date range
      if (currentDate >= start && currentDate <= end) {
        return theme
      }
    }
  }
  
  return null
}

