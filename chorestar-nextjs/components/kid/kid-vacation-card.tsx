'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { getWeekStart, parseLocalDate } from '@/lib/utils/date-helpers'
import { useKidT } from '@/lib/i18n/kid'

/**
 * The kid dashboard while the family is on vacation (migration 019): a
 * celebratory card in place of the chore list and routines. The one thing a
 * kid worries about when told "no chores" is their streak, so the card leads
 * with the fact that it is safe — the streak comes from the same
 * /api/kid/stats source the stats strip uses, which already skips vacation
 * days server-side.
 *
 * Kid mode is light-only by design (white cards on the gradient), so there
 * are no dark: variants here.
 */

interface KidVacationCardProps {
  kidToken: string
  /** The window's last day, YYYY-MM-DD. Chores resume the day after. */
  endsOn: string
}

export function KidVacationCard({ kidToken, endsOn }: KidVacationCardProps) {
  const t = useKidT()
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const weekStart = getWeekStart()
        const dayOfWeek = new Date().getDay()
        const res = await fetch(`/api/kid/stats?weekStart=${weekStart}&dayOfWeek=${dayOfWeek}`, {
          headers: { Authorization: `Bearer ${kidToken}` },
          cache: 'no-store',
        })
        if (!res.ok) return
        const data = await res.json()
        if (active && typeof data.streak === 'number') setStreak(data.streak)
      } catch {
        // The streak sentence is a bonus; the card stands without it.
      }
    })()
    return () => { active = false }
  }, [kidToken])

  // Chores come back the day AFTER the window ends, in the kid's local
  // calendar and language.
  const backDay = parseLocalDate(endsOn)
  backDay.setDate(backDay.getDate() + 1)
  const day = backDay.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', duration: 0.6, bounce: 0.4 }}
      className="max-w-2xl mx-auto mb-10 bg-white rounded-3xl p-8 shadow-2xl text-center"
    >
      <motion.div
        initial={{ y: 8 }}
        animate={{ y: -8 }}
        transition={{ duration: 1.6, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
        className="text-7xl mb-4"
        aria-hidden
      >
        🏖️
      </motion.div>
      <h2 className="text-4xl font-black text-gray-900 mb-3">{t('vacation.title')}</h2>
      <p className="text-xl font-bold text-gray-600">
        {t('vacation.noChores', { day })}
        {streak > 0 && (
          <>
            {' '}
            {t('vacation.streakSafe', { count: streak })}
          </>
        )}
      </p>
    </motion.div>
  )
}
