'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'
import type { FeatureId } from '@/lib/engagement/discovery'

const DISMISS_KEY = 'chorestar-discover-dismissed'
const GETTING_STARTED_KEY = 'chorestar-getting-started-done'

function readDismissed(): FeatureId[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISS_KEY) ?? '[]')
  } catch {
    return []
  }
}

function writeDismissed(ids: FeatureId[]) {
  try {
    localStorage.setItem(DISMISS_KEY, JSON.stringify(ids))
  } catch {
    /* private windows etc. — the card just reappears next visit */
  }
}

function gettingStartedDone(): boolean {
  try {
    return localStorage.getItem(GETTING_STARTED_KEY) === 'true'
  } catch {
    return false
  }
}

/**
 * One feature this family has not tried yet, after the getting-started card
 * has retired. Families were paying for Premium features they never found
 * (October 2026: five new features, ten uses between them), so this surfaces
 * them one at a time instead of in a changelog nobody reopens. Which feature,
 * and in what order, comes from lib/engagement/discovery.ts via
 * /api/engagement/discover; "Not now" skips to the next one.
 */
export function DiscoverCard({
  isSharedMember,
  onAction,
}: {
  isSharedMember: boolean
  onAction: (id: FeatureId) => void
}) {
  const [feature, setFeature] = useState<{ id: FeatureId; title: string; body: string; cta: string } | null>(null)
  const [dismissed, setDismissed] = useState<FeatureId[]>([])

  useEffect(() => {
    if (isSharedMember || !gettingStartedDone()) return
    const skip = readDismissed()
    setDismissed(skip)
    let cancelled = false
    fetch(`/api/engagement/discover?skip=${encodeURIComponent(skip.join(','))}`)
      .then((r) => (r.ok ? r.json() : { feature: null }))
      .then((d) => {
        if (!cancelled) setFeature(d.feature ?? null)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [isSharedMember])

  if (!feature) return null

  const dismiss = () => {
    const next = [...dismissed, feature.id]
    writeDismissed(next)
    setDismissed(next)
    setFeature(null)
  }

  return (
    <Card className="border border-indigo-200 dark:border-indigo-800" style={{ background: 'var(--card-bg)' }}>
      <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Sparkles className="w-5 h-5 mt-0.5 shrink-0 text-indigo-500 dark:text-indigo-400" aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              {feature.title}
            </h2>
            <p className="text-sm mt-1 text-gray-600 dark:text-gray-300">{feature.body}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={dismiss}
            className="text-xs font-semibold text-gray-500 dark:text-gray-400 hover:underline"
          >
            Not now
          </button>
          <Button
            size="sm"
            onClick={() => {
              // Acting on it counts as seen; once used, the API stops offering it anyway.
              dismiss()
              onAction(feature.id)
            }}
          >
            {feature.cta}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
