'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { ChoreIcon } from '@/components/ui/chore-icon'
import { getWeekStart } from '@/lib/utils/date-helpers'
import { playSound } from '@/lib/utils/sound'

/**
 * Today's chores, on the kid dashboard.
 *
 * Kid mode could see and run ROUTINES but never CHORES — there was no
 * kid-token endpoint for them at all, so a kid logging in on their own device
 * had no way to check off the things that actually earn their allowance. This
 * is the missing half.
 *
 * All requests carry the kid session token; weekStart and dayOfWeek are
 * computed HERE because week_start is the family's local Sunday and the server
 * (UTC) computes the wrong one near midnight.
 */

interface KidChore {
  id: string
  name: string
  icon: string | null
  reward_cents: number | null
}

interface KidChoresProps {
  kidToken: string
  /** Child avatar color — tints icons like the parent app. */
  iconTint?: string | null
}

export function KidChores({ kidToken, iconTint }: KidChoresProps) {
  const [chores, setChores] = useState<KidChore[] | null>(null)
  const [doneToday, setDoneToday] = useState<Set<string>>(new Set())
  const [pending, setPending] = useState<Set<string>>(new Set())

  const weekStart = getWeekStart()
  const dayOfWeek = new Date().getDay()

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const res = await fetch(`/api/kid/chores?weekStart=${weekStart}`, {
          headers: { Authorization: `Bearer ${kidToken}` },
          cache: 'no-store',
        })
        if (!res.ok) return
        const data = await res.json()
        if (!active) return
        setChores(data.chores ?? [])
        setDoneToday(new Set(
          (data.completions ?? [])
            .filter((c: { day_of_week: number | null }) => c.day_of_week === dayOfWeek)
            .map((c: { chore_id: string }) => c.chore_id)
        ))
      } catch {
        // Leave as loading-failed; routines below still work.
      }
    })()
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kidToken])

  const toggle = async (chore: KidChore) => {
    if (pending.has(chore.id)) return
    const wasDone = doneToday.has(chore.id)

    // Optimistic flip; revert on failure.
    setDoneToday(prev => {
      const next = new Set(prev)
      if (wasDone) next.delete(chore.id); else next.add(chore.id)
      return next
    })
    setPending(prev => new Set(prev).add(chore.id))

    if (!wasDone) {
      playSound('success')
      import('@/lib/utils/celebrations')
        .then(({ getCelebrationManager }) => getCelebrationManager().celebrateChoreCompletion('', chore.name))
        .catch(() => {})
    } else {
      playSound('notification')
    }

    try {
      const res = await fetch('/api/kid/chores/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${kidToken}` },
        body: JSON.stringify({
          choreId: chore.id,
          dayOfWeek,
          weekStart,
          // Desired state, not a toggle command — a retried request is idempotent.
          completed: !wasDone,
        }),
      })
      if (!res.ok) throw new Error(String(res.status))
    } catch {
      setDoneToday(prev => {
        const next = new Set(prev)
        if (wasDone) next.add(chore.id); else next.delete(chore.id)
        return next
      })
      playSound('error')
    } finally {
      setPending(prev => {
        const next = new Set(prev)
        next.delete(chore.id)
        return next
      })
    }
  }

  // Nothing assigned: say nothing. The routines empty-state already covers the
  // "ask a grownup" case, and two stacked empty states read as a broken page.
  if (!chores || chores.length === 0) return null

  const doneCount = chores.filter(c => doneToday.has(c.id)).length

  return (
    <div className="max-w-2xl mx-auto mb-10">
      <div className="flex items-baseline justify-between mb-4 px-1">
        <h2 className="text-2xl font-black text-white drop-shadow-sm">Today&apos;s Chores</h2>
        <span className="text-white/90 font-bold tabular-nums">
          {doneCount} / {chores.length} done
        </span>
      </div>

      <div className="space-y-3">
        {chores.map((chore, i) => {
          const done = doneToday.has(chore.id)
          return (
            <motion.button
              key={chore.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => toggle(chore)}
              aria-pressed={done}
              className={`w-full flex items-center gap-4 rounded-2xl p-4 text-left shadow-lg transition-all active:scale-[0.98] ${
                done ? 'bg-white/70' : 'bg-white'
              }`}
            >
              {chore.icon && (
                <ChoreIcon
                  emoji={chore.icon}
                  className="w-10 h-10 shrink-0"
                  tint={iconTint || undefined}
                />
              )}
              <span
                className={`flex-1 text-xl font-bold ${
                  done ? 'text-gray-400 line-through' : 'text-gray-900'
                }`}
              >
                {chore.name}
              </span>
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-4 transition-colors ${
                  done ? 'accent-fill border-transparent' : 'border-gray-300 bg-white'
                }`}
                aria-hidden
              >
                {done && <Check className="h-6 w-6 stroke-[3]" />}
              </span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
