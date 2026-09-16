'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Circle, Copy, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import type { Child } from '@/lib/types'

const DISMISS_KEY = 'chorestar-getting-started-done'

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === 'true'
  } catch {
    return false
  }
}

function writeDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, 'true')
  } catch {
    /* private windows etc. — the card just reappears next visit */
  }
}

/**
 * Setup checklist for the family-overview view. The onboarding wizard tells a
 * new parent what to do and then disappears; this card tracks whether they
 * actually did it. It exists because the signup funnel showed most families
 * add a kid and then stall before creating chores or handing the app to the
 * kid. Hidden for shared members (they joined a family that already runs) and
 * gone for good once all three steps are done or the parent hides it.
 */
export function GettingStartedCard({
  kids,
  familyCode,
  isSharedMember,
  todayTotal,
  todayDone,
  onSelectChild,
  onOpenFamilySettings,
}: {
  kids: Child[]
  familyCode: string | null
  isSharedMember: boolean
  todayTotal: number
  todayDone: number
  onSelectChild: (childId: string) => void
  onOpenFamilySettings: () => void
}) {
  const [choreCount, setChoreCount] = useState<number | null>(null)
  const [hasCompletion, setHasCompletion] = useState<boolean | null>(null)
  const [dismissed, setDismissed] = useState<boolean>(() => readDismissed())

  const childIds = kids.map((c) => c.id).sort().join(',')

  const load = useCallback(async () => {
    const ids = childIds ? childIds.split(',') : []
    if (ids.length === 0) {
      setChoreCount(0)
      setHasCompletion(false)
      return
    }
    try {
      const supabase = createClient()
      const { count } = await supabase
        .from('chores')
        .select('id', { count: 'exact', head: true })
        .in('child_id', ids)
        .eq('is_active', true)
      setChoreCount(count ?? 0)

      const [{ data: choreDone }, { data: routineDone }] = await Promise.all([
        supabase
          .from('chore_completions')
          .select('id, chores!inner(child_id)')
          .in('chores.child_id', ids)
          .limit(1),
        supabase
          .from('routine_completions')
          .select('id')
          .in('child_id', ids)
          .limit(1),
      ])
      setHasCompletion((choreDone?.length ?? 0) > 0 || (routineDone?.length ?? 0) > 0)
    } catch {
      // Fail closed into "unknown": the card simply stays hidden rather than
      // showing wrong checkmarks.
      setChoreCount(null)
      setHasCompletion(null)
    }
  }, [childIds])

  useEffect(() => {
    load()
  }, [load])

  // Live: check a step off the moment a chore is created or completed
  // anywhere (this tab, the kid's tab, the iOS app).
  useEffect(() => {
    if (!childIds) return
    const supabase = createClient()
    const channel = supabase
      .channel('getting-started')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chores' }, () => load())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chore_completions' }, () => load())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'routine_completions' }, () => load())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [childIds, load])

  const loaded = choreCount !== null && hasCompletion !== null
  const hasKids = kids.length > 0
  // The live snapshot props catch changes between our queries and re-renders.
  const hasChores = (choreCount ?? 0) > 0 || todayTotal > 0
  const done = (hasCompletion ?? false) || todayDone > 0
  const allDone = loaded && hasKids && hasChores && done

  // Funnel complete: remember that so the card never flickers back.
  useEffect(() => {
    if (allDone) writeDismissed()
  }, [allDone])

  if (isSharedMember || dismissed || !loaded || allDone) return null

  const copyCode = async () => {
    if (!familyCode) return
    try {
      await navigator.clipboard.writeText(familyCode)
      toast.success('Family code copied')
    } catch {
      toast.error('Could not copy. The code is in Settings, Family tab.')
    }
  }

  const steps: { label: string; complete: boolean }[] = [
    { label: 'Add a kid', complete: hasKids },
    { label: 'Give them chores', complete: hasChores },
    { label: 'Let them check one off', complete: done },
  ]

  return (
    <Card className="border border-indigo-200 dark:border-indigo-800" style={{ background: 'var(--card-bg)' }}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            Three steps and the chart runs itself
          </h2>
          <button
            type="button"
            onClick={() => {
              writeDismissed()
              setDismissed(true)
            }}
            className="text-xs font-semibold text-gray-500 dark:text-gray-400 hover:underline shrink-0"
          >
            Hide
          </button>
        </div>

        <ol className="space-y-4">
          {steps.map((step, i) => (
            <li key={step.label} className="flex items-start gap-3">
              {step.complete ? (
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 shrink-0" aria-hidden="true" />
              ) : (
                <Circle className="w-6 h-6 text-gray-300 dark:text-gray-600 shrink-0" aria-hidden="true" />
              )}
              <div className="flex-1 min-w-0">
                <p
                  className={`font-semibold ${step.complete ? 'text-gray-400 dark:text-gray-500' : ''}`}
                  style={step.complete ? undefined : { color: 'var(--text-primary)' }}
                >
                  {step.label}
                  {step.complete && <span className="sr-only"> (done)</span>}
                </p>

                {/* Step 2 action: jump straight into the first kid's chore list */}
                {i === 1 && !step.complete && hasKids && (
                  <div className="mt-2">
                    <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                      Pick from suggestions or write your own. Two or three is plenty to start.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="gradient"
                      className="font-bold"
                      onClick={() => onSelectChild(kids[0].id)}
                    >
                      Add chores for {kids[0].name}
                    </Button>
                  </div>
                )}

                {/* Step 3 action: the kid-login handoff, family code included */}
                {i === 2 && !step.complete && hasChores && (
                  <div className="mt-2 space-y-2">
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      Kids sign in on any device with your family code and their PIN. No
                      email. Set a PIN from the pencil on a kid&apos;s avatar above.
                    </p>
                    {familyCode ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <code className="px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 font-mono font-bold tracking-widest text-indigo-700 dark:text-indigo-300 uppercase">
                          {familyCode}
                        </code>
                        <Button type="button" size="sm" variant="outline" className="gap-1.5 font-semibold" onClick={copyCode}>
                          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                          Copy
                        </Button>
                        <Link
                          href="/kid-login"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          Open kid login
                          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                        </Link>
                      </div>
                    ) : (
                      <Button type="button" size="sm" variant="outline" className="font-semibold" onClick={onOpenFamilySettings}>
                        Get your family code in Settings
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}
