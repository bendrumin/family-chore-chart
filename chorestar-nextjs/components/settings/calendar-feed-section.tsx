'use client'

import { useCallback, useEffect, useState } from 'react'
import { CalendarDays, Copy, Crown, ExternalLink, PowerOff, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PremiumGate } from '@/components/settings/premium-gate'

/**
 * Settings > Family: the family calendar feed (Premium, migration 033).
 * A secret iCalendar URL per scope (whole family, or one kid) that Apple
 * Calendar, Google Calendar, Outlook and wall calendars subscribe to. Owners
 * and co-parents manage it through /api/calendar/feeds.
 */

interface Feed {
  childId: string | null
  https: string
  webcal: string
  google: string
  createdAt: string
  lastFetchedAt: string | null
}

interface FeedState {
  premium: boolean
  children: { id: string; name: string }[]
  feeds: Feed[]
}

const FAMILY = 'family'

function browserTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null
  } catch {
    return null
  }
}

async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`${what} copied`)
  } catch {
    toast.error('Could not copy. Select the link and copy it by hand.')
  }
}

export function CalendarFeedSection() {
  const [state, setState] = useState<FeedState | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  const [scope, setScope] = useState<string>(FAMILY)
  const [busy, setBusy] = useState(false)
  const [confirmRegenerate, setConfirmRegenerate] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/calendar/feeds', { cache: 'no-store' })
      if (!res.ok) throw new Error(String(res.status))
      setState(await res.json())
      setUnavailable(false)
    } catch {
      setUnavailable(true)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const childId = scope === FAMILY ? null : scope
  const feed = state?.feeds.find(f => f.childId === childId) ?? null
  const scopeName = childId ? state?.children.find(c => c.id === childId)?.name ?? 'this kid' : 'the whole family'

  const turnOn = async (regenerate: boolean) => {
    setBusy(true)
    try {
      const res = await fetch('/api/calendar/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId, timeZone: browserTimeZone() }),
      })
      const body = await res.json().catch(() => ({}))
      if (res.status === 403 && body?.error === 'premium_required') {
        window.dispatchEvent(new CustomEvent('chorestar:open-settings', { detail: { tab: 'billing', source: 'gate_calendar' } }))
        return
      }
      if (!res.ok) throw new Error(body?.error || 'failed')
      toast.success(regenerate ? 'New link ready. The old one no longer works.' : 'Calendar feed is on')
      setConfirmRegenerate(false)
      await load()
    } catch {
      toast.error('Could not set up the calendar feed')
    } finally {
      setBusy(false)
    }
  }

  const turnOff = async (forChildId: string | null) => {
    setBusy(true)
    try {
      const res = await fetch(`/api/calendar/feeds?childId=${forChildId ?? FAMILY}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('failed')
      toast.success('Calendar feed turned off')
      setConfirmRegenerate(false)
      await load()
    } catch {
      toast.error('Could not turn off the calendar feed')
    } finally {
      setBusy(false)
    }
  }

  const scopeLabel = (id: string | null) =>
    id ? `${state?.children.find(c => c.id === id)?.name ?? 'A kid'}'s feed` : 'Whole-family feed'

  return (
    <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
      <div className="flex items-center gap-2 mb-2">
        <CalendarDays className="w-5 h-5" style={{ color: 'var(--primary)' }} />
        <h5 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
          Calendar feed
        </h5>
        {state && !state.premium && (
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
            <Crown className="w-3 h-3" aria-hidden /> Premium
          </span>
        )}
      </div>
      <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
        See chores and routines in Apple Calendar, Google Calendar, Outlook, or a family wall calendar like Skylight. It
        follows your changes here by itself; calendar apps check for updates every few hours.
      </p>

      {unavailable ? (
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          The calendar feed isn&apos;t available right now. Try again in a moment.
        </p>
      ) : !state ? (
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</p>
      ) : !state.premium ? (
        <div className="space-y-3">
          {state.feeds.length > 0 && (
            <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Your subscribed calendars show a &ldquo;needs Premium&rdquo; note until Premium is back on. They pick up
                your chores again by themselves.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {state.feeds.map(f => (
                  <Button key={f.childId ?? FAMILY} type="button" variant="outline" size="sm" disabled={busy} onClick={() => turnOff(f.childId)}>
                    <PowerOff className="w-4 h-4" /> Turn off {scopeLabel(f.childId).toLowerCase()}
                  </Button>
                ))}
              </div>
            </div>
          )}
          <PremiumGate feature="calendar" compact />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="calendar-feed-scope" className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              Whose chores
            </Label>
            <select
              id="calendar-feed-scope"
              value={scope}
              onChange={e => {
                setScope(e.target.value)
                setConfirmRegenerate(false)
              }}
              className="w-full h-12 px-4 text-sm font-semibold border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-gray-100 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-700"
            >
              <option value={FAMILY}>Whole family{state.feeds.some(f => f.childId === null) ? ' (on)' : ''}</option>
              {state.children.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {state.feeds.some(f => f.childId === c.id) ? ' (on)' : ''}
                </option>
              ))}
            </select>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              A kid&apos;s own feed is handy for their tablet or a shared wall calendar.
            </p>
          </div>

          {!feed ? (
            <Button type="button" variant="gradient" className="w-full sm:w-auto font-bold" disabled={busy} onClick={() => turnOn(false)}>
              <CalendarDays className="w-4 h-4" />
              {busy ? 'Turning on…' : `Turn on a feed for ${scopeName}`}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="calendar-feed-url" className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  Subscribe link
                </Label>
                <div className="flex gap-2">
                  <Input id="calendar-feed-url" readOnly value={feed.webcal} onFocus={e => e.currentTarget.select()} className="flex-1 font-mono text-xs bg-white dark:bg-gray-800" />
                  <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => copy(feed.webcal, 'Subscribe link')}>
                    <Copy className="w-4 h-4" /> Copy
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <a
                  href={feed.webcal}
                  className="inline-flex items-center gap-2 h-11 px-4 rounded-lg text-xs font-semibold border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                >
                  <CalendarDays className="w-4 h-4" /> Apple Calendar / Outlook
                </a>
                <a
                  href={feed.google}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 h-11 px-4 rounded-lg text-xs font-semibold border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                >
                  <ExternalLink className="w-4 h-4" /> Add to Google Calendar
                </a>
                <Button type="button" variant="outline" size="sm" onClick={() => copy(feed.https, 'https link')}>
                  <Copy className="w-4 h-4" /> Copy https link
                </Button>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Outlook on the web and wall calendars like Skylight ask for a URL: paste the https link.{' '}
                {feed.lastFetchedAt
                  ? `A calendar app last checked ${new Date(feed.lastFetchedAt).toLocaleString()}.`
                  : 'No calendar app has picked it up yet.'}
              </p>

              <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40">
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Anyone with this link can see these chores and routines. If it ends up somewhere it shouldn&apos;t, make a
                  new one: the old link stops working right away, and calendars subscribed to it need the new one.
                </p>
                {confirmRegenerate ? (
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Button type="button" variant="destructive" size="sm" disabled={busy} onClick={() => turnOn(true)}>
                      <RefreshCw className="w-4 h-4" /> {busy ? 'Making a new link…' : 'Yes, replace the link'}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => setConfirmRegenerate(false)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setConfirmRegenerate(true)}>
                      <RefreshCw className="w-4 h-4" /> New link
                    </Button>
                    <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => turnOff(childId)}>
                      <PowerOff className="w-4 h-4" /> Turn off
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
