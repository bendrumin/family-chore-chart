'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Gift } from 'lucide-react'
import type { FeatureId } from '@/lib/engagement/discovery'

export interface TrialState {
  rail: 'apple' | 'stripe'
  endsAt: string
  renewing: boolean
  day: number
  choresDone: number
  routinesDone: number
  used: string[]
  next: { id: FeatureId; title: string; body: string; cta: string } | null
}

/**
 * The free week at a glance (lib/engagement/trial.ts, /api/engagement/trial):
 * which day it is, what the family has done, the Premium they have used, and
 * one Premium feature to try next. Renders nothing outside a trial.
 * `onTrial` tells the dashboard to hold back the discover card, which would
 * otherwise offer the same feature twice.
 */
export function TrialCard({ onAction, onTrial }: { onAction: (id: FeatureId) => void; onTrial: (inTrial: boolean) => void }) {
  const [trial, setTrial] = useState<TrialState | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/engagement/trial', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { trial: null }))
      .then((d) => {
        if (cancelled) return
        setTrial(d.trial ?? null)
        onTrial(!!d.trial)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // Once per dashboard visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!trial) return null

  const ends = new Date(trial.endsAt).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
  const done = [
    trial.choresDone ? `${trial.choresDone} chore${trial.choresDone === 1 ? '' : 's'} done` : null,
    trial.routinesDone ? `${trial.routinesDone} routine${trial.routinesDone === 1 ? '' : 's'} finished` : null,
  ].filter(Boolean)

  return (
    <Card className="border border-indigo-200 dark:border-indigo-800" style={{ background: 'var(--card-bg)' }}>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <Gift className="w-5 h-5 mt-0.5 shrink-0 text-indigo-500 dark:text-indigo-400" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              Day {trial.day} of your free week
            </h2>
            <p className="text-sm mt-1 text-gray-600 dark:text-gray-300">
              {done.length ? `So far: ${done.join(', ')}. ` : 'Nothing checked off yet. Kids with their own PIN can start right away. '}
              {trial.renewing ? `Premium continues after ${ends}.` : `Renewal is off, so Premium ends ${ends}.`}
            </p>
            {trial.used.length > 0 && (
              <p className="text-sm mt-1 text-gray-600 dark:text-gray-300">Premium you are using: {trial.used.join(', ')}.</p>
            )}
          </div>
        </div>

        <div className="flex gap-1" role="img" aria-label={`Day ${trial.day} of 7`}>
          {Array.from({ length: 7 }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${i < trial.day ? 'bg-indigo-500 dark:bg-indigo-400' : 'bg-gray-200 dark:bg-gray-700'}`}
            />
          ))}
        </div>

        {trial.next && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl p-3 bg-indigo-50 dark:bg-indigo-950/40">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Try next: {trial.next.title}</div>
              <div className="text-xs mt-0.5 text-gray-600 dark:text-gray-300">{trial.next.body}</div>
            </div>
            <Button size="sm" className="shrink-0" onClick={() => onAction(trial.next!.id)}>
              {trial.next.cta}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
