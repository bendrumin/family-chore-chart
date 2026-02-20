'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Lock, Trophy } from 'lucide-react'
import type { AchievementProgress } from '@/lib/utils/achievement-tracker'

interface AchievementsDisplayProps {
  achievementProgress: AchievementProgress[]
  isLoading?: boolean
}

const rarityColors = {
  common: {
    bg: 'from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700',
    border: 'border-gray-300 dark:border-gray-600',
    text: 'text-gray-700 dark:text-gray-300',
    badge: 'bg-gray-500',
  },
  rare: {
    bg: 'from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30',
    border: 'border-blue-400 dark:border-blue-600',
    text: 'text-blue-700 dark:text-blue-300',
    badge: 'bg-blue-500',
  },
  epic: {
    bg: 'from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30',
    border: 'border-purple-400 dark:border-purple-600',
    text: 'text-purple-700 dark:text-purple-300',
    badge: 'bg-purple-500',
  },
  legendary: {
    bg: 'from-yellow-100 to-orange-200 dark:from-yellow-900/30 dark:to-orange-800/30',
    border: 'border-yellow-400 dark:border-yellow-600',
    text: 'text-yellow-700 dark:text-yellow-300',
    badge: 'bg-gradient-to-r from-yellow-500 to-orange-500',
  },
}

export function AchievementsDisplay({ achievementProgress, isLoading }: AchievementsDisplayProps) {
  const [displayProgress, setDisplayProgress] = useState(achievementProgress)

  useEffect(() => {
    setDisplayProgress(achievementProgress)
  }, [achievementProgress])

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-2">🏆</div>
        <p className="text-sm text-gray-600 dark:text-gray-400">Loading achievements...</p>
      </div>
    )
  }

  const earnedCount = displayProgress.filter(p => p.earned).length
  const totalCount = displayProgress.length

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Achievements
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {earnedCount} of {totalCount} unlocked
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-black bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
            {earnedCount}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">Earned</p>
        </div>
      </div>

      {/* Achievement Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {displayProgress.map((progress) => {
          const colors = rarityColors[progress.achievement.rarity]
          const isLocked = !progress.earned

          return (
            <Card
              key={progress.achievement.id}
              className={`
                relative overflow-hidden transition-all duration-300
                ${isLocked ? 'opacity-60 hover:opacity-80' : 'hover:scale-105 hover:shadow-lg'}
                border-2 ${colors.border}
                bg-gradient-to-br ${colors.bg}
              `}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div
                    className={`
                      text-4xl flex-shrink-0
                      ${isLocked ? 'grayscale opacity-50' : ''}
                    `}
                  >
                    {isLocked ? (
                      <div className="w-12 h-12 flex items-center justify-center bg-gray-300 dark:bg-gray-700 rounded-full">
                        <Lock className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                      </div>
                    ) : (
                      progress.achievement.icon
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className={`font-bold text-sm ${colors.text}`}>
                        {progress.achievement.name}
                      </h4>
                      <Badge
                        className={`${colors.badge} text-white text-xs px-2 py-0.5 capitalize`}
                      >
                        {progress.achievement.rarity}
                      </Badge>
                    </div>

                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                      {progress.achievement.description}
                    </p>

                    {/* Progress Bar */}
                    {!progress.earned && progress.progress > 0 && (
                      <div className="space-y-1">
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${colors.badge} transition-all duration-500`}
                            style={{ width: `${progress.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {progress.currentCount} / {progress.requiredCount}
                          {' '}({Math.round(progress.progress)}%)
                        </p>
                      </div>
                    )}

                    {/* Earned Date */}
                    {progress.earned && progress.earnedAt && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        ✅ Unlocked {new Date(progress.earnedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>

              {/* Shine effect for earned achievements */}
              {progress.earned && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer pointer-events-none" />
              )}
            </Card>
          )
        })}
      </div>

      {/* Empty State */}
      {displayProgress.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏆</div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            No Achievements Yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Complete chores to start earning achievements!
          </p>
        </div>
      )}
    </div>
  )
}
