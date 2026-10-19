import type { ChallengeChoreFilter, ChallengeMetric, ChallengeMode, ChallengeRoutineType } from './progress'

/**
 * One-tap family challenge templates. Each fills the create form; the parent
 * still picks the kids and can change anything before saving. The window
 * defaults to this week (Sunday to Saturday, family timezone).
 */
export interface ChallengeTemplate {
  key: string
  emoji: string
  title: string
  reward_text: string
  metric: ChallengeMetric
  mode: ChallengeMode
  target: number
  chore_filter: ChallengeChoreFilter
  routine_type: ChallengeRoutineType | null
}

export const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  {
    key: 'pizza_night',
    emoji: '🍕',
    title: 'Pizza Night',
    reward_text: 'Pizza night',
    metric: 'chores',
    mode: 'team',
    target: 50,
    chore_filter: 'any',
    routine_type: null,
  },
  {
    key: 'movie_night',
    emoji: '🎬',
    title: 'Movie Night',
    reward_text: 'Family movie night',
    metric: 'routines',
    mode: 'each',
    target: 5,
    chore_filter: 'any',
    routine_type: 'bedtime',
  },
  {
    key: 'team_clean_up',
    emoji: '🧹',
    title: 'Team Clean-Up',
    reward_text: 'Ice cream trip',
    metric: 'chores',
    mode: 'team',
    target: 10,
    chore_filter: 'bonus',
    routine_type: null,
  },
  {
    key: 'early_birds',
    emoji: '🌅',
    title: 'Early Birds',
    reward_text: 'Pancake breakfast',
    metric: 'routines',
    mode: 'team',
    target: 10,
    chore_filter: 'any',
    routine_type: 'morning',
  },
  {
    key: 'everyone_pitches_in',
    emoji: '🙌',
    title: 'Everyone Pitches In',
    reward_text: 'Game night, winners pick',
    metric: 'chores',
    mode: 'each',
    target: 10,
    chore_filter: 'any',
    routine_type: null,
  },
]

export const CHALLENGE_EMOJIS = ['🏆', '🍕', '🎬', '🧹', '🌅', '🙌', '🍦', '🎲', '🏕️', '🎳', '🚀', '⭐'] as const
