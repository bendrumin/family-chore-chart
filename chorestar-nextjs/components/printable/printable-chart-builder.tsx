'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Download, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { exportWeeklyTemplate, type WeeklyTemplateStyle } from '@/lib/utils/export'
import { generateSuggestions } from '@/lib/utils/chore-suggestions'
import { appStoreLink } from '@/lib/utils/app-store-link'

/**
 * The free chart on /printable-chore-chart: a name, an age that fills in
 * starter chores, and the same jsPDF template the dashboard prints. No account,
 * nothing leaves the browser. The PDF footer points back at chorestar.app, so a
 * chart on the fridge keeps advertising after the tab is closed.
 */

// One page holds about ten rows before the reward box runs off the bottom.
const MAX_CHORES = 10

const AGES = [
  { label: 'Ages 3 to 5', age: 4 },
  { label: '6 to 8', age: 7 },
  { label: '9 to 12', age: 10 },
  { label: '13 and up', age: 14 },
]

const STYLES: { style: WeeklyTemplateStyle; label: string; swatch: string }[] = [
  { style: 'stars', label: 'Stars', swatch: 'bg-indigo-500' },
  { style: 'rainbow', label: 'Rainbow', swatch: 'bg-pink-500' },
  { style: 'minimal', label: 'Minimal', swatch: 'bg-gray-800 dark:bg-gray-300' },
]

interface Row {
  id: number
  name: string
  dollars: string
}

let nextId = 0
function choresForAge(age: number): Row[] {
  return generateSuggestions({ childName: '', childAge: age, existingChoreNames: [], completionRate: 0 }, 6).map((s) => ({
    id: nextId++,
    name: s.name,
    dollars: (s.rewardCents / 100).toFixed(2),
  }))
}

export function PrintableChartBuilder() {
  const [name, setName] = useState('')
  const [age, setAge] = useState(7)
  const [rows, setRows] = useState<Row[]>([])
  const [withRewards, setWithRewards] = useState(false)
  const [style, setStyle] = useState<WeeklyTemplateStyle>('stars')
  const [busy, setBusy] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

  // After mount: the suggestions shift with the date, which could differ
  // between the server render and the browser.
  useEffect(() => setRows(choresForAge(7)), [])

  const pickAge = (a: number) => {
    setAge(a)
    setRows(choresForAge(a))
  }
  const update = (id: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  async function download() {
    const chores = rows
      .filter((r) => r.name.trim())
      .map((r) => ({
        child_id: 'kid',
        name: r.name.trim(),
        reward_cents: withRewards ? Math.max(0, Math.round((parseFloat(r.dollars) || 0) * 100)) : 0,
        days_of_week: [0, 1, 2, 3, 4, 5, 6],
      }))
    if (!chores.length) {
      toast.error('Add at least one chore first')
      return
    }
    setBusy(true)
    try {
      await exportWeeklyTemplate({
        children: [{ id: 'kid', name: name.trim() || 'My' }],
        chores,
        childId: 'kid',
        weekStart: null,
        currencyCode: 'USD',
        style,
        footerNote: 'Kids can check these off on their own, free at chorestar.app',
      })
      setDownloaded(true)
      ;(window as any).gtag?.('event', 'printable_chart_download', { style, chores: chores.length, rewards: withRewards })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not make the PDF')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 sm:p-8 space-y-7">
      <div>
        <label htmlFor="kid-name" className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
          Kid&apos;s name
        </label>
        <input
          id="kid-name"
          value={name}
          maxLength={20}
          onChange={(e) => setName(e.target.value)}
          placeholder="Maya"
          className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-3 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <fieldset>
        <legend className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Starter chores for</legend>
        <div className="flex flex-wrap gap-2">
          {AGES.map((a) => (
            <button
              key={a.age}
              type="button"
              aria-pressed={age === a.age}
              onClick={() => pickAge(a.age)}
              className={
                age === a.age
                  ? 'px-4 py-2 rounded-full text-sm font-semibold accent-fill'
                  : 'px-4 py-2 rounded-full text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
              }
            >
              {a.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <div className="flex items-center justify-between gap-4 mb-2">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Chores</h2>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={withRewards}
              onChange={(e) => setWithRewards(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 accent-indigo-600"
            />
            Show allowance per chore
          </label>
        </div>
        <ul className="space-y-2">
          {rows.map((r, i) => (
            <li key={r.id} className="flex items-center gap-2">
              <input
                aria-label={`Chore ${i + 1}`}
                value={r.name}
                maxLength={30}
                onChange={(e) => update(r.id, { name: e.target.value })}
                className="flex-1 min-w-0 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {withRewards && (
                <div className="relative w-24 shrink-0">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400" aria-hidden="true">$</span>
                  <input
                    aria-label={`Allowance for chore ${i + 1}`}
                    inputMode="decimal"
                    value={r.dollars}
                    onChange={(e) => update(r.id, { dollars: e.target.value.replace(/[^\d.]/g, '') })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 pl-7 pr-2 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}
              <button
                type="button"
                aria-label={`Remove ${r.name || `chore ${i + 1}`}`}
                onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}
                className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        {rows.length < MAX_CHORES ? (
          <button
            type="button"
            onClick={() => setRows((rs) => [...rs, { id: nextId++, name: '', dollars: '0.25' }])}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add a chore
          </button>
        ) : (
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Ten chores fill the page.</p>
        )}
      </div>

      <fieldset>
        <legend className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Style</legend>
        <div className="flex flex-wrap gap-2">
          {STYLES.map((s) => (
            <button
              key={s.style}
              type="button"
              aria-pressed={style === s.style}
              onClick={() => setStyle(s.style)}
              className={
                style === s.style
                  ? 'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border-2 border-indigo-600 dark:border-indigo-400 text-gray-900 dark:text-white'
                  : 'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
              }
            >
              <span className={`h-3 w-3 rounded-full ${s.swatch}`} aria-hidden="true" />
              {s.label}
            </button>
          ))}
        </div>
      </fieldset>

      <Button size="lg" onClick={download} disabled={busy} className="w-full sm:w-auto">
        <Download className="h-5 w-5" aria-hidden="true" />
        {busy ? 'Making your chart...' : 'Download the PDF'}
      </Button>

      {downloaded && (
        <div role="status" className="rounded-xl bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 p-5">
          <p className="font-semibold text-gray-900 dark:text-white mb-1">Printed. Want it to keep score for you?</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            In ChoreStar, {name.trim() || 'your kid'} checks these off on any phone or tablet with a 4-digit PIN, and the
            allowance adds itself up. Free for up to 3 kids.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-bold accent-fill accent-fill-hover"
            >
              Start free
            </Link>
            <a
              href={appStoreLink('printable')}
              className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-bold border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Get the iPhone app
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
