'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check, Undo2, Camera, Clock } from 'lucide-react'
import { ChoreIcon } from '@/components/ui/chore-icon'
import { playSound } from '@/lib/utils/sound'
import { toast } from 'sonner'
import { formatMoney } from '@/lib/constants/currencies'

/**
 * "Needs your OK": every chore a kid checked off that is waiting for a parent
 * (approval mode, or a chore that asks for a photo). Approve makes it count;
 * Send back removes it so the chore reappears on the kid's list.
 *
 * Renders nothing when the list is empty, so families with approval off never
 * see it unless a photo chore comes in.
 */

export interface PendingItem {
  id: string
  choreId: string
  choreName: string
  choreIcon: string | null
  rewardCents: number
  childId: string | null
  childName: string
  childColor: string | null
  dayOfWeek: number
  dayName: string
  weekStart: string
  completedAt: string
  hasPhoto: boolean
  photoUrl: string | null
}

export interface PendingRedemption {
  id: string
  childId: string
  childName: string
  childColor: string | null
  itemId: string
  itemTitle: string
  itemEmoji: string | null
  priceCents: number
  requestedAt: string
}

export async function reviewRedemption(
  redemptionId: string,
  action: 'approve' | 'reject'
): Promise<{ ok: boolean; notEnough?: boolean }> {
  try {
    const res = await fetch('/api/rewards/redemptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ redemptionId, action }),
    })
    if (res.status === 409) return { ok: false, notEnough: true }
    return { ok: res.ok }
  } catch {
    return { ok: false }
  }
}

export async function reviewCompletion(completionId: string, action: 'approve' | 'reject'): Promise<boolean> {
  try {
    const res = await fetch('/api/chores/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completionId, action }),
    })
    return res.ok
  } catch {
    return false
  }
}

export function ApprovalTray({ onChanged, currencyCode }: { onChanged?: () => void; currencyCode?: string | null }) {
  const [items, setItems] = useState<PendingItem[] | null>(null)
  const [redemptions, setRedemptions] = useState<PendingRedemption[]>([])
  const [busy, setBusy] = useState<Set<string>>(new Set())
  const [lightbox, setLightbox] = useState<PendingItem | null>(null)
  const loadRef = useRef<() => Promise<void>>(async () => {})

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/chores/pending', { cache: 'no-store' })
      if (!res.ok) throw new Error(String(res.status))
      const data = await res.json()
      setItems(data.items ?? [])
      setRedemptions(data.redemptions ?? [])
    } catch {
      // Migration 016 not applied yet, or a transient failure: stay hidden.
      setItems([])
      setRedemptions([])
    }
  }, [])
  loadRef.current = load

  useEffect(() => { void load() }, [load])

  // Live: a kid's tick lands as a chore_completions insert; refetch on any change.
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('approval-tray')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chore_completions' }, () => {
        void loadRef.current()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reward_redemptions' }, () => {
        void loadRef.current()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const review = async (item: PendingItem, action: 'approve' | 'reject') => {
    if (busy.has(item.id)) return
    setBusy(prev => new Set(prev).add(item.id))
    // Optimistic: the row leaves the tray immediately.
    setItems(prev => (prev ?? []).filter(i => i.id !== item.id))
    const ok = await reviewCompletion(item.id, action)
    setBusy(prev => {
      const next = new Set(prev)
      next.delete(item.id)
      return next
    })
    if (!ok) {
      toast.error(action === 'approve' ? 'Could not approve that one' : 'Could not send that back')
      void load()
      return
    }
    if (action === 'approve') {
      playSound('success')
      toast.success(`Approved ${item.childName}'s ${item.choreName}`)
    } else {
      playSound('notification')
      toast(`Sent ${item.choreName} back to ${item.childName}`)
    }
    onChanged?.()
  }

  const reviewRedeem = async (r: PendingRedemption, action: 'approve' | 'reject') => {
    if (busy.has(r.id)) return
    setBusy(prev => new Set(prev).add(r.id))
    setRedemptions(prev => prev.filter(x => x.id !== r.id))
    const result = await reviewRedemption(r.id, action)
    setBusy(prev => {
      const next = new Set(prev)
      next.delete(r.id)
      return next
    })
    if (!result.ok) {
      toast.error(result.notEnough ? `${r.childName} does not have enough saved for that right now` : 'Could not update that request')
      void load()
      return
    }
    if (action === 'approve') {
      playSound('success')
      toast.success(`${r.childName} gets ${r.itemEmoji ?? ''} ${r.itemTitle}`)
    } else {
      playSound('notification')
      toast(`Not this time: ${r.itemTitle}`)
    }
    onChanged?.()
  }

  const total = (items?.length ?? 0) + redemptions.length
  if (!items || total === 0) return null

  return (
    <>
      <section
        aria-labelledby="approval-tray-title"
        className="rounded-2xl border p-4 space-y-3"
        style={{ background: 'var(--card-bg)', borderColor: 'hsl(var(--border))' }}
      >
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg grid place-items-center bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" aria-hidden />
            </span>
            <h2 id="approval-tray-title" className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Needs your OK
            </h2>
          </div>
          <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>
            {total}
          </span>
        </div>

        {redemptions.length > 0 && (
          <ul className="space-y-2" aria-label="Reward requests">
            {redemptions.map(r => (
              <li
                key={r.id}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 border border-black/[0.06] dark:border-white/[0.08]"
                style={{ background: 'var(--bg-secondary)' }}
              >
                <span className="shrink-0 w-14 h-14 rounded-lg grid place-items-center text-3xl" style={{ background: 'var(--card-bg)' }} aria-hidden>
                  {r.itemEmoji ?? '🎁'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold leading-snug truncate" style={{ color: 'var(--text-primary)' }}>
                    {r.itemTitle}
                  </div>
                  <div className="text-xs font-medium truncate flex items-center gap-1.5" style={{ color: r.childColor || 'var(--text-secondary)' }}>
                    <span>{r.childName} wants this</span>
                    <span className="tabular-nums" style={{ color: 'var(--text-secondary)' }}>· {formatMoney(r.priceCents, currencyCode)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => reviewRedeem(r, 'reject')}
                    disabled={busy.has(r.id)}
                    className="min-h-[40px] px-3 rounded-lg text-sm font-semibold border border-black/[0.08] dark:border-white/[0.12] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] disabled:opacity-50"
                    style={{ color: 'var(--text-secondary)' }}
                    aria-label={`Not this time: ${r.itemTitle} for ${r.childName}`}
                  >
                    Not now
                  </button>
                  <button
                    type="button"
                    onClick={() => reviewRedeem(r, 'approve')}
                    disabled={busy.has(r.id)}
                    className="min-h-[40px] px-3 rounded-lg text-sm font-bold accent-fill disabled:opacity-50 inline-flex items-center gap-1.5"
                    aria-label={`Yes to ${r.itemTitle} for ${r.childName}, ${formatMoney(r.priceCents, currencyCode)}`}
                  >
                    <Check className="w-4 h-4 stroke-[2.5]" aria-hidden />
                    Yes
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <ul className="space-y-2">
          {items.map(item => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 border border-black/[0.06] dark:border-white/[0.08]"
              style={{ background: 'var(--bg-secondary)' }}
            >
              {item.hasPhoto && item.photoUrl ? (
                <button
                  type="button"
                  onClick={() => setLightbox(item)}
                  className="shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-black/[0.08] dark:border-white/[0.12] focus-visible:outline-2"
                  aria-label={`See ${item.childName}'s photo for ${item.choreName}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed, short-lived URL */}
                  <img src={item.photoUrl} alt="" className="w-full h-full object-cover" />
                </button>
              ) : (
                <span className="shrink-0 w-14 h-14 rounded-lg grid place-items-center" style={{ background: 'var(--card-bg)' }}>
                  {item.choreIcon ? (
                    <ChoreIcon emoji={item.choreIcon} className="w-8 h-8" tint={item.childColor || undefined} />
                  ) : (
                    <Clock className="w-6 h-6" style={{ color: 'var(--text-secondary)' }} aria-hidden />
                  )}
                </span>
              )}

              <div className="min-w-0 flex-1">
                <div className="font-semibold leading-snug truncate" style={{ color: 'var(--text-primary)' }}>
                  {item.choreName}
                </div>
                <div className="text-xs font-medium truncate flex items-center gap-1.5" style={{ color: item.childColor || 'var(--text-secondary)' }}>
                  <span>{item.childName}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>· {item.dayName}</span>
                  {item.hasPhoto && <Camera className="w-3.5 h-3.5" aria-label="with photo" style={{ color: 'var(--text-secondary)' }} />}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => review(item, 'reject')}
                  disabled={busy.has(item.id)}
                  className="min-h-[40px] px-3 rounded-lg text-sm font-semibold border border-black/[0.08] dark:border-white/[0.12] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] disabled:opacity-50 inline-flex items-center gap-1.5"
                  style={{ color: 'var(--text-secondary)' }}
                  aria-label={`Send ${item.choreName} back to ${item.childName}`}
                >
                  <Undo2 className="w-4 h-4" aria-hidden />
                  <span className="hidden sm:inline">Send back</span>
                </button>
                <button
                  type="button"
                  onClick={() => review(item, 'approve')}
                  disabled={busy.has(item.id)}
                  className="min-h-[40px] px-3 rounded-lg text-sm font-bold accent-fill disabled:opacity-50 inline-flex items-center gap-1.5"
                  aria-label={`Approve ${item.choreName} for ${item.childName}`}
                >
                  <Check className="w-4 h-4 stroke-[2.5]" aria-hidden />
                  Approve
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {lightbox && lightbox.photoUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`${lightbox.childName}'s photo for ${lightbox.choreName}`}
          onClick={() => setLightbox(null)}
        >
          <div className="max-w-3xl w-full space-y-3" onClick={e => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element -- signed, short-lived URL */}
            <img src={lightbox.photoUrl} alt="" className="w-full max-h-[75vh] object-contain rounded-2xl" />
            <div className="flex items-center justify-between gap-3 text-white">
              <div className="font-semibold">
                {lightbox.childName} · {lightbox.choreName}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { const it = lightbox; setLightbox(null); void review(it, 'reject') }}
                  className="min-h-[44px] px-4 rounded-lg font-semibold bg-white/15 hover:bg-white/25"
                >
                  Send back
                </button>
                <button
                  type="button"
                  onClick={() => { const it = lightbox; setLightbox(null); void review(it, 'approve') }}
                  className="min-h-[44px] px-4 rounded-lg font-bold accent-fill"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => setLightbox(null)}
                  className="min-h-[44px] px-4 rounded-lg font-semibold bg-white/15 hover:bg-white/25"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
