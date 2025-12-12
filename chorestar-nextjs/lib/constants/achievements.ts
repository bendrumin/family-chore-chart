export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  requirement: {
    type: 'first_chore' | 'week_complete' | 'streak' | 'total_count' | 'category_count' | 'early_bird'
    count?: number
    category?: string
    streak_days?: number
  }
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_steps',
    name: 'First Steps',
    description: 'Complete your first chore',
    icon: '👶',
    rarity: 'common',
    requirement: {
      type: 'first_chore',
    },
  },
  {
    id: 'week_warrior',
    name: 'Week Warrior',
    description: 'Complete all chores for a full week',
    icon: '⚔️',
    rarity: 'rare',
    requirement: {
      type: 'week_complete',
    },
  },
  {
    id: 'streak_master',
    name: 'Streak Master',
    description: 'Maintain a 10-day streak',
    icon: '🔥',
    rarity: 'epic',
    requirement: {
      type: 'streak',
      streak_days: 10,
    },
  },
  {
    id: 'perfect_week',
    name: 'Perfect Week',
    description: 'Complete every single chore for a week',
    icon: '⭐',
    rarity: 'legendary',
    requirement: {
      type: 'week_complete',
    },
  },
  {
    id: 'family_helper',
    name: 'Family Helper',
    description: 'Complete 50 household chores',
    icon: '🏠',
    rarity: 'rare',
    requirement: {
      type: 'category_count',
      category: 'Household',
      count: 50,
    },
  },
  {
    id: 'little_scholar',
    name: 'Little Scholar',
    description: 'Complete 25 learning activities',
    icon: '📚',
    rarity: 'rare',
    requirement: {
      type: 'category_count',
      category: 'Learning',
      count: 25,
    },
  },
  {
    id: 'creative_artist',
    name: 'Creative Artist',
    description: 'Complete 20 creative activities',
    icon: '🎨',
    rarity: 'rare',
    requirement: {
      type: 'category_count',
      category: 'Creative',
      count: 20,
    },
  },
  {
    id: 'young_athlete',
    name: 'Young Athlete',
    description: 'Complete 30 physical activities',
    icon: '🏃',
    rarity: 'rare',
    requirement: {
      type: 'category_count',
      category: 'Physical',
      count: 30,
    },
  },
  {
    id: 'chore_champion',
    name: 'Chore Champion',
    description: 'Complete 100 total chores',
    icon: '🏆',
    rarity: 'epic',
    requirement: {
      type: 'total_count',
      count: 100,
    },
  },
  {
    id: 'super_star',
    name: 'Super Star',
    description: 'Complete 250 total chores',
    icon: '🌟',
    rarity: 'legendary',
    requirement: {
      type: 'total_count',
      count: 250,
    },
  },
]

export const RARITY_COLORS = {
  common: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    border: 'border-gray-400',
    text: 'text-gray-700 dark:text-gray-300',
    gradient: 'from-gray-400 to-gray-600',
  },
  rare: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-500',
    text: 'text-blue-700 dark:text-blue-300',
    gradient: 'from-blue-400 to-blue-600',
  },
  epic: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    border: 'border-purple-500',
    text: 'text-purple-700 dark:text-purple-300',
    gradient: 'from-purple-400 to-purple-600',
  },
  legendary: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-500',
    text: 'text-yellow-700 dark:text-yellow-300',
    gradient: 'from-yellow-400 to-orange-600',
  },
}
