'use client'

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { ShoppingBag, PiggyBank, Heart, Timer, AlertCircle } from 'lucide-react'
import { formatMoney } from '@/lib/constants/currencies'
import { useKidT, type KidKey } from '@/lib/i18n/kid'
import type { KidWallet, KidMoneyNews } from '@/lib/hooks/use-kid-wallet'

/**
 * The kid's money at a glance (Premium, migration 030): three jars when the
 * parent turned them on, what they owe if a fine went below zero, banked
 * screen-time minutes, and the latest money news with the parent's reason
 * for every deduction. White cards on the themed gradient, like the rest of
 * kid mode. Renders nothing for a free family (the server sends none of it),
 * so a kid never meets a paywall.
 */
export function KidMoney({ wallet }: { wallet: KidWallet }) {
  const t = useKidT()
  const money = (c: number) => formatMoney(Math.abs(c), wallet.currencyCode)
  const jars = wallet.jars?.enabled ? wallet.jars : null
  const owes = (wallet.balanceCents ?? 0) < 0 ? -(wallet.balanceCents ?? 0) : 0
  const minutes = wallet.minutes && (wallet.minutes.earned > 0 || wallet.minutes.balance !== 0) ? wallet.minutes : null
  const news = (wallet.moneyNews ?? []).slice(0, 4)
  const fullest = jars ? Math.max(jars.spendCents, jars.saveCents, jars.giveCents, 1) : 1
  const level = (cents: number) => (cents <= 0 ? 0 : Math.max(12, Math.round((cents / fullest) * 100)))

  if (!jars && !owes && !minutes && news.length === 0) return null

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      aria-labelledby="kid-money-title"
      className="max-w-2xl mx-auto mb-6 rounded-3xl bg-white p-5 shadow-lg"
    >
      <h2 id="kid-money-title" className="text-2xl font-black text-gray-900 mb-4">{t('money.title')}</h2>

      {jars && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <Jar icon={<ShoppingBag className="w-6 h-6" aria-hidden />} label={t('money.spend')} hint={t('money.spendHint')} cents={jars.spendCents} money={money} tint="bg-emerald-100 text-emerald-800" fill="bg-emerald-400" level={level(jars.spendCents)} />
          <Jar icon={<PiggyBank className="w-6 h-6" aria-hidden />} label={t('money.save')} hint={t('money.saveHint')} cents={jars.saveCents} money={money} tint="bg-sky-100 text-sky-800" fill="bg-sky-400" level={level(jars.saveCents)} />
          <Jar icon={<Heart className="w-6 h-6" aria-hidden />} label={t('money.give')} hint={t('money.giveHint')} cents={jars.giveCents} money={money} tint="bg-rose-100 text-rose-800" fill="bg-rose-400" level={level(jars.giveCents)} />
        </div>
      )}

      {owes > 0 && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-red-50 px-4 py-3" role="status">
          <AlertCircle className="w-6 h-6 shrink-0 text-red-600" aria-hidden />
          <div>
            <div className="text-lg font-black text-red-700">{t('money.owe', { money: money(owes) })}</div>
            <div className="text-sm font-bold text-red-700/80">{t('money.oweHint')}</div>
          </div>
        </div>
      )}

      {minutes && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-violet-50 px-4 py-3">
          <span className="grid place-items-center w-11 h-11 rounded-xl bg-violet-200 text-violet-800 shrink-0">
            <Timer className="w-6 h-6" aria-hidden />
          </span>
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-violet-700">{t('money.minutes')}</div>
            <div className="text-xl font-black text-gray-900 tabular-nums">{t('money.minutesBanked', { minutes: Math.max(0, minutes.balance) })}</div>
          </div>
        </div>
      )}

      {news.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">{t('money.news')}</div>
          <ul className="space-y-2">
            {news.map((n) => (
              <NewsRow key={n.id} item={n} money={money} />
            ))}
          </ul>
        </div>
      )}
    </motion.section>
  )
}

function Jar({
  icon,
  label,
  hint,
  cents,
  money,
  tint,
  fill,
  level,
}: {
  icon: ReactNode
  label: string
  hint: string
  cents: number
  money: (c: number) => string
  tint: string
  fill: string
  /** How full the jar looks, 0..100, relative to the fullest jar. */
  level: number
}) {
  return (
    <div className={`rounded-2xl p-3 flex flex-col items-center text-center ${tint}`}>
      <div className="relative w-12 h-14 rounded-b-2xl rounded-t-lg border-4 border-white bg-white/70 overflow-hidden mb-2" aria-hidden>
        <motion.div
          className={`absolute bottom-0 left-0 right-0 ${fill}`}
          initial={{ height: 0 }}
          animate={{ height: `${level}%` }}
          transition={{ type: 'spring', duration: 0.9, bounce: 0.2 }}
        />
        <span className="absolute inset-0 grid place-items-center">{icon}</span>
      </div>
      <div className="text-sm font-black">{label}</div>
      <div className={`text-xl font-black tabular-nums ${cents < 0 ? 'text-red-600' : 'text-gray-900'}`}>
        {cents < 0 ? '-' : ''}{money(cents)}
      </div>
      <div className="text-[11px] font-bold opacity-80 leading-tight">{hint}</div>
    </div>
  )
}

const KIND_KEYS: Record<string, KidKey> = {
  allowance: 'money.kind.allowance',
  interest: 'money.kind.interest',
  fine: 'money.kind.fine',
  repayment: 'money.kind.repayment',
  donation: 'money.kind.donation',
}

function NewsRow({ item, money }: { item: KidMoneyNews; money: (c: number) => string }) {
  const t = useKidT()
  const skipped = item.kind === 'allowance' && item.amountCents === 0
  const key = skipped ? 'money.kind.allowanceSkipped' : KIND_KEYS[item.kind]
  const title = key ? t(key) : item.kind
  // The parent's reason is the point for a deduction; show it.
  const detail = item.note && (item.amountCents < 0 || skipped || item.kind === 'donation') ? item.note : null
  return (
    <li className="flex items-start justify-between gap-3 rounded-2xl bg-gray-50 px-4 py-2.5">
      <div className="min-w-0">
        <div className="font-black text-gray-900">{title}</div>
        {detail && <div className="text-sm font-bold text-gray-600 break-words">{detail}</div>}
      </div>
      <div
        className={`shrink-0 text-lg font-black tabular-nums ${
          item.amountCents > 0 ? 'text-emerald-600' : item.amountCents < 0 ? 'text-red-600' : 'text-gray-400'
        }`}
      >
        {item.amountCents > 0 ? '+' : item.amountCents < 0 ? '-' : ''}
        {money(item.amountCents)}
      </div>
    </li>
  )
}
