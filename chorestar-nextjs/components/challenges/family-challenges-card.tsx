'use client'

/* eslint-disable @typescript-eslint/no-explicit-any -- family_challenges (031) is newer than the generated types */
import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import { Trophy, Plus, Gift, Check, X, Lock, PartyPopper } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { PremiumGate } from '@/components/settings/premium-gate'
import { isPremium } from '@/lib/utils/subscription'
import { formatMoney } from '@/lib/constants/currencies'
import { playSound } from '@/lib/utils/sound'
import { CHALLENGE_TEMPLATES, type ChallengeTemplate } from '@/lib/challenges/templates'
import { CHALLENGE_COLUMNS, loadChallengeInputs, sortChallenges, withProgress, type ChallengeWithProgress } from '@/lib/challenges/data'
import { contributionLabel, describeTarget, type ChallengeRow } from '@/lib/challenges/progress'
import type { Child } from '@/lib/types'

const ChallengeBuilderModal = dynamic(
  () => import('@/components/challenges/challenge-builder-modal').then(m => ({ default: m.ChallengeBuilderModal })),
  { ssr: false }
)

/**
 * Family challenges on the parent dashboard (Premium, migration 031).
 *
 * Premium families: running and won challenges with the team bar and each
 * kid's part, "Reward delivered" once the target is hit (that route credits
 * any money), and a New challenge button with one-tap templates.
 * Free families: a locked preview of what a challenge looks like and a See
 * Premium button (paywall source gate_challenges).
 *
 * Reads go through the RLS client (owner and co-parents); progress is derived
 * on the client from the same completions with lib/challenges, and refreshes
 * live when a kid ticks something.
 */

const RECENT_MS = 7 * 86_400_000
const CELEBRATED_KEY = (id: string) => `chorestar-challenge-won-celebrated:${id}`

function openPaywall() {
  window.dispatchEvent(new CustomEvent('chorestar:open-settings', { detail: { tab: 'billing', source: 'gate_challenges' } }))
}

export function FamilyChallengesCard({
  familyId,
  kids,
  timeZone,
  currencyCode,
  className,
}: {
  familyId: string
  kids: Child[]
  timeZone?: string | null
  currencyCode?: string | null
  className?: string
}) {
  const [premium, setPremium] = useState<boolean | null>(null)
  const [available, setAvailable] = useState(true)
  const [list, setList] = useState<ChallengeWithProgress[]>([])
  const [builderOpen, setBuilderOpen] = useState(false)
  const [template, setTemplate] = useState<ChallengeTemplate | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const loadRef = useRef<() => Promise<void>>(async () => {})

  const load = useCallback(async () => {
    if (!familyId) return
    const supabase = createClient()
    try {
      const [{ data: profile }, res] = await Promise.all([
        supabase.from('profiles').select('subscription_type').eq('id', familyId).maybeSingle(),
        (supabase as any)
          .from('family_challenges')
          .select(CHALLENGE_COLUMNS)
          .eq('user_id', familyId)
          .in('status', ['active', 'delivered'])
          .order('created_at', { ascending: false })
          .limit(30),
      ])
      setPremium(isPremium(profile?.subscription_type))
      if (res.error) {
        // Migration 031 not applied yet: free families still see the preview.
        setAvailable(false)
        setList([])
        return
      }
      setAvailable(true)
      const now = Date.now()
      const rows = ((res.data ?? []) as ChallengeRow[]).filter(
        r => r.status === 'active' || (r.delivered_at && now - Date.parse(r.delivered_at) < RECENT_MS)
      )
      const inputs = await loadChallengeInputs(supabase, rows, timeZone)
      setList(
        sortChallenges(withProgress(rows, inputs)).filter(
          c => c.phase !== 'missed' || now - Date.parse(`${c.challenge.ends_on}T00:00:00Z`) < RECENT_MS
        )
      )
    } catch {
      setAvailable(false)
    }
  }, [familyId, timeZone])
  loadRef.current = load

  useEffect(() => { void load() }, [load])

  // Live: a tick or a finished routine moves the bar.
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('family-challenges')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chore_completions' }, () => { void loadRef.current() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'routine_completions' }, () => { void loadRef.current() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  // The first time a challenge is won, a celebration (once per device).
  const wonKey = list.filter(c => c.phase === 'won').map(c => c.challenge.id).join(',')
  useEffect(() => {
    if (!wonKey) return
    let fresh = false
    for (const id of wonKey.split(',')) {
      try {
        if (localStorage.getItem(CELEBRATED_KEY(id))) continue
        localStorage.setItem(CELEBRATED_KEY(id), '1')
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
  }, [wonKey])

  const kidName = (id: string) => kids.find(k => k.id === id)?.name ?? 'A kid'
  const kidColor = (id: string) => kids.find(k => k.id === id)?.avatar_color ?? null

  const deliver = async (item: ChallengeWithProgress) => {
    const { challenge } = item
    if (busy) return
    setBusy(challenge.id)
    try {
      const res = await fetch(`/api/challenges/${challenge.id}/deliver`, { method: 'POST' })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        toast.error(data?.message || 'Could not mark the reward delivered')
        return
      }
      playSound('success')
      const credited = (data?.credited ?? []) as Array<{ child_id: string; amount_cents: number }>
      toast.success(
        credited.length > 0
          ? `Enjoy ${challenge.reward_text}! ${formatMoney(credited[0].amount_cents, currencyCode)} added to each kid's balance.`
          : `Enjoy ${challenge.reward_text}!`
      )
      void load()
    } catch {
      toast.error('Could not mark the reward delivered')
    } finally {
      setBusy(null)
    }
  }

  const cancel = async (item: ChallengeWithProgress) => {
    const { challenge } = item
    const label = item.phase === 'missed' ? 'Clear' : 'End'
    if (item.phase !== 'missed' && !window.confirm(`End "${challenge.title}" early? The kids will stop seeing it.`)) return
    setBusy(challenge.id)
    try {
      const supabase = createClient() as any
      const { error } = await supabase.from('family_challenges').update({ status: 'cancelled' }).eq('id', challenge.id)
      if (error) throw error
      toast(`${label}ed ${challenge.title}`)
      void load()
    } catch {
      toast.error('Could not update the challenge')
    } finally {
      setBusy(null)
    }
  }

  const openBuilder = (tpl: ChallengeTemplate | null) => {
    if (!premium) {
      openPaywall()
      return
    }
    setTemplate(tpl)
    setBuilderOpen(true)
  }

  if (premium === null) return null
  // Premium but the table isn't there yet: nothing to show or create.
  if (premium && !available) return null
  // A one-kid family has no team yet; don't advertise what they can't use.
  if (kids.length < 2 && list.length === 0) return null

  return (
    <section
      aria-labelledby="family-challenges-title"
      className={`rounded-2xl border p-4 sm:p-5 space-y-4 ${className ?? ''}`}
      style={{ background: 'var(--card-bg)', borderColor: 'hsl(var(--border))' }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-9 h-9 rounded-lg grid place-items-center bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
            <Trophy className="w-5 h-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 id="family-challenges-title" className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              Family challenges
              {!premium && <Lock className="w-4 h-4 text-purple-600 dark:text-purple-400" aria-label="Premium" />}
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Siblings team up for a shared reward.
            </p>
          </div>
        </div>
        {premium && (
          <Button size="sm" variant="gradient" onClick={() => openBuilder(null)} className="shrink-0 font-bold">
            <Plus className="w-4 h-4" aria-hidden />
            New challenge
          </Button>
        )}
      </div>

      {!premium ? (
        <LockedPreview kids={kids} />
      ) : (
        <>
          {list.length === 0 ? (
            <div className="rounded-xl border border-dashed p-4 border-gray-300 dark:border-gray-600">
              <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                Pick an idea to start this week&apos;s team goal:
              </p>
              <TemplateChips onPick={tpl => openBuilder(tpl)} />
            </div>
          ) : (
            <ul className="space-y-3">
              {list.map(item => (
                <ChallengeRowView
                  key={item.challenge.id}
                  item={item}
                  busy={busy === item.challenge.id}
                  currencyCode={currencyCode}
                  kidName={kidName}
                  kidColor={kidColor}
                  onDeliver={() => deliver(item)}
                  onCancel={() => cancel(item)}
                />
              ))}
            </ul>
          )}
        </>
      )}

      {premium && (
        <ChallengeBuilderModal
          open={builderOpen}
          onOpenChange={setBuilderOpen}
          kids={kids}
          timeZone={timeZone}
          currencyCode={currencyCode}
          initialTemplate={template}
          onCreated={() => void load()}
        />
      )}
    </section>
  )
}

function TemplateChips({ onPick }: { onPick: (tpl: ChallengeTemplate) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {CHALLENGE_TEMPLATES.map(tpl => (
        <button
          key={tpl.key}
          type="button"
          onClick={() => onPick(tpl)}
          className="rounded-full px-3 py-1.5 text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700/50"
        >
          <span aria-hidden>{tpl.emoji}</span> {tpl.title}: {describeTarget(tpl)}
        </button>
      ))}
    </div>
  )
}

function ProgressBar({ percent, won }: { percent: number; won: boolean }) {
  return (
    <div className="h-3 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
      <div
        className={`h-full rounded-full transition-all duration-700 ${won ? 'bg-gradient-to-r from-amber-400 to-yellow-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`}
        style={{ width: `${Math.max(percent > 0 ? 3 : 0, percent)}%` }}
      />
    </div>
  )
}

function ChallengeRowView({
  item,
  busy,
  currencyCode,
  kidName,
  kidColor,
  onDeliver,
  onCancel,
}: {
  item: ChallengeWithProgress
  busy: boolean
  currencyCode?: string | null
  kidName: (id: string) => string
  kidColor: (id: string) => string | null
  onDeliver: () => void
  onCancel: () => void
}) {
  const { challenge, progress, phase, daysLeft } = item
  const won = phase === 'won' || phase === 'delivered'
  const status =
    phase === 'won'
      ? 'Target reached!'
      : phase === 'delivered'
        ? 'Reward delivered'
        : phase === 'missed'
          ? 'Ended before the target. Try a smaller one next time.'
          : phase === 'upcoming'
            ? `Starts ${challenge.starts_on}`
            : daysLeft === 1 ? 'Last day' : `${daysLeft} days left`

  return (
    <li
      className={`rounded-xl border p-3 sm:p-4 space-y-3 ${
        phase === 'won'
          ? 'border-amber-300 bg-amber-50/60 dark:border-amber-700 dark:bg-amber-900/20'
          : 'border-black/[0.06] dark:border-white/[0.08]'
      }`}
      style={phase === 'won' ? undefined : { background: 'var(--bg-secondary)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="text-3xl leading-none" aria-hidden>{challenge.emoji ?? '🏆'}</span>
          <div className="min-w-0">
            <h3 className="font-bold leading-tight truncate" style={{ color: 'var(--text-primary)' }}>{challenge.title}</h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {describeTarget(challenge)} for <span className="font-semibold">{challenge.reward_text}</span>
              {challenge.reward_cents > 0 && <> + {formatMoney(challenge.reward_cents, currencyCode)} each</>}
            </p>
          </div>
        </div>
        {phase !== 'delivered' && (
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="shrink-0 min-w-[36px] min-h-[36px] grid place-items-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700/50"
            aria-label={phase === 'missed' ? `Clear ${challenge.title}` : `End ${challenge.title}`}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        <ProgressBar percent={progress.percent} won={won} />
        <div className="flex items-center justify-between gap-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
          <span className="tabular-nums">{progress.current} of {progress.goal}</span>
          <span className={phase === 'won' ? 'text-amber-700 dark:text-amber-300' : undefined}>{status}</span>
        </div>
      </div>

      <ul className="flex flex-wrap gap-2" aria-label="Each kid's part">
        {progress.kids.map(k => (
          <li
            key={k.childId}
            className="flex items-center gap-1.5 rounded-full pl-1 pr-2.5 py-0.5 text-xs font-semibold border border-gray-200 text-gray-700 dark:border-gray-600 dark:text-gray-300"
          >
            <span
              className="w-5 h-5 rounded-full grid place-items-center text-[10px] font-black text-white"
              style={{ backgroundColor: kidColor(k.childId) || '#6366f1' }}
              aria-hidden
            >
              {kidName(k.childId).charAt(0).toUpperCase()}
            </span>
            {kidName(k.childId)}: {contributionLabel(k, challenge.mode)}
            {challenge.mode === 'each' && k.done && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden />}
          </li>
        ))}
      </ul>

      {phase === 'won' && (
        <Button size="sm" variant="success" onClick={onDeliver} disabled={busy} className="w-full sm:w-auto font-bold">
          <Gift className="w-4 h-4" aria-hidden />
          {busy ? 'Saving...' : challenge.reward_cents > 0 ? `Reward delivered (+${formatMoney(challenge.reward_cents, currencyCode)} each)` : 'Reward delivered'}
        </Button>
      )}
      {phase === 'delivered' && (
        <p className="text-sm font-semibold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
          <PartyPopper className="w-4 h-4" aria-hidden /> Delivered. Nice teamwork!
        </p>
      )}
    </li>
  )
}

/**
 * What a free family sees: a sample challenge with their own kids' names, the
 * template ideas, and the Premium gate. Decorative (aria-hidden) apart from
 * the gate itself.
 */
function LockedPreview({ kids }: { kids: Child[] }) {
  const sampleKids = kids.slice(0, 3)
  const counts = [21, 14, 9]
  return (
    <div className="space-y-4">
      <div className="relative rounded-xl border p-4 space-y-3 border-black/[0.06] dark:border-white/[0.08] select-none" style={{ background: 'var(--bg-secondary)' }} aria-hidden>
        <div className="flex items-start gap-3">
          <span className="text-3xl leading-none">🍕</span>
          <div>
            <p className="font-bold" style={{ color: 'var(--text-primary)' }}>Pizza Night</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>50 chores together for pizza night</p>
          </div>
        </div>
        <ProgressBar percent={88} won={false} />
        <div className="flex flex-wrap gap-2">
          {sampleKids.map((k, i) => (
            <span
              key={k.id}
              className="rounded-full px-2.5 py-0.5 text-xs font-semibold border border-gray-200 text-gray-700 dark:border-gray-600 dark:text-gray-300"
            >
              {k.name}: Helped {counts[i]}x
            </span>
          ))}
        </div>
        <span className="absolute top-3 right-3 rounded-full px-2 py-0.5 text-[11px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
          6 to go!
        </span>
      </div>
      <div className="flex flex-wrap gap-2" aria-hidden>
        {CHALLENGE_TEMPLATES.slice(0, 3).map(tpl => (
          <span
            key={tpl.key}
            className="rounded-full px-3 py-1 text-xs font-semibold border border-dashed border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-400"
          >
            {tpl.emoji} {tpl.title}: {describeTarget(tpl)}
          </span>
        ))}
      </div>
      <PremiumGate feature="challenges" compact ctaLabel="See Premium" />
    </div>
  )
}
