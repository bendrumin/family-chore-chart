'use client'

import { useCallback, useEffect, useState } from 'react'
import { Wallet, Crown, PiggyBank, CalendarClock, Percent, Receipt, Timer, Lock } from 'lucide-react'
import { useSettings } from '@/lib/contexts/settings-context'
import { formatMoney } from '@/lib/constants/currencies'
import { PremiumGate, openPremiumGate } from '@/components/settings/premium-gate'
import { useAndroidShell } from '@/lib/utils/platform'
import { playBillingAvailable } from '@/lib/utils/play-billing-client'
import type { MoneyFeature } from '@/lib/utils/money'
import { KidMoneyPanel, type KidMoney } from '@/components/settings/money/kid-money-panel'

interface MoneyResponse {
  premium: boolean
  currencyCode: string
  timezone: string
  ready: boolean
  kids: Array<KidMoney | { childId: string; name: string }>
}

/**
 * Settings > Rewards > Money (Premium, migration 030): each kid's jars,
 * weekly allowance, interest, fines and paybacks, and screen-time minutes.
 * Everything reads and writes through /api/money; balances are derived on the
 * server (lib/utils/wallet.ts). Free families see a preview that sells it,
 * with one paywall source per feature.
 */
export function MoneySection({ onChanged }: { onChanged?: () => void } = {}) {
  const { settings } = useSettings()
  const familyId = settings?.user_id ?? null
  const [data, setData] = useState<MoneyResponse | null>(null)
  const [failed, setFailed] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!familyId) return
    try {
      const res = await fetch(`/api/money?familyId=${familyId}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(String(res.status))
      const json = (await res.json()) as MoneyResponse
      setData(json)
      setFailed(false)
      setSelected((s) => s ?? json.kids[0]?.childId ?? null)
    } catch {
      setFailed(true)
    }
  }, [familyId])

  useEffect(() => { void load() }, [load])

  const replaceKid = (kid: KidMoney) => {
    setData((d) => (d ? { ...d, kids: d.kids.map((k) => (k.childId === kid.childId ? kid : k)) } : d))
    // Goals below fill from Save once jars are on: let the tab refresh them.
    onChanged?.()
  }

  if (!familyId) return null

  return (
    <section className="space-y-4" aria-labelledby="money-title">
      <div className="flex items-center gap-2">
        <Wallet className="w-5 h-5" style={{ color: 'var(--primary)' }} />
        <h3 id="money-title" className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Money</h3>
        <span className="ml-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
          <Crown className="w-3 h-3" /> Premium
        </span>
      </div>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        Spend, Save and Give jars, a weekly allowance, interest on savings, fines and paybacks, and screen-time minutes. Each kid gets their own settings.
      </p>

      {failed ? (
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Could not load money settings. Try again in a moment.</p>
      ) : !data ? (
        <div className="h-40 rounded-xl animate-pulse bg-gray-100 dark:bg-gray-800" />
      ) : !data.premium ? (
        <MoneyPreview currency={data.currencyCode} />
      ) : !data.ready ? (
        <p className="rounded-xl border p-4 text-sm" style={{ borderColor: 'hsl(var(--border))', color: 'var(--text-secondary)' }}>
          Money tools are being set up. Check back soon.
        </p>
      ) : data.kids.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Add a child first.</p>
      ) : (
        <div className="space-y-4">
          {data.kids.length > 1 && (
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Choose a child">
              {data.kids.map((k) => (
                <button
                  key={k.childId}
                  type="button"
                  role="tab"
                  aria-selected={selected === k.childId}
                  onClick={() => setSelected(k.childId)}
                  className={`min-h-[40px] px-4 rounded-full text-sm font-semibold border transition-colors ${
                    selected === k.childId
                      ? 'accent-fill border-transparent'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                  }`}
                >
                  {k.name}
                </button>
              ))}
            </div>
          )}
          {data.kids
            .filter((k): k is KidMoney => 'balance' in k && k.childId === selected)
            .map((kid) => (
              <KidMoneyPanel key={kid.childId} kid={kid} currency={data.currencyCode} onChanged={replaceKid} />
            ))}
        </div>
      )}
    </section>
  )
}

const PREVIEW_FEATURES: Array<{ feature: MoneyFeature; icon: typeof Wallet; title: string; body: string }> = [
  { feature: 'jars', icon: PiggyBank, title: 'Spend, Save, Give jars', body: 'Every cent earned splits 70/20/10, or whatever you pick.' },
  { feature: 'allowance', icon: CalendarClock, title: 'Weekly allowance', body: 'Paid on your day, optionally only at 80% of chores.' },
  { feature: 'interest', icon: Percent, title: 'Interest on Save', body: 'A small weekly % so saving visibly pays.' },
  { feature: 'fines', icon: Receipt, title: 'Fines and paybacks', body: '"Phone bill, $2 a week." Never below zero unless you say so.' },
  { feature: 'minutes', icon: Timer, title: 'Screen-time minutes', body: 'Chores earn minutes too. You mark them used.' },
]

/** What a free family sees: a sample kid's jars and the five tools, each a way into Billing. */
function MoneyPreview({ currency }: { currency: string }) {
  const androidShell = useAndroidShell()
  const canSell = !androidShell || playBillingAvailable()
  const money = (c: number) => formatMoney(c, currency)
  return (
    <div className="space-y-4">
      <div className="relative rounded-xl border p-4" style={{ background: 'var(--card-bg)', borderColor: 'hsl(var(--border))' }} aria-hidden>
        <div className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--text-secondary)' }}>Example: Maya, 9</div>
        <div className="grid grid-cols-3 gap-2">
          <PreviewJar label="Spend" amount={money(1240)} className="bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200" />
          <PreviewJar label="Save" amount={money(860)} className="bg-sky-50 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200" />
          <PreviewJar label="Give" amount={money(310)} className="bg-rose-50 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200" />
        </div>
        <ul className="mt-3 space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <li>+{money(500)} weekly allowance, Saturday (92% of chores done)</li>
          <li>+{money(17)} interest on Save</li>
          <li>-{money(200)} phone bill</li>
          <li>+45 min screen time this week</li>
        </ul>
        <div className="absolute top-3 right-3 text-gray-400 dark:text-gray-500"><Lock className="w-4 h-4" /></div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {PREVIEW_FEATURES.map(({ feature, icon: Icon, title, body }) => {
          const content = (
            <>
              <Icon className="w-5 h-5 shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" />
              <span className="min-w-0">
                <span className="block text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{title}</span>
                <span className="block text-xs" style={{ color: 'var(--text-secondary)' }}>{body}</span>
              </span>
            </>
          )
          return canSell ? (
            <button
              key={feature}
              type="button"
              onClick={() => openPremiumGate(feature)}
              className="flex items-start gap-3 rounded-xl border p-3 text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
              style={{ borderColor: 'hsl(var(--border))' }}
            >
              {content}
            </button>
          ) : (
            <div key={feature} className="flex items-start gap-3 rounded-xl border p-3" style={{ borderColor: 'hsl(var(--border))' }}>
              {content}
            </div>
          )
        })}
      </div>

      <PremiumGate feature="jars" compact />
    </div>
  )
}

function PreviewJar({ label, amount, className }: { label: string; amount: string; className: string }) {
  return (
    <div className={`rounded-xl px-3 py-2 ${className}`}>
      <div className="text-xs font-bold">{label}</div>
      <div className="text-lg font-black tabular-nums">{amount}</div>
    </div>
  )
}
