'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Target, Pencil, ShoppingBag, X, Check, Clock } from 'lucide-react'
import { formatMoney, currencySymbol } from '@/lib/constants/currencies'
import { GOAL_EMOJIS, GOAL_PRESET_CENTS, GOAL_MAX_CENTS } from '@/lib/constants/rewards'
import { playSound } from '@/lib/utils/sound'
import { useKidT } from '@/lib/i18n/kid'
import type { KidWallet, KidGoal, KidStoreItem } from '@/lib/hooks/use-kid-wallet'

/**
 * Where the money goes (2.0).
 *
 * KidGoalCard: the thing the kid is saving for, with a progress bar fed by
 * their unspent balance. KidStore: the family's menu of rewards, lit when
 * affordable. Both are white cards on the themed gradient, like the rest of
 * kid mode, and both talk to the kid endpoints with the kid token.
 */

interface CommonProps {
  kidToken: string
  wallet: KidWallet
  onChanged: () => void
}

/* ------------------------------------------------------------------------ */
/* Goal                                                                     */
/* ------------------------------------------------------------------------ */

const CELEBRATED_KEY = (goalId: string) => `chorestar-kid-goal-celebrated:${goalId}`

export function KidGoalCard({ kidToken, wallet, onChanged }: CommonProps) {
  const t = useKidT()
  const [sheet, setSheet] = useState<'new' | 'edit' | null>(null)
  const goal = wallet.goal
  const money = (c: number) => formatMoney(c, wallet.currencyCode)

  // The first time the balance covers the target, a proper celebration. Once
  // per goal per device, so reloading the page does not re-fire it.
  useEffect(() => {
    if (!goal?.reached || goal.status !== 'active') return
    try {
      const key = CELEBRATED_KEY(goal.id)
      if (localStorage.getItem(key)) return
      localStorage.setItem(key, '1')
    } catch {
      // Celebrate anyway.
    }
    playSound('celebration')
    import('@/lib/utils/celebrations')
      .then(({ getCelebrationManager }) => getCelebrationManager().celebrateWithConfetti('epic'))
      .catch(() => {})
  }, [goal?.id, goal?.reached, goal?.status])

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        aria-labelledby="kid-goal-title"
        className="max-w-2xl mx-auto mb-6 rounded-3xl bg-white p-5 shadow-lg"
      >
        {goal ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-4xl leading-none" aria-hidden>{goal.emoji ?? '🎯'}</span>
                <div className="min-w-0">
                  <div className="text-xs font-bold uppercase tracking-wide text-gray-500">{t('goal.savingFor')}</div>
                  <h2 id="kid-goal-title" className="text-2xl font-black text-gray-900 leading-tight truncate">
                    {goal.title}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSheet('edit')}
                className="shrink-0 min-w-[44px] min-h-[44px] grid place-items-center rounded-xl text-gray-500 hover:bg-gray-100"
                aria-label={t('goal.changeAria')}
              >
                <Pencil className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={goal.percent} aria-label={t('common.xOfY', { x: money(goal.progressCents), y: money(goal.targetCents) })}>
              <div className="h-5 rounded-full bg-gray-100 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${goal.reached ? 'bg-gradient-to-r from-yellow-400 to-amber-500' : 'accent-fill'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(goal.percent > 0 ? 4 : 0, goal.percent)}%` }}
                  transition={{ type: 'spring', duration: 0.9, bounce: 0.2 }}
                />
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-3">
                <span className="text-xl font-black text-gray-900 tabular-nums">
                  {money(goal.progressCents)} <span className="text-gray-400 font-bold">{t('goal.ofTarget', { target: money(goal.targetCents) })}</span>
                </span>
                <span className="text-sm font-bold text-gray-600 tabular-nums">
                  {goal.reached ? t('goal.youDidIt') : t('goal.toGo', { money: money(goal.targetCents - goal.progressCents) })}
                </span>
              </div>
            </div>

            {goal.reached && (
              <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                {t('goal.payItOut')}
              </p>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={() => setSheet('new')}
            className="w-full flex items-center gap-4 text-start"
          >
            <span className="grid place-items-center w-14 h-14 rounded-2xl accent-fill shrink-0">
              <Target className="w-7 h-7" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-2xl font-black text-gray-900 leading-tight">{t('goal.whatSaving')}</span>
              <span className="block text-sm font-bold text-gray-500 mt-0.5">
                {t('goal.pickWatch', { money: money(wallet.owedCents) })}
              </span>
            </span>
          </button>
        )}

        {wallet.reachedGoals.length > 0 && (
          <div className="mt-3 text-xs font-bold text-gray-500">
            🏆 {wallet.reachedGoals.length === 1 ? t('goal.oneReached') : t('goal.manyReached', { count: wallet.reachedGoals.length })}
            {wallet.reachedGoals[0] ? `: ${wallet.reachedGoals[0].emoji ?? ''} ${wallet.reachedGoals[0].title}` : ''}
          </div>
        )}
      </motion.section>

      {sheet && (
        <GoalSheet
          mode={sheet}
          goal={sheet === 'edit' ? goal : null}
          currencyCode={wallet.currencyCode}
          kidToken={kidToken}
          childId={wallet.childId}
          onClose={() => setSheet(null)}
          onSaved={() => { setSheet(null); onChanged() }}
        />
      )}
    </>
  )
}

function GoalSheet({
  mode,
  goal,
  currencyCode,
  kidToken,
  childId,
  onClose,
  onSaved,
}: {
  mode: 'new' | 'edit'
  goal: KidGoal | null
  currencyCode: string
  kidToken: string
  childId: string
  onClose: () => void
  onSaved: () => void
}) {
  const t = useKidT()
  const [emoji, setEmoji] = useState<string>(goal?.emoji ?? GOAL_EMOJIS[0])
  const [title, setTitle] = useState(goal?.title ?? '')
  const [cents, setCents] = useState<number>(goal?.targetCents ?? GOAL_PRESET_CENTS[1])
  const [custom, setCustom] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const symbol = currencySymbol(currencyCode)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const applyCustom = (raw: string) => {
    setCustom(raw)
    const n = Number(raw.replace(/[^0-9.]/g, ''))
    if (Number.isFinite(n) && n > 0) setCents(Math.min(GOAL_MAX_CENTS, Math.round(n * 100)))
  }

  const save = async () => {
    if (!title.trim() || cents < 100) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/kid/goals', {
        method: mode === 'new' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${kidToken}` },
        body: JSON.stringify(
          mode === 'new'
            ? { childId, title: title.trim(), emoji, targetCents: cents }
            : { childId, goalId: goal!.id, title: title.trim(), emoji, targetCents: cents }
        ),
      })
      if (res.status === 409) {
        const data = await res.json().catch(() => ({}))
        setError(data.message || t('goal.oneAtATime'))
        return
      }
      if (!res.ok) throw new Error(String(res.status))
      playSound('success')
      onSaved()
    } catch {
      setError(t('goal.saveFailed'))
    } finally {
      setBusy(false)
    }
  }

  const archive = async () => {
    if (!goal) return
    setBusy(true)
    try {
      const res = await fetch('/api/kid/goals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${kidToken}` },
        body: JSON.stringify({ childId, goalId: goal.id, action: 'archive' }),
      })
      if (!res.ok) throw new Error(String(res.status))
      onSaved()
    } catch {
      setError(t('goal.removeFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', duration: 0.5, bounce: 0.3 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="goal-sheet-title"
        onClick={e => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white p-5 sm:p-7 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <h2 id="goal-sheet-title" className="text-3xl font-black text-gray-900">
            {mode === 'new' ? t('goal.pickTitle') : t('goal.changeTitle')}
          </h2>
          <button type="button" onClick={onClose} aria-label={t('common.close')} className="rounded-full p-2 text-gray-500 hover:bg-gray-100 min-w-[44px] min-h-[44px] grid place-items-center">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <div className="text-sm font-bold text-gray-500 mb-2">{t('goal.pickPicture')}</div>
            <div className="grid grid-cols-6 gap-2" role="radiogroup" aria-label={t('goal.pictureAria')}>
              {GOAL_EMOJIS.map(e => (
                <button
                  key={e}
                  type="button"
                  role="radio"
                  aria-checked={emoji === e}
                  aria-label={e}
                  onClick={() => setEmoji(e)}
                  className={`h-12 rounded-xl text-2xl grid place-items-center border-2 transition-transform active:scale-95 ${
                    emoji === e ? 'border-transparent accent-fill' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="goal-title" className="block text-sm font-bold text-gray-500 mb-2">{t('goal.whatIsIt')}</label>
            <input
              id="goal-title"
              value={title}
              onChange={e => setTitle(e.target.value.slice(0, 60))}
              placeholder={t('goal.titlePlaceholder')}
              className="w-full h-14 rounded-xl border-2 border-gray-200 px-4 text-xl font-bold text-gray-900 placeholder:text-gray-300 focus:border-gray-400 focus:outline-none"
            />
          </div>

          <div>
            <div className="text-sm font-bold text-gray-500 mb-2">{t('goal.howMuch')}</div>
            <div className="grid grid-cols-4 gap-2 mb-2" role="radiogroup" aria-label={t('goal.amountAria')}>
              {GOAL_PRESET_CENTS.map(c => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={cents === c && !custom}
                  onClick={() => { setCents(c); setCustom('') }}
                  className={`h-12 rounded-xl font-black text-lg tabular-nums border-2 ${
                    cents === c && !custom ? 'border-transparent accent-fill' : 'border-gray-200 bg-gray-50 text-gray-800'
                  }`}
                >
                  {formatMoney(c, currencyCode)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-gray-500">{symbol}</span>
              <input
                inputMode="decimal"
                value={custom}
                onChange={e => applyCustom(e.target.value)}
                placeholder={t('goal.customPlaceholder')}
                aria-label={t('goal.customAria')}
                className="flex-1 h-12 rounded-xl border-2 border-gray-200 px-3 text-lg font-bold text-gray-900 placeholder:text-gray-300 focus:border-gray-400 focus:outline-none"
              />
            </div>
          </div>

          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p>}

          <div className="flex gap-3 pt-1">
            {mode === 'edit' && (
              <button
                type="button"
                onClick={archive}
                disabled={busy}
                className="min-h-[52px] px-4 rounded-2xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
              >
                {t('goal.remove')}
              </button>
            )}
            <button
              type="button"
              onClick={save}
              disabled={busy || !title.trim() || cents < 100}
              className="flex-1 min-h-[52px] rounded-2xl font-black text-lg accent-fill disabled:opacity-50"
            >
              {busy ? t('common.saving') : mode === 'new' ? t('goal.startSaving') : t('goal.saveChanges')}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

/* ------------------------------------------------------------------------ */
/* Store                                                                    */
/* ------------------------------------------------------------------------ */

export function KidStore({ kidToken, wallet, onChanged }: CommonProps) {
  const t = useKidT()
  const [confirm, setConfirm] = useState<KidStoreItem | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const money = (c: number) => formatMoney(c, wallet.currencyCode)

  if (wallet.store.length === 0) return null

  const request = async (item: KidStoreItem) => {
    setBusy(item.id)
    setNotice(null)
    try {
      const res = await fetch('/api/kid/store/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${kidToken}` },
        body: JSON.stringify({ childId: wallet.childId, itemId: item.id }),
      })
      if (res.status === 409) {
        const data = await res.json().catch(() => ({}))
        setNotice(data.shortByCents ? t('store.needMore', { money: money(data.shortByCents) }) : t('store.notEnough'))
        return
      }
      if (!res.ok) throw new Error(String(res.status))
      playSound('success')
      import('@/lib/utils/celebrations')
        .then(({ getCelebrationManager }) => getCelebrationManager().celebrateWithConfetti('normal'))
        .catch(() => {})
      setNotice(t('store.asked', { title: item.title }))
      onChanged()
    } catch {
      setNotice(t('store.sendFailed'))
      playSound('error')
    } finally {
      setBusy(null)
      setConfirm(null)
    }
  }

  const cancel = async (item: KidStoreItem) => {
    if (!item.pendingRequestId) return
    setBusy(item.id)
    try {
      const res = await fetch('/api/kid/store/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${kidToken}` },
        body: JSON.stringify({ childId: wallet.childId, redemptionId: item.pendingRequestId, action: 'cancel' }),
      })
      if (!res.ok) throw new Error(String(res.status))
      playSound('notification')
      onChanged()
    } catch {
      playSound('error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section aria-labelledby="kid-store-title" className="max-w-2xl mx-auto mb-10">
      <div className="flex items-baseline justify-between mb-4 px-1">
        <h2 id="kid-store-title" className="text-2xl font-black text-white drop-shadow-sm flex items-center gap-2">
          <ShoppingBag className="w-6 h-6" aria-hidden /> {t('store.title')}
        </h2>
        <span className="text-white/90 font-bold tabular-nums">{t('store.toSpend', { money: money(wallet.owedCents) })}</span>
      </div>

      {notice && (
        <p className="mb-3 rounded-2xl bg-white/90 px-4 py-3 text-sm font-bold text-gray-800" role="status">
          {notice}
        </p>
      )}

      <ul className="grid grid-cols-2 gap-3">
        {wallet.store.map((item, i) => {
          const pending = Boolean(item.pendingRequestId)
          return (
            <motion.li
              key={item.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`rounded-2xl p-4 shadow-lg flex flex-col gap-2 ${
                pending ? 'bg-amber-50' : item.affordable ? 'bg-white' : 'bg-white/70'
              }`}
            >
              <div className={`text-4xl leading-none ${item.affordable || pending ? '' : 'grayscale opacity-70'}`} aria-hidden>
                {item.emoji ?? '🎁'}
              </div>
              <div className="font-black text-gray-900 leading-tight">{item.title}</div>
              <div className="text-sm font-bold text-gray-600 tabular-nums">{money(item.priceCents)}</div>
              {pending ? (
                <div className="mt-auto flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-sm font-bold text-amber-700">
                    <Clock className="w-4 h-4" aria-hidden /> {t('store.askedBadge')}
                  </span>
                  <button
                    type="button"
                    onClick={() => cancel(item)}
                    disabled={busy === item.id}
                    className="min-h-[36px] px-3 rounded-lg text-xs font-bold text-gray-600 bg-white hover:bg-gray-100 disabled:opacity-50"
                    aria-label={t('store.neverMindAria', { title: item.title })}
                  >
                    {t('store.neverMind')}
                  </button>
                </div>
              ) : item.affordable ? (
                <button
                  type="button"
                  onClick={() => setConfirm(item)}
                  disabled={busy === item.id}
                  className="mt-auto min-h-[44px] rounded-xl font-black accent-fill disabled:opacity-50"
                  aria-label={t('store.getAria', { title: item.title, money: money(item.priceCents) })}
                >
                  {t('store.getIt')}
                </button>
              ) : (
                <div className="mt-auto text-xs font-bold text-gray-500 tabular-nums">{t('store.more', { money: money(item.shortByCents) })}</div>
              )}
            </motion.li>
          )
        })}
      </ul>

      {confirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setConfirm(null)}
          role="presentation"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="redeem-title"
            onClick={e => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-center"
          >
            <div className="text-6xl mb-2" aria-hidden>{confirm.emoji ?? '🎁'}</div>
            <h3 id="redeem-title" className="text-2xl font-black text-gray-900">{confirm.title}</h3>
            <p className="mt-1 text-gray-600 font-bold">
              {t('store.spendConfirm', { price: money(confirm.priceCents), balance: money(wallet.owedCents) })}
            </p>
            <p className="mt-1 text-sm text-gray-500 font-semibold">{t('store.grownUpDecides')}</p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirm(null)}
                className="flex-1 min-h-[52px] rounded-2xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200"
              >
                {t('store.notNow')}
              </button>
              <button
                type="button"
                onClick={() => request(confirm)}
                disabled={busy === confirm.id}
                className="flex-1 min-h-[52px] rounded-2xl font-black accent-fill inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Check className="w-5 h-5 stroke-[3]" aria-hidden /> {t('store.yesPlease')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </section>
  )
}
