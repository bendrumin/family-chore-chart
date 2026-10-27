'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PauseCircle } from 'lucide-react'

interface LimitsState {
  premium: boolean
  ending: { endsAt: string | null } | null
  limits: { kids: number; chores: number }
  pausedKids: { id: string; name: string }[]
  pausedChores: number
  kids: { id: string; name: string; paused: boolean; chores: { id: string; name: string; on: boolean }[] }[]
  wouldPause: { kids: string[]; chores: number }
}

/** "Leo and Mia" / "Leo, Mia and Sam" */
function listNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

function pausedSummary(kids: string[], chores: number): string {
  const parts: string[] = []
  if (kids.length) parts.push(listNames(kids))
  if (chores) parts.push(`${chores} chore${chores === 1 ? '' : 's'}`)
  return parts.join(' and ')
}

/**
 * Two moments around the free limits (lib/billing/plan-limits.ts):
 *
 * - Premium is ending (paid up, renewal off): say plainly what will pause and
 *   when, while there is still time to keep it.
 * - Premium ended: what is paused, that nothing is deleted, and a way to pick
 *   which kids and chores stay on.
 *
 * Renders nothing for everyone else, including every family that never
 * subscribed.
 */
export function PlanLimitsBanner({ isSharedMember, onKidsChanged }: { isSharedMember: boolean; onKidsChanged: () => void }) {
  const [state, setState] = useState<LimitsState | null>(null)
  const [choosing, setChoosing] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/plan-limits', { cache: 'no-store' })
      if (res.ok) setState(await res.json())
    } catch {
      // Decoration: no banner.
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (!state) return null

  const ending = state.premium && state.ending
  const paused = !state.premium && (state.pausedKids.length > 0 || state.pausedChores > 0)
  const wouldPause = pausedSummary(state.wouldPause.kids, state.wouldPause.chores)
  if (ending && !wouldPause) return null
  if (!ending && !paused) return null

  const openBilling = () =>
    window.dispatchEvent(new CustomEvent('chorestar:open-settings', { detail: { tab: 'billing', source: 'plan_limits' } }))

  return (
    <>
      <Card className="border border-amber-300 dark:border-amber-700" style={{ background: 'var(--card-bg)' }}>
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <PauseCircle className="w-5 h-5 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <div className="min-w-0">
              {ending ? (
                <>
                  <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                    {state.ending?.endsAt
                      ? `Premium ends ${new Date(state.ending.endsAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}`
                      : 'Premium is set to end'}
                  </h2>
                  <p className="text-sm mt-1 text-gray-600 dark:text-gray-300">
                    After that, {wouldPause} pause, since the free plan has {state.limits.kids} kids and{' '}
                    {state.limits.chores} chores. To keep them, turn renewal back on in your iPhone&apos;s Settings, under
                    your name, then Subscriptions.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                    {pausedSummary(state.pausedKids.map((k) => k.name), state.pausedChores)} paused
                  </h2>
                  <p className="text-sm mt-1 text-gray-600 dark:text-gray-300">
                    Premium ended, and the free plan has {state.limits.kids} kids and {state.limits.chores} chores. Nothing
                    is deleted: resume Premium and everything comes back, or choose what stays on.
                  </p>
                </>
              )}
            </div>
          </div>
          {!isSharedMember && (
            <div className="flex items-center gap-3 shrink-0">
              {ending ? (
                <a
                  href="https://apps.apple.com/account/subscriptions"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Manage subscription
                </a>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setChoosing(true)}
                    className="text-xs font-semibold text-gray-600 dark:text-gray-300 hover:underline"
                  >
                    Choose what stays on
                  </button>
                  <Button size="sm" onClick={openBilling}>
                    Resume Premium
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      {choosing && (
        <ChooseActiveDialog
          state={state}
          onClose={() => setChoosing(false)}
          onSaved={(next) => {
            setState({ ...state, ...next })
            setChoosing(false)
            onKidsChanged()
          }}
        />
      )}
    </>
  )
}

function ChooseActiveDialog({
  state,
  onClose,
  onSaved,
}: {
  state: LimitsState
  onClose: () => void
  onSaved: (next: Partial<LimitsState>) => void
}) {
  const [kids, setKids] = useState<Set<string>>(() => new Set(state.kids.filter((k) => !k.paused).map((k) => k.id)))
  const [chores, setChores] = useState<Set<string>>(
    () => new Set(state.kids.flatMap((k) => k.chores.filter((c) => c.on).map((c) => c.id)))
  )
  const [saving, setSaving] = useState(false)

  const shownKids = state.kids.filter((k) => kids.has(k.id))
  const activeChores = shownKids.flatMap((k) => k.chores).filter((c) => chores.has(c.id)).length

  const toggleKid = (id: string) => {
    const next = new Set(kids)
    if (next.has(id)) next.delete(id)
    else if (next.size < state.limits.kids) next.add(id)
    setKids(next)
  }
  // The chore cap counts only kids that stay on; the checkboxes enforce it.
  const toggleChore = (id: string) => {
    const next = new Set(chores)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setChores(next)
  }

  const save = async () => {
    setSaving(true)
    try {
      const keepChores = shownKids.flatMap((k) => k.chores).filter((c) => chores.has(c.id)).map((c) => c.id)
      const res = await fetch('/api/plan-limits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kids: [...kids], chores: keepChores }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Could not save')
      toast.success('Saved. Paused kids and chores come back with Premium.')
      onSaved(json)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent onClose={onClose} className="overflow-y-auto dialog-content-bg max-w-xl">
        <DialogHeader>
          <DialogTitle>Choose what stays on</DialogTitle>
          <DialogDescription>
            The free plan has {state.limits.kids} kids and {state.limits.chores} chores. Everything else is paused, not
            deleted.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section>
            <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Kids ({kids.size}/{state.limits.kids})
            </h3>
            <div className="space-y-2">
              {state.kids.map((k) => (
                <label key={k.id} className="flex items-center gap-3 text-sm text-gray-800 dark:text-gray-100">
                  <Checkbox
                    checked={kids.has(k.id)}
                    disabled={!kids.has(k.id) && kids.size >= state.limits.kids}
                    onCheckedChange={() => toggleKid(k.id)}
                  />
                  {k.name}
                </label>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Chores ({activeChores}/{state.limits.chores})
            </h3>
            {shownKids.map((k) => (
              <div key={k.id} className="mb-3">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{k.name}</div>
                <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1">
                  {k.chores.map((c) => (
                    <label key={c.id} className="flex items-center gap-3 text-sm text-gray-800 dark:text-gray-100">
                      <Checkbox
                        checked={chores.has(c.id)}
                        disabled={!chores.has(c.id) && activeChores >= state.limits.chores}
                        onCheckedChange={() => toggleChore(c.id)}
                      />
                      <span className="truncate">{c.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
