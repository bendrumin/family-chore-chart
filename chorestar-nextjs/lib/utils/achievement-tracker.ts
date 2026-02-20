/**
 * Achievement Tracker
 * Tracks and manages user achievements based on completion data
 */

import { ACHIEVEMENTS, type Achievement } from '@/lib/constants/achievements'
import type { Database } from '@/lib/supabase/database.types'

type ChoreCompletion = Database['public']['Tables']['chore_completions']['Row']
type Chore = Database['public']['Tables']['chores']['Row']

export interface EarnedAchievement {
  achievementId: string
  earnedAt: string
  childId: string
}

export interface AchievementProgress {
  achievement: Achievement
  earned: boolean
  progress: number // 0-100 percentage
  currentCount: number
  requiredCount: number
  earnedAt?: string
}

/**
 * Check which achievements a child has earned based on their completion data
 */
export function checkAchievements(
  chores: Chore[],
  completions: ChoreCompletion[],
  childId: string,
  earnedAchievements: EarnedAchievement[] = []
): AchievementProgress[] {
  const results: AchievementProgress[] = []

  for (const achievement of ACHIEVEMENTS) {
    const alreadyEarned = earnedAchievements.find(
      ea => ea.achievementId === achievement.id && ea.childId === childId
    )

    const progress = calculateAchievementProgress(
      achievement,
      chores,
      completions,
      childId
    )

    results.push({
      achievement,
      earned: !!alreadyEarned || progress.progress >= 100,
      progress: progress.progress,
      currentCount: progress.currentCount,
      requiredCount: progress.requiredCount,
      earnedAt: alreadyEarned?.earnedAt,
    })
  }

  return results.sort((a, b) => {
    // Sort: earned first, then by progress, then by rarity
    if (a.earned && !b.earned) return -1
    if (!a.earned && b.earned) return 1
    if (a.progress !== b.progress) return b.progress - a.progress

    const rarityOrder = { common: 0, rare: 1, epic: 2, legendary: 3 }
    return rarityOrder[a.achievement.rarity] - rarityOrder[b.achievement.rarity]
  })
}

/**
 * Calculate progress toward an achievement
 */
function calculateAchievementProgress(
  achievement: Achievement,
  chores: Chore[],
  completions: ChoreCompletion[],
  childId: string
): { progress: number; currentCount: number; requiredCount: number } {
  const req = achievement.requirement

  switch (req.type) {
    case 'first_chore':
      return {
        progress: completions.length > 0 ? 100 : 0,
        currentCount: Math.min(completions.length, 1),
        requiredCount: 1,
      }

    case 'total_count':
      const requiredCount = req.count || 0
      const currentCount = completions.length
      return {
        progress: Math.min(100, (currentCount / requiredCount) * 100),
        currentCount,
        requiredCount,
      }

    case 'week_complete':
      // Check if there's any week where all chores were completed
      const weekCompletions = groupCompletionsByWeek(completions)
      const hasCompleteWeek = Array.from(weekCompletions.values()).some(
        weekComps => {
          const daysWithCompletions = new Set(
            weekComps.map(c => c.day_of_week).filter(d => d !== null)
          )
          // Check if all 7 days have completions and each day has all chores
          return daysWithCompletions.size >= 7
        }
      )
      return {
        progress: hasCompleteWeek ? 100 : 0,
        currentCount: hasCompleteWeek ? 1 : 0,
        requiredCount: 1,
      }

    case 'streak':
      const streakDays = req.streak_days || 0
      const currentStreak = calculateStreak(completions)
      return {
        progress: Math.min(100, (currentStreak / streakDays) * 100),
        currentCount: currentStreak,
        requiredCount: streakDays,
      }

    case 'category_count':
      const categoryChores = chores.filter(c => c.category === req.category)
      const categoryChoreIds = categoryChores.map(c => c.id)
      const categoryCompletions = completions.filter(c =>
        categoryChoreIds.includes(c.chore_id)
      )
      const categoryRequired = req.count || 0
      return {
        progress: Math.min(100, (categoryCompletions.length / categoryRequired) * 100),
        currentCount: categoryCompletions.length,
        requiredCount: categoryRequired,
      }

    case 'early_bird':
      // Count completions done before 9 AM (simplified)
      // This would need completion_time field to work properly
      return {
        progress: 0,
        currentCount: 0,
        requiredCount: req.count || 0,
      }

    default:
      return { progress: 0, currentCount: 0, requiredCount: 0 }
  }
}

/**
 * Group completions by week_start date
 */
function groupCompletionsByWeek(
  completions: ChoreCompletion[]
): Map<string, ChoreCompletion[]> {
  const weeks = new Map<string, ChoreCompletion[]>()

  completions.forEach(comp => {
    const weekStart = comp.week_start || 'unknown'
    if (!weeks.has(weekStart)) {
      weeks.set(weekStart, [])
    }
    weeks.get(weekStart)!.push(comp)
  })

  return weeks
}

/**
 * Calculate current streak (consecutive days with completions)
 */
function calculateStreak(completions: ChoreCompletion[]): number {
  if (completions.length === 0) return 0

  // Get unique days with completions, sorted by date
  const daysMap = new Map<string, Set<number>>()

  completions.forEach(comp => {
    const weekStart = comp.week_start || ''
    const dayOfWeek = comp.day_of_week

    if (!daysMap.has(weekStart)) {
      daysMap.set(weekStart, new Set())
    }
    if (dayOfWeek !== null) {
      daysMap.get(weekStart)!.add(dayOfWeek)
    }
  })

  // Simplified streak calculation
  let maxStreak = 0
  for (const days of daysMap.values()) {
    maxStreak = Math.max(maxStreak, days.size)
  }

  return maxStreak
}

/**
 * Get achievement storage key for a child
 */
export function getAchievementStorageKey(childId: string): string {
  return `chorestar_achievements_${childId}`
}

/**
 * Load earned achievements from localStorage
 */
export function loadEarnedAchievements(childId: string): EarnedAchievement[] {
  if (typeof window === 'undefined') return []

  const key = getAchievementStorageKey(childId)
  const stored = localStorage.getItem(key)

  if (!stored) return []

  try {
    return JSON.parse(stored)
  } catch {
    return []
  }
}

/**
 * Save earned achievement to localStorage
 */
export function saveEarnedAchievement(
  childId: string,
  achievementId: string
): void {
  if (typeof window === 'undefined') return

  const key = getAchievementStorageKey(childId)
  const existing = loadEarnedAchievements(childId)

  // Check if already earned
  if (existing.some(ea => ea.achievementId === achievementId)) {
    return
  }

  const newAchievement: EarnedAchievement = {
    achievementId,
    earnedAt: new Date().toISOString(),
    childId,
  }

  const updated = [...existing, newAchievement]
  localStorage.setItem(key, JSON.stringify(updated))
}

/**
 * Check for newly earned achievements and trigger celebrations
 */
export function checkForNewAchievements(
  childId: string,
  childName: string,
  achievementProgress: AchievementProgress[],
  onNewAchievement?: (achievement: Achievement) => void
): Achievement[] {
  const newlyEarned: Achievement[] = []
  const earnedAchievements = loadEarnedAchievements(childId)

  for (const progress of achievementProgress) {
    const alreadyStored = earnedAchievements.some(
      ea => ea.achievementId === progress.achievement.id
    )

    if (progress.earned && !alreadyStored) {
      // New achievement unlocked!
      saveEarnedAchievement(childId, progress.achievement.id)
      newlyEarned.push(progress.achievement)

      if (onNewAchievement) {
        onNewAchievement(progress.achievement)
      }
    }
  }

  return newlyEarned
}
