'use client'

import { useCallback, useEffect, useState } from 'react'
import { Crown, Radio } from 'lucide-react'
import { liveProgressLine, type LiveRoutine } from '@/lib/routines/live-progress'
import { openPremiumBilling } from '@/components/settings/premium-gate'
import { useAndroidShell } from '@/lib/utils/platform'
import { playBillingAvailable } from '@/lib/utils/play-billing-client'

/**
 * "Happening now": routines a kid is in the middle of (migration 032).
 *
 * Premium: "Maya is on step 3 of 6 — Brush teeth" with a progress bar, so a
 * parent can check in from another room without hovering. Free: that a
 * routine is underway, plus a crowned "See which step" that opens Billing
 * (source gate_routine_live). Renders nothing when no one is mid-routine.
 *
 * Polls while the tab is visible; the player writes at most every few seconds.
 */
const POLL_MS = 10_000

export function RoutineLiveCard({ className }: { className?: string }) {
  const [items, setItems] = useState<LiveRoutine[]>([])
  const androidShell = useAndroidShell()

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/routines/live', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      setItems(Array.isArray(data.items) ? data.items : [])
    } catch {
      // Stay as we were; the next poll tries again.
    }
  }, [])

  useEffect(() => {
    void load()
    let id: ReturnType<typeof setInterval> | null = null
    const start = () => {
      if (id === null) id = setInterval(() => void load(), POLL_MS)
    }
    const stop = () => {
      if (id !== null) clearInterval(id)
      id = null
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void load()
        start()
      } else {
        stop()
      }
    }
    if (document.visibilityState === 'visible') start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [load])

  if (items.length === 0) return null

  // Android shell without Play Billing: state it, no purchase CTA (Play policy).
  const canSell = !androidShell || playBillingAvailable()

  return (
    <section
      aria-label="Routines happening now"
      className={`rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-900/20 p-4 sm:p-5 ${className ?? ''}`}
    >
      <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300 mb-3">
        <Radio className="w-4 h-4 motion-safe:animate-pulse" aria-hidden="true" />
        Happening now
      </h2>
      <ul className="space-y-3">
        {items.map(item => {
          const total = item.stepsTotal ?? 0
          const pct = !item.locked && total > 0 ? Math.round((((item.stepIndex ?? 0) + 0.5) / total) * 100) : 0
          return (
            <li key={item.routineId} className="flex flex-col gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <span
                  aria-hidden="true"
                  className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-white dark:ring-gray-900"
                  style={{ background: item.childColor || item.routineColor || '#6366f1' }}
                />
                <div className="min-w-0 flex-1">
                  {item.locked ? (
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {item.childName} is doing {item.routineName} right now
                    </p>
                  ) : (
                    <>
                      <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {liveProgressLine({
                          childName: item.childName,
                          stepIndex: item.stepIndex ?? 0,
                          stepsTotal: total,
                          stepTitle: item.stepTitle,
                        })}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{item.routineName}</p>
                    </>
                  )}
                </div>
                {item.locked && (
                  canSell ? (
                    <button
                      type="button"
                      onClick={() => openPremiumBilling('routine_live')}
                      className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-amber-300 dark:border-amber-700 px-3 py-1.5 text-xs font-semibold text-amber-800 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-900/30"
                    >
                      <Crown className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" aria-hidden="true" />
                      See which step
                    </button>
                  ) : (
                    <span className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400">Step detail is Premium</span>
                  )
                )}
              </div>
              {!item.locked && total > 0 && (
                <div
                  className="h-2 rounded-full bg-emerald-100 dark:bg-emerald-950 overflow-hidden"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={total}
                  aria-valuenow={(item.stepIndex ?? 0) + 1}
                  aria-label={`${item.childName}: step ${(item.stepIndex ?? 0) + 1} of ${total}`}
                >
                  <div className="h-full rounded-full bg-emerald-500 dark:bg-emerald-400 transition-[width] duration-500" style={{ width: `${pct}%` }} />
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
