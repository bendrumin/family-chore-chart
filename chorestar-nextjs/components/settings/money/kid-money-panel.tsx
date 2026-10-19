'use client'

import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { PiggyBank, CalendarClock, Receipt, Timer, Heart, History, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { formatMoney, currencySymbol, amountToCents, sanitizeAmountInput } from '@/lib/constants/currencies'
import { DAY_LONG } from '@/lib/utils/schedule'
import {
  DEFAULT_SPLIT,
  INTEREST_MAX_BPS,
  INTEREST_MAX_CENTS_PER_WEEK,
  MINUTES_USE_PRESETS,
  SPLIT_PRESETS,
  formatMinutes,
  formatRate,
  type JarSplit,
  type MoneyFeature,
} from '@/lib/utils/money'
import { openPremiumGate } from '@/components/settings/premium-gate'

export interface KidMoney {
  childId: string
  name: string
  balance: {
    balanceCents: number
    owedCents: number
    spendableCents: number
    jars: { enabled: boolean; split: JarSplit; spendCents: number; saveCents: number; giveCents: number }
  }
  split: (JarSplit & { enabled: boolean }) | null
  schedule: {
    paydayWeekday: number
    nextPayday: string
    allowanceCents: number
    thresholdPct: number | null
    interestBps: number
  }
  repayments: Array<{ id: string; title: string; amountCents: number; allowNegative: boolean; startedOn: string }>
  minutes: {
    balance: number
    earned: number
    used: number
    available: boolean
    chores: Array<{ id: string; name: string; rewardCents: number; minutes: number }>
    routines: Array<{ id: string; name: string; minutes: number }>
  }
  ledger: Array<{ id: string; kind: string; jar: string | null; amountCents: number; effectiveOn: string; note: string | null; createdAt: string }>
}

/** Signed money: "-$2.00" for a kid who owes. */
function signedMoney(cents: number, currency: string) {
  return cents < 0 ? `-${formatMoney(-cents, currency)}` : formatMoney(cents, currency)
}

function shortDate(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

/**
 * One kid's money settings. Every change posts one action to /api/money and
 * gets the kid's fresh state back. A 403 premium_required (the plan lapsed
 * since the tab loaded) opens Billing with that feature's paywall source.
 */
export function KidMoneyPanel({ kid, currency, onChanged }: { kid: KidMoney; currency: string; onChanged: (kid: KidMoney) => void }) {
  const [busy, setBusy] = useState<string | null>(null)
  const money = (c: number) => formatMoney(c, currency)
  const jars = kid.balance.jars

  const post = async (action: string, payload: Record<string, unknown>, feature: MoneyFeature, success?: string): Promise<boolean> => {
    setBusy(action)
    try {
      const res = await fetch('/api/money', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, childId: kid.childId, ...payload }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 403 && data.error === 'premium_required') {
        toast.error('That needs Premium.', { action: { label: 'See Premium', onClick: () => openPremiumGate(data.feature ?? feature) } })
        return false
      }
      if (res.status === 409 && data.error === 'not_enough') {
        if (typeof data.availableMinutes === 'number') toast.error(`${kid.name} only has ${formatMinutes(data.availableMinutes)} banked.`)
        else toast.error(`Only ${money(data.availableCents ?? 0)} available. Lower the amount, or allow going below zero.`)
        return false
      }
      if (!res.ok) throw new Error(data.error || 'failed')
      if (data.kid) onChanged(data.kid as KidMoney)
      if (success) toast.success(success)
      return true
    } catch (e) {
      toast.error(e instanceof Error && e.message !== 'failed' ? e.message : 'Could not save that')
      return false
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Balances */}
      <div className="rounded-xl border p-4" style={{ background: 'var(--card-bg)', borderColor: 'hsl(var(--border))' }}>
        {jars.enabled ? (
          <div className="grid grid-cols-3 gap-2">
            <JarTile label="Spend" cents={jars.spendCents} currency={currency} pct={jars.split.spend} className="bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200" />
            <JarTile label="Save" cents={jars.saveCents} currency={currency} pct={jars.split.save} className="bg-sky-50 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200" />
            <JarTile label="Give" cents={jars.giveCents} currency={currency} pct={jars.split.give} className="bg-rose-50 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200" />
          </div>
        ) : (
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>{kid.name}&apos;s balance</span>
            <span className={`text-2xl font-black tabular-nums ${kid.balance.balanceCents < 0 ? 'text-red-600 dark:text-red-400' : ''}`} style={kid.balance.balanceCents < 0 ? undefined : { color: 'var(--text-primary)' }}>
              {signedMoney(kid.balance.balanceCents, currency)}
            </span>
          </div>
        )}
        {kid.balance.balanceCents < 0 && (
          <p className="mt-2 text-sm font-semibold text-red-600 dark:text-red-400">
            {kid.name} owes you {money(-kid.balance.balanceCents)}. It gets paid back as {kid.name} earns.
          </p>
        )}
        {kid.minutes.available && (kid.minutes.earned > 0 || kid.minutes.balance !== 0) && (
          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Screen time banked: <strong style={{ color: 'var(--text-primary)' }}>{formatMinutes(kid.minutes.balance)}</strong>
          </p>
        )}
      </div>

      <JarsCard kid={kid} currency={currency} busy={busy} post={post} />
      <ScheduleCard kid={kid} currency={currency} busy={busy} post={post} />
      <FinesCard kid={kid} currency={currency} busy={busy} post={post} />
      <MinutesCard kid={kid} busy={busy} post={post} />

      {kid.ledger.length > 0 && (
        <Card icon={<History className="w-4 h-4" />} title="Recent money activity">
          <ul className="space-y-1.5">
            {kid.ledger.map((row) => (
              <li key={row.id} className="flex items-start justify-between gap-3 text-sm">
                <span className="min-w-0" style={{ color: 'var(--text-secondary)' }}>
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{row.note || row.kind}</span>
                  <span className="block text-xs">{shortDate(row.effectiveOn)}</span>
                </span>
                <span className={`shrink-0 font-bold tabular-nums ${row.amountCents < 0 ? 'text-red-600 dark:text-red-400' : row.amountCents > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  {row.amountCents > 0 ? '+' : ''}{signedMoney(row.amountCents, currency)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

type Post = (action: string, payload: Record<string, unknown>, feature: MoneyFeature, success?: string) => Promise<boolean>

function Card({ icon, title, children, aside }: { icon: ReactNode; title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="rounded-xl border p-4 space-y-3" style={{ background: 'var(--card-bg)', borderColor: 'hsl(var(--border))' }}>
      <div className="flex items-center gap-2">
        <span className="text-indigo-600 dark:text-indigo-400">{icon}</span>
        <h4 className="font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h4>
        {aside && <span className="ml-auto">{aside}</span>}
      </div>
      {children}
    </div>
  )
}

function JarTile({ label, cents, currency, pct, className }: { label: string; cents: number; currency: string; pct: number; className: string }) {
  return (
    <div className={`rounded-xl px-3 py-2 ${className}`}>
      <div className="flex items-baseline justify-between text-xs font-bold">
        <span>{label}</span>
        <span className="opacity-70">{pct}%</span>
      </div>
      <div className={`text-lg font-black tabular-nums ${cents < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>{signedMoney(cents, currency)}</div>
    </div>
  )
}

function MoneyInput({ id, value, onChange, currency, label }: { id: string; value: string; onChange: (v: string) => void; currency: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{currencySymbol(currency)}</span>
      <Input id={id} value={value} onChange={(e) => onChange(sanitizeAmountInput(e.target.value))} inputMode="decimal" aria-label={label} className="w-24 h-11 text-right tabular-nums" />
    </div>
  )
}

function CheckRow({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex items-start gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
      <Checkbox checked={checked} onCheckedChange={onChange} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </label>
  )
}

/* ---------------------------------------------------------------------- */

function JarsCard({ kid, currency, busy, post }: { kid: KidMoney; currency: string; busy: string | null; post: Post }) {
  const on = kid.balance.jars.enabled
  const initial = kid.split?.enabled ? kid.split : DEFAULT_SPLIT
  const [split, setSplit] = useState<JarSplit>({ spend: initial.spend, save: initial.save, give: initial.give })
  const [editing, setEditing] = useState(false)
  const [donation, setDonation] = useState<{ amount: string; to: string } | null>(null)
  const total = split.spend + split.save + split.give
  const valid = total === 100
  const set = (jar: keyof JarSplit, raw: string) => {
    const n = Math.max(0, Math.min(100, Number(raw.replace(/\D/g, '')) || 0))
    setSplit((s) => ({ ...s, [jar]: n }))
  }

  const save = async () => {
    if (!valid) return
    const ok = await post('jars', { enabled: true, ...split }, 'jars', on ? 'Split updated. New earnings use it from today.' : `Jars are on for ${kid.name}. New earnings split from today.`)
    if (ok) setEditing(false)
  }
  const turnOff = async () => {
    if (!window.confirm(`Turn off ${kid.name}'s jars? Save and Give go back into one balance.`)) return
    await post('jars', { enabled: false, spend: 100, save: 0, give: 0 }, 'jars', 'Jars off. Everything is one balance again.')
  }
  const donate = async () => {
    if (!donation) return
    const cents = amountToCents(donation.amount)
    if (!cents || cents <= 0 || !donation.to.trim()) {
      toast.error('Enter an amount and where it went')
      return
    }
    const ok = await post('donation', { amountCents: cents, note: `Gave ${formatMoney(cents, currency)} to ${donation.to.trim()}` }, 'jars', 'Donation recorded')
    if (ok) setDonation(null)
  }

  return (
    <Card
      icon={<PiggyBank className="w-4 h-4" />}
      title="Spend, Save, Give"
      aside={on && !editing ? (
        <button type="button" onClick={turnOff} disabled={busy !== null} className="text-xs font-semibold text-gray-500 dark:text-gray-400 underline">
          Turn off
        </button>
      ) : undefined}
    >
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        {on
          ? 'New earnings and allowance split into three jars as they come in. The store and payouts use Spend, goals fill from Save, and Give is for giving away.'
          : 'Split what your kid earns from today into three jars. Money earned before today stays in Spend.'}
      </p>

      {(!on || editing) ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {SPLIT_PRESETS.map((p) => {
              const active = p.spend === split.spend && p.save === split.save && p.give === split.give
              return (
                <button
                  key={`${p.spend}-${p.save}-${p.give}`}
                  type="button"
                  onClick={() => setSplit({ ...p })}
                  className={`min-h-[36px] px-3 rounded-full text-xs font-bold border tabular-nums ${active ? 'accent-fill border-transparent' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200'}`}
                >
                  {p.spend}/{p.save}/{p.give}
                </button>
              )
            })}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(['spend', 'save', 'give'] as const).map((jar) => (
              <div key={jar}>
                <Label htmlFor={`jar-${kid.childId}-${jar}`} className="text-xs font-bold capitalize" style={{ color: 'var(--text-secondary)' }}>{jar} %</Label>
                <Input id={`jar-${kid.childId}-${jar}`} value={String(split[jar])} onChange={(e) => set(jar, e.target.value)} inputMode="numeric" className="h-11 text-right tabular-nums" />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className={`text-sm font-semibold tabular-nums ${valid ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              Total {total}%{valid ? '' : ' (needs 100%)'}
            </span>
            <Button size="sm" variant="gradient" onClick={save} disabled={!valid || busy !== null} className="ml-auto font-bold">
              {on ? 'Save split' : 'Turn on jars'}
            </Button>
            {editing && <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="font-semibold">Change split</Button>
          {!donation && (
            <Button size="sm" variant="outline" onClick={() => setDonation({ amount: '', to: '' })} disabled={kid.balance.jars.giveCents <= 0} className="font-semibold">
              <Heart className="w-4 h-4 mr-1" /> Record a donation
            </Button>
          )}
        </div>
      )}

      {donation && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg p-3" style={{ background: 'var(--bg-secondary)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Gave</span>
          <MoneyInput id={`donate-${kid.childId}`} value={donation.amount} onChange={(v) => setDonation((d) => d && { ...d, amount: v })} currency={currency} label="Donation amount" />
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>to</span>
          <Input value={donation.to} onChange={(e) => setDonation((d) => d && { ...d, to: e.target.value.slice(0, 60) })} placeholder="the animal shelter" aria-label="Where it went" className="flex-1 min-w-[160px] h-11" />
          <Button size="sm" variant="gradient" onClick={donate} disabled={busy !== null} className="font-bold">Save</Button>
          <Button size="sm" variant="ghost" onClick={() => setDonation(null)} aria-label="Cancel"><X className="w-4 h-4" /></Button>
          <p className="w-full text-xs" style={{ color: 'var(--text-secondary)' }}>Up to {formatMoney(Math.max(0, kid.balance.jars.giveCents), currency)} in the Give jar.</p>
        </div>
      )}
    </Card>
  )
}

/* ---------------------------------------------------------------------- */

function ScheduleCard({ kid, currency, busy, post }: { kid: KidMoney; currency: string; busy: string | null; post: Post }) {
  const s = kid.schedule
  const [weekday, setWeekday] = useState(s.paydayWeekday)
  const [amount, setAmount] = useState(s.allowanceCents ? (s.allowanceCents / 100).toFixed(2) : '')
  const [useThreshold, setUseThreshold] = useState(s.thresholdPct !== null)
  const [threshold, setThreshold] = useState(String(s.thresholdPct ?? 80))
  const [interest, setInterest] = useState(s.interestBps ? String(s.interestBps / 100) : '')
  const jarsOn = kid.balance.jars.enabled

  const save = async () => {
    const allowanceCents = amount.trim() ? amountToCents(amount) : 0
    if (allowanceCents === null || allowanceCents > 100_000) {
      toast.error('Enter a weekly amount, or leave it empty for none')
      return
    }
    const pct = Number(threshold)
    if (useThreshold && (!Number.isInteger(pct) || pct < 1 || pct > 100)) {
      toast.error('The chore threshold is a whole percent from 1 to 100')
      return
    }
    const rate = interest.trim() ? Number(interest) : 0
    const bps = Math.round(rate * 100)
    if (!Number.isFinite(rate) || bps < 0 || bps > INTEREST_MAX_BPS) {
      toast.error(`Interest is between 0% and ${formatRate(INTEREST_MAX_BPS)} a week`)
      return
    }
    const feature: MoneyFeature = bps > 0 && allowanceCents === 0 ? 'interest' : 'allowance'
    await post(
      'schedule',
      { paydayWeekday: weekday, allowanceCents, thresholdPct: useThreshold ? pct : null, interestBps: jarsOn ? bps : 0 },
      feature,
      'Payday saved'
    )
  }

  return (
    <Card icon={<CalendarClock className="w-4 h-4" />} title="Weekly allowance and interest">
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        Paid automatically on payday in your family&apos;s timezone. Next payday: <strong style={{ color: 'var(--text-primary)' }}>{shortDate(s.nextPayday)}</strong>.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`payday-${kid.childId}`} className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>Payday</Label>
          <select
            id={`payday-${kid.childId}`}
            value={weekday}
            onChange={(e) => setWeekday(Number(e.target.value))}
            className="w-full h-11 rounded-lg border px-2 bg-transparent text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
          >
            {DAY_LONG.map((d, i) => <option key={d} value={i}>{d}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`allowance-${kid.childId}`} className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>Weekly allowance (empty for none)</Label>
          <MoneyInput id={`allowance-${kid.childId}`} value={amount} onChange={setAmount} currency={currency} label="Weekly allowance" />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <CheckRow checked={useThreshold} onChange={setUseThreshold}>
          Only pay when {kid.name} did at least
        </CheckRow>
        <Input value={threshold} onChange={(e) => setThreshold(e.target.value.replace(/\D/g, '').slice(0, 3))} disabled={!useThreshold} inputMode="numeric" aria-label="Chore threshold percent" className="w-16 h-9 text-right tabular-nums" />
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>% of chores in the week before payday</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor={`interest-${kid.childId}`} className="text-sm" style={{ color: 'var(--text-secondary)' }}>Interest on Save:</Label>
        <Input id={`interest-${kid.childId}`} value={interest} onChange={(e) => setInterest(e.target.value.replace(/[^\d.]/g, '').slice(0, 5))} disabled={!jarsOn} inputMode="decimal" placeholder="0" className="w-16 h-9 text-right tabular-nums" />
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>% a week</span>
        <span className="w-full text-xs" style={{ color: 'var(--text-secondary)' }}>
          {jarsOn
            ? `You pay it, on payday, on what's in Save. Up to ${formatRate(INTEREST_MAX_BPS)} and ${formatMoney(INTEREST_MAX_CENTS_PER_WEEK, currency)} a week.`
            : 'Turn on the jars to pay interest on the Save jar.'}
        </span>
      </div>
      <Button size="sm" variant="gradient" onClick={save} disabled={busy !== null} className="font-bold">Save payday</Button>
    </Card>
  )
}

/* ---------------------------------------------------------------------- */

function FinesCard({ kid, currency, busy, post }: { kid: KidMoney; currency: string; busy: string | null; post: Post }) {
  const [fine, setFine] = useState({ amount: '', reason: '', allowNegative: false })
  const [repay, setRepay] = useState({ title: '', amount: '', allowNegative: false })
  const spend = kid.balance.jars.enabled ? kid.balance.jars.spendCents : kid.balance.balanceCents

  const takeFine = async () => {
    const cents = amountToCents(fine.amount)
    if (!cents || cents <= 0 || !fine.reason.trim()) {
      toast.error('Enter an amount and a reason')
      return
    }
    const ok = await post('fine', { amountCents: cents, reason: fine.reason.trim(), allowNegative: fine.allowNegative }, 'fines', `Took ${formatMoney(cents, currency)} off. ${kid.name} will see why.`)
    if (ok) setFine({ amount: '', reason: '', allowNegative: false })
  }
  const addRepay = async () => {
    const cents = amountToCents(repay.amount)
    if (!cents || cents <= 0 || !repay.title.trim()) {
      toast.error('Name it and give it a weekly amount')
      return
    }
    const ok = await post('repayment', { title: repay.title.trim(), amountCents: cents, allowNegative: repay.allowNegative }, 'fines', 'Weekly payback added. It comes out on payday.')
    if (ok) setRepay({ title: '', amount: '', allowNegative: false })
  }

  return (
    <Card icon={<Receipt className="w-4 h-4" />} title="Fines and paybacks">
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        Comes out of {kid.balance.jars.enabled ? 'Spend' : 'the balance'} ({formatMoney(Math.max(0, spend), currency)} now). Never below zero unless you tick the box. {kid.name} sees every one with its reason.
      </p>

      <div className="space-y-2 rounded-lg p-3" style={{ background: 'var(--bg-secondary)' }}>
        <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>One-off</div>
        <div className="flex flex-wrap items-center gap-2">
          <MoneyInput id={`fine-${kid.childId}`} value={fine.amount} onChange={(v) => setFine((f) => ({ ...f, amount: v }))} currency={currency} label="Fine amount" />
          <Input value={fine.reason} onChange={(e) => setFine((f) => ({ ...f, reason: e.target.value.slice(0, 100) }))} placeholder="Left the bike out in the rain" aria-label="Reason" className="flex-1 min-w-[180px] h-11" />
          <Button size="sm" variant="outline" onClick={takeFine} disabled={busy !== null} className="font-semibold">Take it off</Button>
        </div>
        <CheckRow checked={fine.allowNegative} onChange={(v) => setFine((f) => ({ ...f, allowNegative: v }))}>
          Allow going below zero ({kid.name} owes you the rest)
        </CheckRow>
      </div>

      <div className="space-y-2 rounded-lg p-3" style={{ background: 'var(--bg-secondary)' }}>
        <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Pay a parent back, weekly</div>
        {kid.repayments.length > 0 && (
          <ul className="space-y-1">
            {kid.repayments.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
                <span style={{ color: 'var(--text-primary)' }}>
                  {r.title}: <strong className="tabular-nums">{formatMoney(r.amountCents, currency)}</strong> a week
                  {r.allowNegative && <span className="text-xs" style={{ color: 'var(--text-secondary)' }}> (can go below zero)</span>}
                </span>
                <Button size="sm" variant="ghost" onClick={() => void post('repayment-stop', { repaymentId: r.id }, 'fines', `Stopped ${r.title}`)} disabled={busy !== null} className="font-semibold">
                  Stop
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Input value={repay.title} onChange={(e) => setRepay((r) => ({ ...r, title: e.target.value.slice(0, 60) }))} placeholder="Phone bill" aria-label="What it's for" className="flex-1 min-w-[160px] h-11" />
          <MoneyInput id={`repay-${kid.childId}`} value={repay.amount} onChange={(v) => setRepay((r) => ({ ...r, amount: v }))} currency={currency} label="Weekly amount" />
          <Button size="sm" variant="outline" onClick={addRepay} disabled={busy !== null} className="font-semibold">Add</Button>
        </div>
        <CheckRow checked={repay.allowNegative} onChange={(v) => setRepay((r) => ({ ...r, allowNegative: v }))}>
          Take the full amount even if Spend can&apos;t cover it
        </CheckRow>
      </div>
    </Card>
  )
}

/* ---------------------------------------------------------------------- */

function MinutesCard({ kid, busy, post }: { kid: KidMoney; busy: string | null; post: Post }) {
  const [custom, setCustom] = useState('')
  const m = kid.minutes
  if (!m.available) return null

  const use = async (minutes: number) => {
    if (!Number.isInteger(minutes) || minutes <= 0) return
    const ok = await post('minutes-use', { minutes }, 'minutes', `Marked ${formatMinutes(minutes)} used`)
    if (ok) setCustom('')
  }
  const setReward = async (target: 'chore' | 'routine', id: string, raw: string, current: number) => {
    const minutes = Math.min(600, Math.max(0, Number(raw.replace(/\D/g, '')) || 0))
    if (minutes === current) return
    await post('minutes-reward', { target, id, minutes }, 'minutes')
  }

  return (
    <Card
      icon={<Timer className="w-4 h-4" />}
      title="Screen-time minutes"
      aside={<span className="text-sm font-black tabular-nums" style={{ color: 'var(--text-primary)' }}>{formatMinutes(m.balance)} banked</span>}
    >
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        A second reward next to money. Chores and routines with minutes add to {kid.name}&apos;s bank when they&apos;re done; you mark minutes used. ChoreStar doesn&apos;t lock any device.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Used:</span>
        {MINUTES_USE_PRESETS.map((n) => (
          <Button key={n} size="sm" variant="outline" onClick={() => void use(n)} disabled={busy !== null || m.balance < n} className="font-semibold tabular-nums">
            {n} min
          </Button>
        ))}
        <Input value={custom} onChange={(e) => setCustom(e.target.value.replace(/\D/g, '').slice(0, 3))} inputMode="numeric" placeholder="min" aria-label="Minutes used" className="w-20 h-11 text-right tabular-nums" />
        <Button size="sm" variant="outline" onClick={() => void use(Number(custom))} disabled={busy !== null || !custom} className="font-semibold">Mark used</Button>
      </div>

      {(m.chores.length > 0 || m.routines.length > 0) && (
        <details className="rounded-lg p-3" style={{ background: 'var(--bg-secondary)' }}>
          <summary className="cursor-pointer text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Minutes per chore and routine</summary>
          <p className="mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            Set a chore&apos;s money to 0 in its edit screen for minutes only.
          </p>
          <ul className="mt-2 space-y-1.5">
            {[...m.chores.map((c) => ({ ...c, target: 'chore' as const })), ...m.routines.map((r) => ({ ...r, target: 'routine' as const, rewardCents: undefined }))].map((item) => (
              <li key={`${item.target}-${item.id}`} className="flex items-center gap-2 text-sm">
                <span className="flex-1 min-w-0 truncate" style={{ color: 'var(--text-primary)' }}>
                  {item.name}
                  {item.target === 'routine' && <span className="text-xs" style={{ color: 'var(--text-secondary)' }}> (routine)</span>}
                </span>
                <Input
                  defaultValue={item.minutes ? String(item.minutes) : ''}
                  onBlur={(e) => void setReward(item.target, item.id, e.target.value, item.minutes)}
                  inputMode="numeric"
                  placeholder="0"
                  aria-label={`Minutes for ${item.name}`}
                  className="w-16 h-9 text-right tabular-nums"
                />
                <span className="text-xs w-7" style={{ color: 'var(--text-secondary)' }}>min</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  )
}
