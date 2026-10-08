'use client'

import { RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Channel, RevenueReport, SubStatus } from '@/lib/admin/revenue'

const cardClass = 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm backdrop-blur-none'

const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
const money = (amount: number, currency: string) => {
  try {
    return amount.toLocaleString('en-US', { style: 'currency', currency })
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}
const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

const CHANNEL: Record<Channel, string> = { apple: 'Apple', stripe: 'Stripe (web)', google: 'Google Play' }

const STATUS_CLASS: Record<SubStatus, string> = {
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  'auto-renew off': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  'billing retry': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  'grace period': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  expired: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  revoked: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card className={cardClass}>
      <CardContent className="pt-6">
        <div className="text-2xl font-black text-gray-900 dark:text-white">{value}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
        {sub && <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">{sub}</div>}
      </CardContent>
    </Card>
  )
}

const th = 'py-2 pr-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap'
const td = 'py-2 pr-4 text-gray-900 dark:text-gray-100 whitespace-nowrap'
const tdMuted = 'py-2 pr-4 text-gray-500 dark:text-gray-400 whitespace-nowrap'

export function RevenuePanel({
  data,
  loading,
  onRefresh,
}: {
  data: RevenueReport | null
  loading: boolean
  onRefresh: () => void
}) {
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Revenue</h2>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading && !data ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Asking Apple and Stripe…</p>
      ) : !data ? (
        <p className="text-sm text-amber-700 dark:text-amber-300">Revenue is unavailable right now.</p>
      ) : (
        <>
          {data.notes.length > 0 && (
            <ul className="space-y-1 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-800 dark:text-amber-300">
              {data.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Stat label="Customers paid, all time" value={`≈ ${usd(data.totals.grossUsd)}`} sub="gross, before Apple's cut" />
            <Stat label="This month" value={`≈ ${usd(data.totals.thisMonthUsd)}`} />
            <Stat label="Recurring per month" value={`≈ ${usd(data.totals.mrrUsd)}`} sub="renewing subscriptions" />
            <Stat label="Your share, est." value={`≈ ${usd(data.totals.estProceedsUsd)}`} sub="Apple 85%, Stripe less fees" />
            <Stat label="Paying families" value={data.totals.payingFamilies} sub={`${data.comped.length} comped`} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className={cardClass}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-gray-900 dark:text-white">By currency</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {data.byCurrency.map((c) => (
                    <li key={c.currency} className="flex justify-between gap-2">
                      <span className="text-gray-500 dark:text-gray-400">{c.currency}</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{money(c.amount, c.currency)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
                  USD figures use approximate fixed rates; these are exact.
                </p>
              </CardContent>
            </Card>
            <Card className={cardClass}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-gray-900 dark:text-white">By channel</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {data.byChannel.map((c) => (
                    <li key={c.channel} className="flex justify-between gap-2">
                      <span className="text-gray-500 dark:text-gray-400">
                        {CHANNEL[c.channel]} · {c.purchases} payment{c.purchases === 1 ? '' : 's'}
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white">≈ {usd(c.grossUsd)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card className={cardClass}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-gray-900 dark:text-white">Subscribers</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {data.subscribers.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">None yet</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className={th}>Family</th>
                      <th className={th}>Plan</th>
                      <th className={th}>Price</th>
                      <th className={th}>Where</th>
                      <th className={th}>Since</th>
                      <th className={th}>Status</th>
                      <th className={th}>Period ends</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.subscribers.map((s) => (
                      <tr key={`${s.channel}-${s.email}-${s.since}`} className="border-b border-gray-100 dark:border-gray-700/60 last:border-0">
                        <td className={td}>
                          <div className="font-medium">{s.family}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{s.email}</div>
                        </td>
                        <td className={td}>{s.plan}</td>
                        <td className={td}>{money(s.price, s.currency)}</td>
                        <td className={tdMuted}>{CHANNEL[s.channel]}{s.country ? ` · ${s.country}` : ''}</td>
                        <td className={tdMuted}>{day(s.since)}</td>
                        <td className={td}>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CLASS[s.status]}`}>{s.status}</span>
                        </td>
                        <td className={tdMuted}>{day(s.periodEnds)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          <Card className={cardClass}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-gray-900 dark:text-white">Every payment</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {data.purchases.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">None yet</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className={th}>Date</th>
                      <th className={th}>Family</th>
                      <th className={th}>What</th>
                      <th className={th}>Paid</th>
                      <th className={th}>≈ USD</th>
                      <th className={th}>Where</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.purchases.map((p, i) => (
                      <tr key={`${p.channel}-${p.date}-${i}`} className="border-b border-gray-100 dark:border-gray-700/60 last:border-0">
                        <td className={tdMuted}>{day(p.date)}</td>
                        <td className={td}>{p.family}</td>
                        <td className={td}>
                          {p.plan} {p.kind === 'renewal' ? 'renewal' : p.kind === 'refunded' ? '(refunded)' : 'purchase'}
                        </td>
                        <td className={`${td} ${p.kind === 'refunded' ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}>
                          {money(p.amount, p.currency)}
                        </td>
                        <td className={tdMuted}>{p.usd == null ? '—' : usd(p.usd)}</td>
                        <td className={tdMuted}>{CHANNEL[p.channel]}{p.country ? ` · ${p.country}` : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {data.comped.length > 0 && (
            <Card className={cardClass}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-gray-900 dark:text-white">Premium without a purchase</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                  Comped, founder or demo accounts. Not counted as paying.
                </p>
                <ul className="space-y-1 text-sm">
                  {data.comped.map((c) => (
                    <li key={c.email} className="flex justify-between gap-2">
                      <span className="text-gray-900 dark:text-gray-100">{c.family}</span>
                      <span className="truncate text-xs text-gray-500 dark:text-gray-400">{c.email}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </section>
  )
}
