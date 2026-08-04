'use client'

import { useState } from 'react'
import { Minus, Plus, Info } from 'lucide-react'
import {
  currencySymbol,
  formatAmount,
  sanitizeAmountInput,
  amountToCents,
  formatMoney,
} from '@/lib/constants/currencies'

/**
 * Reward amount picker for a single chore.
 *
 * Replaces a bare `<input type="number">` that had three problems beyond being
 * fiddly to type into:
 *
 *  1. It was seeded from `daily_reward_cents` — the FLAT DAILY rate, a different
 *     concept entirely. A family with an 8¢ daily rate got every new chore
 *     defaulted to $0.08, while typing "8" meaning 8 cents produced $8.00. Both
 *     of those are in real production data.
 *  2. The `$` was hardcoded, so a family set to GBP still saw dollars.
 *  3. It claimed "child earns this for each completion" even in flat mode, where
 *     per-chore amounts are ignored completely.
 *
 * Everything here is integer cents. The old form kept the amount as a string and
 * ran `Math.round(parseFloat(x) * 100)` on save, which is exactly where
 * fractional-cent drift comes from.
 */

/** Presets in cents. Chosen to span pocket-change to a big one-off job. */
const PRESET_CENTS = [10, 25, 50, 100, 200, 500]

/**
 * Default for a brand-new chore in PER-CHORE mode, in cents.
 *
 * Only used when the amount actually affects earnings. On the flat daily rate the
 * caller seeds from `daily_reward_cents` instead — not because the two are the
 * same quantity (they are not), but because no per-chore figure is meaningful
 * there, and matching the family's daily number is less arbitrary than inventing
 * a different one.
 */
export const DEFAULT_CHORE_REWARD_CENTS = 25

/** Step by 5¢ under a unit, 25¢ above — so small amounts stay reachable. */
function stepFor(cents: number): number {
  return cents < 100 ? 5 : 25
}

const MAX_CENTS = 10_000

interface RewardAmountInputProps {
  /** Current amount in integer cents. */
  valueCents: number
  onChange: (cents: number) => void
  /** Family currency code, e.g. 'USD'. */
  currencyCode?: string | null
  /**
   * False when the family is on the flat daily rate, where this value has no
   * effect on earnings. The input stays editable — the amount is still stored,
   * and switching modes later should not have silently lost it — but the UI says
   * plainly that it isn't being used.
   */
  affectsEarnings: boolean
  /**
   * The family's flat daily rate, in cents. Named in the flat-mode notice so the
   * figure can't be misread as additive — three chores showing 8¢ each invites
   * "24¢ a day", when the day pays 8¢ total however many chores there are.
   */
  dailyRateCents?: number
  id?: string
}

export function RewardAmountInput({
  valueCents,
  onChange,
  currencyCode,
  affectsEarnings,
  dailyRateCents,
  id = 'reward',
}: RewardAmountInputProps) {
  const symbol = currencySymbol(currencyCode)

  /**
   * The text currently being typed, or null when not editing.
   *
   * Needed because the field's canonical text comes from `valueCents`, and
   * formatting that on every keystroke would rewrite "0.0" to "0.00" mid-type,
   * making "0.08" impossible to reach.
   */
  const [draft, setDraft] = useState<string | null>(null)

  const clamp = (c: number) => Math.max(0, Math.min(MAX_CENTS, Math.round(c)))
  // Stepper and presets are canonical values, so they drop any in-progress text.
  const commit = (cents: number) => {
    setDraft(null)
    onChange(clamp(cents))
  }
  const bump = (delta: number) => commit(valueCents + delta)

  return (
    <div className="space-y-3">
      {/* Stepper */}
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          onClick={() => bump(-stepFor(valueCents))}
          disabled={valueCents <= 0}
          aria-label={`Decrease reward by ${stepFor(valueCents)} cents`}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Minus className="h-5 w-5" />
        </button>

        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-gray-500 dark:text-gray-400">
            {symbol}
          </span>
          <input
            id={id}
            /* type="text", NOT type="number". A number input reports
               e.target.value as "" for an intermediate value like "0.", so the
               decimal point is swallowed and 0 . 0 8 arrives as "008" = $8.00. */
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={draft ?? formatAmount(valueCents, currencyCode)}
            onChange={(e) => {
              const clean = sanitizeAmountInput(e.target.value)
              // Hold the raw text while typing. Re-deriving it from cents on
              // every keystroke reformats to 2dp under the cursor, which makes
              // "0.0" unreachable and so "0.08" impossible to type at all.
              setDraft(clean)
              const cents = amountToCents(clean)
              if (cents !== null) onChange(clamp(cents))
            }}
            /* Snap back to canonical formatting only once they're done. */
            onBlur={() => {
              if (draft !== null && amountToCents(draft) === null) onChange(0)
              setDraft(null)
            }}
            className="h-14 w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 pl-10 text-xl font-bold text-gray-900 dark:text-gray-100 transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800"
          />
        </div>

        <button
          type="button"
          onClick={() => bump(stepFor(valueCents))}
          disabled={valueCents >= MAX_CENTS}
          aria-label={`Increase reward by ${stepFor(valueCents)} cents`}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* One-tap presets — the fastest path to a sensible amount. */}
      <div className="flex flex-wrap gap-2">
        {PRESET_CENTS.map((cents) => {
          const selected = cents === valueCents
          return (
            <button
              key={cents}
              type="button"
              onClick={() => commit(cents)}
              aria-pressed={selected}
              className={`rounded-full px-3.5 py-1.5 text-sm font-bold transition-all border-2 ${
                selected
                  ? 'accent-fill border-transparent'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-indigo-300 dark:hover:border-indigo-700'
              }`}
            >
              {symbol}
              {formatAmount(cents, currencyCode)}
            </button>
          )
        })}
      </div>

      {affectsEarnings ? (
        <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          Earned each time this chore is checked off.
        </p>
      ) : (
        /* The old form asserted the per-completion behaviour unconditionally,
           which is how a family on the flat rate ends up with a $8.00 chore
           sitting next to an $0.08 one and no idea why the totals ignore both. */
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 p-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
            Your family is on the <strong>Flat Daily Rate</strong>
            {dailyRateCents !== undefined && (
              <>
                : each child earns{' '}
                <strong>{formatMoney(dailyRateCents, currencyCode)} per day</strong> for
                finishing <em>all</em> of their chores — not per chore
              </>
            )}
            . This amount isn&apos;t used yet, but it&apos;s saved and applies if you
            switch to <strong>Per Chore</strong> in Settings&nbsp;›&nbsp;Family.
          </p>
        </div>
      )}
    </div>
  )
}
