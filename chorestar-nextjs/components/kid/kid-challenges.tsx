'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Gift, Check } from 'lucide-react'
import { formatMoney } from '@/lib/constants/currencies'
import { playSound } from '@/lib/utils/sound'
import { useKidT, type KidKey } from '@/lib/i18n/kid'
import type { ChallengePhase } from '@/lib/challenges/progress'

/**
 * Family challenges in kid mode (Premium, migration 031): the team goal the
 * kid shares with their siblings. One white card per challenge on the themed
 * gradient, like the goal card: the team bar, everyone's part (in the family's
 * order, never ranked; a kid at zero is "Ready to help"), and a confetti
 * celebration the first time the team hits the target on this device.
 *
 * Reads GET /api/kid/challenges with the kid token. Renders nothing when the
 * kid has no challenge, so free families never see it.
 */

interface Teammate {
  childId: string
  name: string
  avatarColor: string | null
  avatarEmoji: string | null
  count: number
  done: boolean
  toGo: number
  isMe: boolean
}

interface KidChallenge {
  id: string
  title: string
  emoji: string | null
  rewardText: string
  rewardCents: number
  metric: 'chores' | 'routines'
  mode: 'team' | 'each'
  target: number
  routineType: 'morning' | 'bedtime' | 'afterschool' | 'custom' | null
  choreFilter: 'any' | 'bonus'
  phase: ChallengePhase
  daysLeft: number
  current: number
  goal: number
  percent: number
  met: boolean
  remaining: number
  teammates: Teammate[]
}

const CELEBRATED_KEY = (challengeId: string, childId: string) => `chorestar-kid-challenge-celebrated:${challengeId}:${childId}`

function goalKey(c: KidChallenge): KidKey {
  const each = c.mode === 'each'
  if (c.metric === 'routines') return each ? 'challenge.routinesEach' : 'challenge.routinesTeam'
  if (c.choreFilter === 'bonus') return each ? 'challenge.bonusEach' : 'challenge.bonusTeam'
  return each ? 'challenge.choresEach' : 'challenge.choresTeam'
}

export function KidChallenges({ kidToken, refreshKey = 0 }: { kidToken: string; refreshKey?: number }) {
  const t = useKidT()
  const [data, setData] = useState<{ childId: string; currencyCode: string; challenges: KidChallenge[] } | null>(null)

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const res = await fetch('/api/kid/challenges', {
          headers: { Authorization: `Bearer ${kidToken}` },
          cache: 'no-store',
        })
        if (!res.ok) return
        const json = await res.json()
        if (active) setData(json)
      } catch {
        // Decoration: no card.
      }
    })()
    return () => { active = false }
  }, [kidToken, refreshKey])

  // Confetti the first time a team goal is hit, once per kid per device.
  const wonKey = (data?.challenges ?? []).filter(c => c.phase === 'won').map(c => c.id).join(',')
  useEffect(() => {
    if (!wonKey || !data) return
    let fresh = false
    for (const id of wonKey.split(',')) {
      try {
        const key = CELEBRATED_KEY(id, data.childId)
        if (localStorage.getItem(key)) continue
        localStorage.setItem(key, '1')
      } catch {
        // Celebrate anyway.
      }
      fresh = true
    }
    if (!fresh) return
    playSound('celebration')
    import('@/lib/utils/celebrations')
      .then(({ getCelebrationManager }) => getCelebrationManager().celebrateWithConfetti('epic'))
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wonKey])

  if (!data || data.challenges.length === 0) return null
  const money = (c: number) => formatMoney(c, data.currencyCode)

  return (
    <div className="max-w-2xl mx-auto mb-6 space-y-4">
      {data.challenges.map((c, i) => {
        const won = c.phase === 'won' || c.phase === 'delivered'
        const headerLine =
          c.phase === 'won'
            ? t('challenge.youDidIt')
            : c.phase === 'delivered'
              ? t('challenge.delivered')
              : c.phase === 'upcoming'
                ? t('challenge.startsSoon')
                : c.daysLeft <= 1 ? t('challenge.lastDay') : t('challenge.daysLeft', { count: c.daysLeft })
        return (
          <motion.section
            key={c.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            aria-labelledby={`kid-challenge-${c.id}`}
            className={`rounded-3xl bg-white p-5 shadow-lg ${c.phase === 'won' ? 'ring-4 ring-yellow-300' : ''}`}
          >
            <div className="flex items-start gap-3">
              <motion.span
                className="text-4xl leading-none"
                aria-hidden
                animate={c.phase === 'won' ? { rotate: [0, -12, 12, -6, 0], scale: [1, 1.15, 1] } : undefined}
                transition={{ duration: 1.2, repeat: c.phase === 'won' ? Infinity : 0, repeatDelay: 2 }}
              >
                {c.emoji ?? '🏆'}
              </motion.span>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" aria-hidden />
                  {t('challenge.team')}
                </div>
                <h2 id={`kid-challenge-${c.id}`} className="text-2xl font-black text-gray-900 leading-tight">
                  {c.title}
                </h2>
                <p className="mt-1 text-sm font-bold text-gray-600 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>{t(goalKey(c), { count: c.target })}</span>
                  {c.metric === 'routines' && c.routineType && (
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
                      {t(`challenge.type.${c.routineType}` as KidKey)}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-2xl bg-pink-50 px-3 py-2 text-pink-700 font-bold">
              <Gift className="w-5 h-5 shrink-0" aria-hidden />
              <span className="min-w-0">
                {t('challenge.win', { reward: c.rewardText })}
                {c.rewardCents > 0 && <span className="ms-1 text-pink-600">{t('challenge.plusMoney', { money: money(c.rewardCents) })}</span>}
              </span>
            </div>

            <div
              className="mt-4"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={c.percent}
              aria-label={`${t('challenge.teamAria')}: ${t('common.xOfY', { x: c.current, y: c.goal })}`}
            >
              <div className="h-6 rounded-full bg-gray-100 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${won ? 'bg-gradient-to-r from-yellow-400 to-amber-500' : 'accent-fill'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(c.percent > 0 ? 4 : 0, c.percent)}%` }}
                  transition={{ type: 'spring', duration: 0.9, bounce: 0.2 }}
                />
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-3">
                <span className="text-xl font-black text-gray-900 tabular-nums">
                  {t('common.xOfY', { x: c.current, y: c.goal })}
                </span>
                <span className="text-sm font-bold text-gray-600">
                  {won || c.remaining <= 0 ? headerLine : `${t('challenge.toGo', { count: c.remaining })} · ${headerLine}`}
                </span>
              </div>
            </div>

            <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {c.teammates.map(m => {
                const status =
                  c.mode === 'each'
                    ? m.done ? t('challenge.done') : t('challenge.kidToGo', { count: m.toGo })
                    : m.count === 0 ? t('challenge.readyToHelp') : t('challenge.helped', { count: m.count })
                return (
                  <li
                    key={m.childId}
                    className={`flex items-center gap-3 rounded-2xl px-3 py-2 ${m.isMe ? 'bg-yellow-50 ring-2 ring-yellow-300' : 'bg-gray-50'}`}
                  >
                    <span
                      className="w-10 h-10 shrink-0 rounded-full grid place-items-center text-xl font-black text-white"
                      style={{ backgroundColor: m.avatarColor || '#6366f1' }}
                      aria-hidden
                    >
                      {m.avatarEmoji || m.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-black text-gray-900 truncate">
                        {m.isMe ? t('challenge.you') : m.name}
                      </div>
                      <div className="text-sm font-bold text-gray-600">{status}</div>
                    </div>
                    {((c.mode === 'each' && m.done) || (c.mode === 'team' && m.count > 0)) && (
                      <Check className="w-5 h-5 text-green-500 shrink-0" aria-hidden />
                    )}
                  </li>
                )
              })}
            </ul>

            {c.phase === 'won' && (
              <p className="mt-4 text-center text-lg font-black text-amber-600">{t('challenge.askReward')}</p>
            )}
          </motion.section>
        )
      })}
    </div>
  )
}
