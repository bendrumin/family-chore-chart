'use client'

import { useEffect, useState } from 'react'
import { CalendarDays, ListChecks } from 'lucide-react'
import { useSettings } from '@/lib/contexts/settings-context'
import { DEFAULT_DAILY_REWARD_CENTS } from '@/lib/utils/earnings'

type Mode = 'flat' | 'per_chore'

const PRESET_CENTS = [50, 100, 200, 500]

function symbolFor(code: string | null | undefined): string {
  switch (code) {
    case 'GBP': return '£'
    case 'EUR': return '€'
    case 'JPY': case 'CNY': return '¥'
    case 'INR': return '₹'
    case 'KRW': return '₩'
    case 'BRL': return 'R$'
    case 'CHF': return 'Fr'
    default: return '$'
  }
}

function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2)
}

function inputToCents(text: string): number | null {
  const n = parseFloat(text.replace(/[^0-9.]/g, ''))
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100)
}

/**
 * Onboarding step where a new family decides how rewards work, instead of
 * inheriting a default that meant nothing to them. Saves straight to
 * family_settings as they go; Settings > Family edits the same fields later.
 */
export function RewardsSetupStep() {
  const { settings, updateSettings } = useSettings()
  const [mode, setMode] = useState<Mode>('flat')
  const [amountText, setAmountText] = useState(centsToInput(DEFAULT_DAILY_REWARD_CENTS))
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // Settings can arrive after first render; mirror them once they do.
  useEffect(() => {
    if (!settings) return
    setMode((settings.reward_mode as Mode) || 'flat')
    setAmountText(centsToInput(settings.daily_reward_cents ?? DEFAULT_DAILY_REWARD_CENTS))
  }, [settings?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (next: { mode?: Mode; cents?: number }) => {
    const rewardMode = next.mode ?? mode
    const cents = next.cents ?? inputToCents(amountText) ?? DEFAULT_DAILY_REWARD_CENTS
    setStatus('saving')
    try {
      await updateSettings({ reward_mode: rewardMode, daily_reward_cents: cents })
      setStatus('saved')
    } catch {
      setStatus('error')
    }
  }

  const chooseMode = (m: Mode) => {
    setMode(m)
    void save({ mode: m })
  }

  const commitAmount = () => {
    const cents = inputToCents(amountText)
    if (cents == null) {
      setAmountText(centsToInput(DEFAULT_DAILY_REWARD_CENTS))
      return
    }
    setAmountText(centsToInput(cents))
    void save({ cents })
  }

  const symbol = symbolFor(settings?.currency_code)
  const currentCents = inputToCents(amountText)

  const cardBase =
    'w-full text-left p-5 rounded-xl border-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400'
  const cardOn = 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 dark:border-indigo-400'
  const cardOff = 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 bg-white dark:bg-gray-800'

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" aria-pressed={mode === 'flat'} onClick={() => chooseMode('flat')} className={`${cardBase} ${mode === 'flat' ? cardOn : cardOff}`}>
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <span className="font-bold text-gray-900 dark:text-gray-100">One daily amount</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Kids earn a set amount for each day they finish all their chores. Simple and predictable.
          </p>
        </button>
        <button type="button" aria-pressed={mode === 'per_chore'} onClick={() => chooseMode('per_chore')} className={`${cardBase} ${mode === 'per_chore' ? cardOn : cardOff}`}>
          <div className="flex items-center gap-2 mb-1">
            <ListChecks className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <span className="font-bold text-gray-900 dark:text-gray-100">An amount per chore</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Each chore has its own reward, so bigger jobs can be worth more. You set it when you add a chore.
          </p>
        </button>
      </div>

      {mode === 'flat' ? (
        <div className="p-5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
          <label htmlFor="onboarding-daily-amount" className="block font-bold text-gray-900 dark:text-gray-100 mb-3">
            How much per day?
          </label>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {PRESET_CENTS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => { setAmountText(centsToInput(c)); void save({ cents: c }) }}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                  currentCents === c
                    ? 'accent-fill border-transparent'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-indigo-400'
                }`}
              >
                {symbol}{centsToInput(c)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">{symbol}</span>
            <input
              id="onboarding-daily-amount"
              type="text"
              inputMode="decimal"
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
              onBlur={commitAmount}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitAmount() } }}
              className="w-28 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-semibold"
              aria-describedby="onboarding-daily-hint"
            />
            <span id="onboarding-daily-hint" className="text-sm text-gray-500 dark:text-gray-400">per day, when every chore is done</span>
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
          You will pick an amount on each chore as you add it. Most families use {symbol}0.10 to {symbol}0.50 for everyday chores and more for big jobs.
        </div>
      )}

      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-between">
        <span>You can change this anytime in Settings &gt; Family.</span>
        <span className={status === 'error' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'} aria-live="polite">
          {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : status === 'error' ? 'Could not save, try again' : ''}
        </span>
      </p>
    </div>
  )
}
