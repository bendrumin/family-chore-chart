export type ChoreCategory =
  | 'household_chores'
  | 'learning_education'
  | 'physical_activity'
  | 'creative_time'
  | 'games_play'
  | 'reading'
  | 'family_time'
  | 'custom'

export interface CategoryInfo {
  id: ChoreCategory
  color: string
  label: string
  icon: string
  bgColor: string
  description: string
}

export const CHORE_CATEGORIES: Record<ChoreCategory, CategoryInfo> = {
  household_chores: {
    id: 'household_chores',
    color: '#3b82f6',
    label: 'Household Chores',
    icon: '🏠',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    description: 'Cleaning, organizing, and maintaining the home'
  },
  learning_education: {
    id: 'learning_education',
    color: '#8b5cf6',
    label: 'Learning & Education',
    icon: '📚',
    bgColor: 'rgba(139, 92, 246, 0.1)',
    description: 'Homework, studying, and educational activities'
  },
  physical_activity: {
    id: 'physical_activity',
    color: '#f97316',
    label: 'Physical Activity',
    icon: '🏃',
    bgColor: 'rgba(249, 115, 22, 0.1)',
    description: 'Sports, exercise, and outdoor activities'
  },
  creative_time: {
    id: 'creative_time',
    color: '#ec4899',
    label: 'Creative Time',
    icon: '🎨',
    bgColor: 'rgba(236, 72, 153, 0.1)',
    description: 'Art, music, crafts, and creative projects'
  },
  games_play: {
    id: 'games_play',
    color: '#10b981',
    label: 'Games & Play',
    icon: '🎮',
    bgColor: 'rgba(16, 185, 129, 0.1)',
    description: 'Gaming, puzzles, and recreational activities'
  },
  reading: {
    id: 'reading',
    color: '#14b8a6',
    label: 'Reading',
    icon: '📖',
    bgColor: 'rgba(20, 184, 166, 0.1)',
    description: 'Books, magazines, and reading time'
  },
  family_time: {
    id: 'family_time',
    color: '#f59e0b',
    label: 'Family Time',
    icon: '❤️',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    description: 'Activities with family members'
  },
  custom: {
    id: 'custom',
    color: '#6b7280',
    label: 'Custom',
    icon: '⚙️',
    bgColor: 'rgba(107, 114, 128, 0.1)',
    description: 'Custom or other activities'
  }
}

export const getCategoryInfo = (category?: string): CategoryInfo => {
  if (!category || !(category in CHORE_CATEGORIES)) {
    return CHORE_CATEGORIES.household_chores
  }
  return CHORE_CATEGORIES[category as ChoreCategory]
}

export const getCategoryList = (): CategoryInfo[] => {
  return Object.values(CHORE_CATEGORIES)
}
