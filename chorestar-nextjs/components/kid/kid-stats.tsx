'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Flame, Lock, Trophy, Wallet, X } from 'lucide-react'
import { getWeekStart } from '@/lib/utils/date-helpers'
import { formatMoney } from '@/lib/constants/currencies'
import { RARITY_COLORS } from '@/lib/constants/achievements'

/**
 * The kid's own numbers: streak, this week's money, badges.
 *
 * The parent dashboard has had all three for a long time. The kid dashboard,
 * the screen the actual user looks at, had none of them. This strip and the
 * badge cabinet behind it are the fix. Kid mode is light-only by design
 * (white cards on the gradient), so there are no dark: variants here.
 */

interface KidBadge {
  id: string
  name: string
  description: string
  icon: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  earned: boolean
  progress: number
  currentCount: number
  requiredCount: number
}

export interface KidStatsData {
  streak: number
  bestStreak: number
  todayPerfect: boolean
  todayDue: number
  todayDone: number
  weekEarnedCents: number
  currencyCode: string
  badges: KidBadge[]
  earnedCount: number
  totalCount: number
  next: KidBadge | null
}

interface KidStatsProps {
  kidToken: string
  childName: string
  /** Bump to refetch, e.g. after a chore is ticked. */
  refreshKey?: number
}

export function KidStats({ kidToken, childName, refreshKey = 0 }: KidStatsProps) {
  const [stats, setStats] = useState<KidStatsData | null>(null)
  const [failed, setFailed] = useState(false)
  const [cabinetOpen, setCabinetOpen] = useState(false)
  const previousStreak = useRef<number | null>(null)

  useEffect(() => {
    let active = true
    const weekStart = getWeekStart()
    const dayOfWeek = new Date().getDay()
    void (async () => {
      try {
        const res = await fetch(`/api/kid/stats?weekStart=${weekStart}&dayOfWeek=${dayOfWeek}`, {
          headers: { Authorization: `Bearer ${kidToken}` },
          cache: 'no-store',
        })
        if (!res.ok) throw new Error(String(res.status))
        const data = (await res.json()) as KidStatsData
        if (!active) return
        setStats(data)
        setFailed(false)

        // A streak that just grew during this visit deserves its own moment,
        // distinct from the per-chore confetti.
        if (previousStreak.current !== null && data.streak > previousStreak.current) {
          import('@/lib/utils/celebrations')
            .then(({ getCelebrationManager }) => getCelebrationManager().celebrateStreak(data.streak))
            .catch(() => {})
        }
        previousStreak.current = data.streak
      } catch {
        if (active) setFailed(true)
      }
    })()
    return () => { active = false }
  }, [kidToken, refreshKey])

  // Numbers are motivation, not navigation: if they cannot load, show nothing
  // rather than a broken strip above a working chore list.
  if (failed) return null

  if (!stats) {
    return (
      <div className="max-w-2xl mx-auto mb-8 grid grid-cols-3 gap-3" aria-hidden>
        {[0, 1, 2].map(i => (
          <div key={i} className="h-28 rounded-2xl bg-white/40 animate-pulse" />
        ))}
      </div>
    )
  }

  const money = formatMoney(stats.weekEarnedCents, stats.currencyCode)

  return (
    <>
      <div className="max-w-2xl mx-auto mb-8 grid grid-cols-3 gap-3">
        <Tile
          index={0}
          icon={<Flame className="w-6 h-6" aria-hidden />}
          iconClass="text-orange-500"
          value={String(stats.streak)}
          label="day streak"
          sub={stats.bestStreak > stats.streak ? `best: ${stats.bestStreak}` : stats.streak > 0 ? 'your best!' : 'finish today to start'}
          ariaLabel={`${stats.streak} day streak, best ${stats.bestStreak}`}
        />
        <Tile
          index={1}
          icon={<Wallet className="w-6 h-6" aria-hidden />}
          iconClass="text-emerald-600"
          value={money}
          label="this week"
          sub={stats.todayPerfect ? 'today is done!' : `${stats.todayDone} of ${stats.todayDue} today`}
          ariaLabel={`${money} earned this week`}
        />
        <Tile
          index={2}
          icon={<Trophy className="w-6 h-6" aria-hidden />}
          iconClass="text-yellow-500"
          value={`${stats.earnedCount}/${stats.totalCount}`}
          label="badges"
          sub={stats.next ? `next: ${stats.next.name}` : 'all earned!'}
          ariaLabel={`${stats.earnedCount} of ${stats.totalCount} badges earned. Open badge cabinet`}
          onClick={() => setCabinetOpen(true)}
        />
      </div>

      {cabinetOpen && (
        <BadgeCabinet
          childName={childName}
          badges={stats.badges}
          earnedCount={stats.earnedCount}
          onClose={() => setCabinetOpen(false)}
        />
      )}
    </>
  )
}

function Tile({
  index,
  icon,
  iconClass,
  value,
  label,
  sub,
  ariaLabel,
  onClick,
}: {
  index: number
  icon: React.ReactNode
  iconClass: string
  value: string
  label: string
  sub: string
  ariaLabel: string
  onClick?: () => void
}) {
  const motionProps = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: 0.15 + index * 0.06 },
  }
  const baseClass = 'rounded-2xl bg-white p-3 sm:p-4 shadow-lg text-center flex flex-col items-center gap-1'
  const body = (
    <>
      <span className={iconClass}>{icon}</span>
      <span className="text-2xl sm:text-3xl font-black text-gray-900 tabular-nums leading-none">{value}</span>
      <span className="text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-wide">{label}</span>
      <span className="text-xs font-semibold text-gray-600 truncate max-w-full">{sub}</span>
    </>
  )

  if (onClick) {
    return (
      <motion.button
        {...motionProps}
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className={`${baseClass} active:scale-[0.97] transition-transform cursor-pointer hover:shadow-xl`}
      >
        {body}
      </motion.button>
    )
  }
  return (
    <motion.div {...motionProps} aria-label={ariaLabel} role="group" className={baseClass}>
      {body}
    </motion.div>
  )
}

function BadgeCabinet({
  childName,
  badges,
  earnedCount,
  onClose,
}: {
  childName: string
  badges: KidBadge[]
  earnedCount: number
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', duration: 0.5, bounce: 0.3 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="badge-cabinet-title"
        onClick={e => e.stopPropagation()}
        className="w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white p-5 sm:p-8 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h2 id="badge-cabinet-title" className="text-3xl font-black text-gray-900">
              {childName}&apos;s Badges
            </h2>
            <p className="text-gray-600 font-bold">
              {earnedCount} of {badges.length} earned
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 min-w-[44px] min-h-[44px] grid place-items-center"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <ul className="grid grid-cols-2 gap-3" aria-label="Badges">
          {badges.map((badge, i) => {
            const colors = RARITY_COLORS[badge.rarity]
            return (
              <motion.li
                key={badge.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                className={`rounded-2xl border-2 p-4 flex flex-col items-center text-center gap-2 ${
                  badge.earned ? `${colors.border} bg-gradient-to-br ${colors.gradient} text-white` : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div
                  className={`w-16 h-16 rounded-full grid place-items-center text-4xl ${
                    badge.earned ? 'bg-white/25' : 'bg-white grayscale opacity-60'
                  }`}
                  aria-hidden
                >
                  {badge.earned ? badge.icon : <Lock className="w-7 h-7 text-gray-400" />}
                </div>
                <div className={`font-black text-lg leading-tight ${badge.earned ? '' : 'text-gray-800'}`}>
                  {badge.name}
                </div>
                <div className={`text-xs font-semibold ${badge.earned ? 'text-white/90' : 'text-gray-500'}`}>
                  {badge.description}
                </div>
                {!badge.earned && (
                  <div className="w-full mt-1" aria-label={`${badge.currentCount} of ${badge.requiredCount}`}>
                    <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className="h-full rounded-full accent-fill"
                        style={{ width: `${Math.min(100, badge.progress)}%` }}
                      />
                    </div>
                    <div className="mt-1 text-[11px] font-bold text-gray-500 tabular-nums">
                      {badge.currentCount} / {badge.requiredCount}
                    </div>
                  </div>
                )}
                {badge.earned && (
                  <span className="text-[11px] font-black uppercase tracking-wider text-white/90">
                    {badge.rarity}
                  </span>
                )}
              </motion.li>
            )
          })}
        </ul>
      </motion.div>
    </div>
  )
}
