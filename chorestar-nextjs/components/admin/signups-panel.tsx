'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { SignupsReport } from '@/lib/admin/signups'

const cardClass = 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm backdrop-blur-none'
// One hue for every magnitude mark: indigo-500 passes the lightness and 3:1
// contrast checks on both the white and the gray-800 card.
const BAR = 'bg-indigo-500'

function timeAgo(iso: string | null): string {
  if (!iso) return '—'
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 48) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

const shortDate = (ymd: string) =>
  new Date(`${ymd}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

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

/** Signups per day, last 30 days. Single series: no legend, the title names it. */
function DailyChart({ daily }: { daily: SignupsReport['daily'] }) {
  const [active, setActive] = useState<number | null>(null)
  const max = Math.max(1, ...daily.map((d) => d.count))
  const ticks = [0, Math.floor((daily.length - 1) / 2), daily.length - 1]
  return (
    <Card className={cardClass}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-gray-900 dark:text-white">Signups per day, last 30 days</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="absolute left-0 top-0 text-xs text-gray-400 dark:text-gray-500">{max}</div>
          <div
            className="flex h-40 items-end gap-[2px] border-b border-gray-200 pl-6 dark:border-gray-700"
            onMouseLeave={() => setActive(null)}
          >
            {daily.map((d, i) => (
              <button
                key={d.date}
                type="button"
                aria-label={`${shortDate(d.date)}: ${d.count} signup${d.count === 1 ? '' : 's'}`}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                // The hit target is the whole column, not just the bar.
                className="relative flex h-full flex-1 items-end focus-visible:outline-none"
              >
                <span
                  className={`block w-full rounded-t-[4px] ${BAR} ${active === i ? 'opacity-100' : active === null ? 'opacity-90' : 'opacity-50'}`}
                  style={{ height: d.count ? `${(d.count / max) * 100}%` : 0 }}
                />
                {active === i && (
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-900 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
                    <span className="font-semibold">{d.count}</span> on {shortDate(d.date)}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="relative mt-1 h-4 pl-6 text-xs text-gray-400 dark:text-gray-500">
            {ticks.map((i) => (
              <span
                key={i}
                // Edge labels hug the ends so they never clip or wrap.
                className={`absolute whitespace-nowrap ${i === 0 ? '' : i === daily.length - 1 ? '-translate-x-full' : '-translate-x-1/2'}`}
                style={{
                  left: i === daily.length - 1 ? '100%' : `calc(1.5rem + (100% - 1.5rem) * ${i === 0 ? 0 : (i + 0.5) / daily.length})`,
                }}
              >
                {shortDate(daily[i].date)}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function Breakdown({ title, rows, note }: { title: string; rows: { label: string; count: number }[]; note?: string }) {
  const total = rows.reduce((s, r) => s + r.count, 0)
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <Card className={cardClass}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-gray-900 dark:text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">None yet</p>
        ) : (
          <ul className="space-y-2">
            {rows.slice(0, 8).map((r) => (
              <li key={r.label} title={`${r.label}: ${r.count} of ${total}`}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate text-gray-900 dark:text-gray-100">{r.label}</span>
                  <span className="shrink-0 tabular-nums text-gray-500 dark:text-gray-400">
                    {r.count} · {Math.round((100 * r.count) / total)}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700">
                  <div className={`h-1.5 rounded-full ${BAR}`} style={{ width: `${(100 * r.count) / max}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
        {note && <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">{note}</p>}
      </CardContent>
    </Card>
  )
}

export function SignupsPanel({ data, loading, onRefresh }: { data: SignupsReport | null; loading: boolean; onRefresh: () => void }) {
  if (loading && !data) return <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
  if (!data) return <p className="text-sm text-amber-700 dark:text-amber-300">Could not load signups.</p>

  const { counts } = data
  const activatedPct = counts.d30 ? Math.round((100 * counts.activated30) / counts.d30) : 0
  const since = data.attributedSince ? shortDate(data.attributedSince.slice(0, 10)) : null

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Today" value={counts.today} />
        <Stat label="Last 7 days" value={counts.d7} />
        <Stat label="Last 30 days" value={counts.d30} />
        <Stat label="Added a kid, 30d" value={`${activatedPct}%`} sub={`${counts.activated30} of ${counts.d30}`} />
      </div>

      <DailyChart daily={data.daily} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Breakdown title="Platform, 30d" rows={data.byPlatform} />
        <Breakdown title="Sign-in method, 30d" rows={data.byMethod} />
        <Breakdown
          title="Source, 30d"
          rows={data.bySource}
          note={since ? `Platform and source are recorded for signups since ${since}.` : undefined}
        />
      </div>

      <Card className={cardClass}>
        <CardHeader>
          <CardTitle className="text-base text-gray-900 dark:text-white">Latest {data.recent.length} signups</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500 dark:border-gray-700 dark:text-gray-400">
                <th className="pb-2 pr-4 font-medium">Signed up</th>
                <th className="pb-2 pr-4 font-medium">Family</th>
                <th className="pb-2 pr-4 font-medium">Platform</th>
                <th className="pb-2 pr-4 font-medium">Method</th>
                <th className="pb-2 pr-4 font-medium">Source</th>
                <th className="pb-2 pr-4 text-right font-medium">Kids</th>
                <th className="pb-2 pr-4 text-right font-medium">Chores done</th>
                <th className="pb-2 pr-4 font-medium">Last sign-in</th>
                <th className="pb-2 font-medium">Plan</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.map((r) => (
                <tr key={r.userId} className="border-b border-gray-100 align-top dark:border-gray-800">
                  <td className="whitespace-nowrap py-2 pr-4 text-gray-700 dark:text-gray-300" title={new Date(r.createdAt).toLocaleString()}>
                    {timeAgo(r.createdAt)}
                  </td>
                  <td className="py-2 pr-4">
                    <div className="font-medium text-gray-900 dark:text-white">{r.familyName}</div>
                    <div className="max-w-[16rem] truncate text-xs text-gray-500 dark:text-gray-400">{r.email}</div>
                  </td>
                  <td className="whitespace-nowrap py-2 pr-4 text-gray-700 dark:text-gray-300">{r.platform}</td>
                  <td className="whitespace-nowrap py-2 pr-4 text-gray-700 dark:text-gray-300">{r.method}</td>
                  <td className="py-2 pr-4 text-gray-700 dark:text-gray-300" title={r.landing ? `Landed on ${r.landing}` : undefined}>
                    {r.source}
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums text-gray-700 dark:text-gray-300">{r.kids}</td>
                  <td className="py-2 pr-4 text-right tabular-nums text-gray-700 dark:text-gray-300">{r.choresDone}</td>
                  <td className="whitespace-nowrap py-2 pr-4 text-gray-700 dark:text-gray-300">{timeAgo(r.lastSignInAt)}</td>
                  <td className="py-2 text-gray-700 dark:text-gray-300">{r.plan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
