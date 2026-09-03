'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Camera, Clock } from 'lucide-react'
import { ChoreIcon } from '@/components/ui/chore-icon'
import { getWeekStart } from '@/lib/utils/date-helpers'
import { dueOn } from '@/lib/utils/schedule'
import { playSound } from '@/lib/utils/sound'
import { useKidT } from '@/lib/i18n/kid'

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
 *
 * Approval mode (migration 016): a tick can come back 'pending', shown as
 * "waiting for a grown-up" until a parent approves. A chore that asks for a
 * photo opens the camera first and posts the picture with the tick.
 */

interface KidChore {
  id: string
  name: string
  icon: string | null
  reward_cents: number | null
  days_of_week?: number[] | null
  requires_photo?: boolean | null
}

type TickState = 'approved' | 'pending'

interface KidChoresProps {
  kidToken: string
  /** Child avatar color — tints icons like the parent app. */
  iconTint?: string | null
  /** Called after a tick or un-tick is saved, so sibling widgets can refetch. */
  onChanged?: () => void
}

/** Downscale a camera photo to a 1280px JPEG so uploads stay small. */
async function prepareProofJpeg(file: File): Promise<Blob | null> {
  const MAX = 1280
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('decode'))
      el.src = url
    })
    const scale = Math.min(1, MAX / Math.max(img.width, img.height))
    const w = Math.max(1, Math.round(img.width * scale))
    const h = Math.max(1, Math.round(img.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(img, 0, 0, w, h)
    return await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.82))
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function KidChores({ kidToken, iconTint, onChanged }: KidChoresProps) {
  const [chores, setChores] = useState<KidChore[] | null>(null)
  const [ticks, setTicks] = useState<Map<string, TickState>>(new Map())
  const [pending, setPending] = useState<Set<string>>(new Set())
  const [photoFor, setPhotoFor] = useState<KidChore | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const t = useKidT()

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
        // Only what is due today. The day is the kid's local day, same as
        // dayOfWeek below, so the list and the ticks agree.
        setChores(dueOn((data.chores ?? []) as KidChore[], dayOfWeek))
        const next = new Map<string, TickState>()
        for (const c of (data.completions ?? []) as Array<{ chore_id: string; day_of_week: number | null; status?: string | null }>) {
          if (c.day_of_week !== dayOfWeek) continue
          next.set(c.chore_id, c.status === 'pending' ? 'pending' : 'approved')
        }
        setTicks(next)
      } catch {
        // Leave as loading-failed; routines below still work.
      }
    })()
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kidToken])

  const setTick = (choreId: string, state: TickState | null) => {
    setTicks(prev => {
      const next = new Map(prev)
      if (state) next.set(choreId, state)
      else next.delete(choreId)
      return next
    })
  }

  const markBusy = (choreId: string, busy: boolean) => {
    setPending(prev => {
      const next = new Set(prev)
      if (busy) next.add(choreId)
      else next.delete(choreId)
      return next
    })
  }

  const celebrateIfDayDone = (choreId: string, newState: TickState) => {
    // Only approved ticks finish the day; a pending one is a promise.
    if (newState !== 'approved' || !chores) return
    const approvedCount = chores.filter(c => (c.id === choreId ? true : ticks.get(c.id) === 'approved')).length
    if (approvedCount === chores.length) {
      playSound('celebration')
      import('@/lib/utils/celebrations')
        .then(({ getCelebrationManager }) => getCelebrationManager().celebrateWithConfetti('perfect'))
        .catch(() => {})
    }
  }

  const toggle = async (chore: KidChore) => {
    if (pending.has(chore.id)) return
    const current = ticks.get(chore.id) ?? null
    const wasDone = current !== null

    // Ticking a photo chore: camera first, the tick rides along with the photo.
    if (!wasDone && chore.requires_photo) {
      setPhotoFor(chore)
      fileInputRef.current?.click()
      return
    }

    // Optimistic flip; revert on failure. A new tick shows as approved until
    // the server says otherwise.
    setTick(chore.id, wasDone ? null : 'approved')
    markBusy(chore.id, true)

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
      const data = (await res.json()) as { status?: string | null }
      if (!wasDone) {
        const state: TickState = data.status === 'pending' ? 'pending' : 'approved'
        setTick(chore.id, state)
        celebrateIfDayDone(chore.id, state)
      }
      onChanged?.()
    } catch {
      setTick(chore.id, current)
      playSound('error')
    } finally {
      markBusy(chore.id, false)
    }
  }

  const handlePhoto = async (file: File | null) => {
    const chore = photoFor
    setPhotoFor(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (!chore || !file) return

    markBusy(chore.id, true)
    setTick(chore.id, 'pending')
    try {
      const jpeg = await prepareProofJpeg(file)
      if (!jpeg) throw new Error('decode')
      const form = new FormData()
      form.set('file', jpeg, 'proof.jpg')
      form.set('choreId', chore.id)
      form.set('dayOfWeek', String(dayOfWeek))
      form.set('weekStart', weekStart)
      const res = await fetch('/api/kid/chores/proof', {
        method: 'POST',
        headers: { Authorization: `Bearer ${kidToken}` },
        body: form,
      })
      if (!res.ok) throw new Error(String(res.status))
      playSound('success')
      import('@/lib/utils/celebrations')
        .then(({ getCelebrationManager }) => getCelebrationManager().celebrateChoreCompletion('', chore.name))
        .catch(() => {})
      onChanged?.()
    } catch {
      setTick(chore.id, null)
      playSound('error')
    } finally {
      markBusy(chore.id, false)
    }
  }

  // Nothing assigned: say nothing. The routines empty-state already covers the
  // "ask a grownup" case, and two stacked empty states read as a broken page.
  if (!chores || chores.length === 0) return null

  const doneCount = chores.filter(c => ticks.get(c.id) === 'approved').length
  const waitingCount = chores.filter(c => ticks.get(c.id) === 'pending').length

  return (
    <div className="max-w-2xl mx-auto mb-10">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={e => void handlePhoto(e.target.files?.[0] ?? null)}
      />

      <div className="flex items-baseline justify-between mb-4 px-1">
        <h2 className="text-2xl font-black text-white drop-shadow-sm">{t('chores.title')}</h2>
        <span className="text-white/90 font-bold tabular-nums">
          {t('chores.doneCount', { done: doneCount, total: chores.length })}
          {waitingCount > 0 ? ` · ${t('chores.waiting', { count: waitingCount })}` : ''}
        </span>
      </div>

      <div className="space-y-3">
        {chores.map((chore, i) => {
          const state = ticks.get(chore.id) ?? null
          const done = state === 'approved'
          const waiting = state === 'pending'
          return (
            <motion.button
              key={chore.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => toggle(chore)}
              aria-pressed={done || waiting}
              aria-label={`${chore.name}, ${
                waiting ? t('chores.ariaWaiting') : done ? t('chores.ariaDone') : chore.requires_photo ? t('chores.ariaNotDonePhoto') : t('chores.ariaNotDone')
              }`}
              className={`w-full flex items-center gap-4 rounded-2xl p-4 text-start shadow-lg transition-all active:scale-[0.98] ${
                done ? 'bg-white/70' : waiting ? 'bg-amber-50' : 'bg-white'
              }`}
            >
              {chore.icon && (
                <ChoreIcon
                  emoji={chore.icon}
                  className="w-10 h-10 shrink-0"
                  tint={iconTint || undefined}
                />
              )}
              <span className="flex-1 min-w-0">
                <span
                  className={`block text-xl font-bold truncate ${
                    done ? 'text-gray-400 line-through' : 'text-gray-900'
                  }`}
                >
                  {chore.name}
                </span>
                {waiting ? (
                  <span className="block text-sm font-bold text-amber-700">{t('chores.waitingBadge')}</span>
                ) : (
                  !done && chore.requires_photo && (
                    <span className="inline-flex items-center gap-1 text-sm font-bold text-gray-500">
                      <Camera className="w-4 h-4" aria-hidden /> {t('chores.takePhoto')}
                    </span>
                  )
                )}
              </span>
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-4 transition-colors ${
                  done
                    ? 'accent-fill border-transparent'
                    : waiting
                      ? 'border-amber-400 bg-amber-100 text-amber-700'
                      : 'border-gray-300 bg-white'
                }`}
                aria-hidden
              >
                {done && <Check className="h-6 w-6 stroke-[3]" />}
                {waiting && <Clock className="h-6 w-6 stroke-[2.5]" />}
                {!done && !waiting && chore.requires_photo && <Camera className="h-5 w-5 text-gray-400" />}
              </span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
