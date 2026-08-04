/**
 * Unit tests for the canonical earnings rules. Run with `npm run test:unit`.
 *
 * These exist because this math was previously reimplemented in four places
 * that disagreed with each other, and a family was shown $3.49 for a day that
 * had actually earned $0.16.
 */
import assert from 'node:assert/strict'
import {
  childDayEarningsCents,
  childWeekEarningsCents,
  isPerfectDay,
  dailyRewardCents,
  DEFAULT_DAILY_REWARD_CENTS,
  type ChoreReward,
  type DayCompletion,
  type EarningsSettings,
} from './earnings'
import {
  formatAmount,
  formatMoney,
  currencySymbol,
  findCurrency,
  sanitizeAmountInput,
  amountToCents,
} from '@/lib/constants/currencies'
import { DEFAULT_CHORE_REWARD_CENTS } from '@/components/chores/reward-amount-input'

const FLAT: EarningsSettings = { reward_mode: 'flat', daily_reward_cents: 8, weekly_bonus_cents: 1 }
const PER: EarningsSettings = { reward_mode: 'per_chore', daily_reward_cents: 8, weekly_bonus_cents: 1 }

const chore = (id: string, cents: number | null): ChoreReward => ({ id, reward_cents: cents })

let passed = 0
let failed = 0
function t(name: string, fn: () => void) {
  try {
    fn()
    passed++
    console.log(`  ok    ${name}`)
  } catch (err) {
    failed++
    console.log(`  FAIL  ${name}`)
    console.log(`        ${(err as Error).message.split('\n')[0]}`)
  }
}
const group = (name: string) => console.log(`\n${name}`)

// The reproduction case, from real account data: two children, all chores done,
// flat mode at 8c/day. Per-chore rewards summed to 349c; the answer is 16c.
const bayla = [chore('b1', 25), chore('b2', 100), chore('b3', 100), chore('b4', 100)]
const levi = [chore('l1', 8), chore('l2', 8), chore('l3', 8)]
const allDone = new Set(['b1', 'b2', 'b3', 'b4', 'l1', 'l2', 'l3'])

group('reward mode selects the rule')

t('flat: a finishing child earns the daily rate, not the sum of their chores', () => {
  const total =
    childDayEarningsCents(bayla, allDone, FLAT) + childDayEarningsCents(levi, allDone, FLAT)
  assert.equal(total, 16)
})

t('per_chore: the same data sums chore rewards', () => {
  const total =
    childDayEarningsCents(bayla, allDone, PER) + childDayEarningsCents(levi, allDone, PER)
  assert.equal(total, 349)
})

t('an unrecognized reward_mode behaves as flat', () => {
  const weird: EarningsSettings = {
    reward_mode: 'something_else',
    daily_reward_cents: 8,
    weekly_bonus_cents: 0,
  }
  assert.equal(childDayEarningsCents(bayla, allDone, weird), 8)
})

group('flat mode requires every chore')

t('a partial day earns nothing', () => {
  assert.equal(childDayEarningsCents(bayla, new Set(['b1', 'b2']), FLAT), 0)
})

t('one chore of many earns nothing', () => {
  assert.equal(childDayEarningsCents(bayla, new Set(['b1']), FLAT), 0)
})

t('a complete day earns the rate once, whatever the chore count', () => {
  assert.equal(childDayEarningsCents(bayla, allDone, FLAT), 8)
  assert.equal(childDayEarningsCents(levi, allDone, FLAT), 8)
})

t('per_chore still pays for a partial day', () => {
  assert.equal(childDayEarningsCents(bayla, new Set(['b1', 'b2']), PER), 125)
})

group('duplicate completion rows cannot inflate anything')

t('a perfect day is chore-id membership, not a row count', () => {
  const dupes: DayCompletion[] = [
    { chore_id: 'b1', day_of_week: 1 },
    { chore_id: 'b1', day_of_week: 1 },
    { chore_id: 'b2', day_of_week: 1 },
    { chore_id: 'b2', day_of_week: 1 },
  ]
  const { perfectDays, earnedCents } = childWeekEarningsCents(bayla, dupes, FLAT)
  assert.equal(perfectDays, 0)
  assert.equal(earnedCents, 0)
})

t('a chore is paid once per day in per_chore mode', () => {
  const dupes: DayCompletion[] = [
    { chore_id: 'b2', day_of_week: 1 },
    { chore_id: 'b2', day_of_week: 1 },
    { chore_id: 'b2', day_of_week: 1 },
  ]
  assert.equal(childWeekEarningsCents(bayla, dupes, PER).earnedCents, 100)
})

group('weekly bonus is gated on a 7/7 week')

const fullWeek = (chores: ChoreReward[]): DayCompletion[] =>
  Array.from({ length: 7 }, (_, d) => chores.map(c => ({ chore_id: c.id, day_of_week: d }))).flat()

t('a perfect week adds the bonus', () => {
  const { earnedCents, perfectDays } = childWeekEarningsCents(levi, fullWeek(levi), FLAT)
  assert.equal(perfectDays, 7)
  assert.equal(earnedCents, 7 * 8 + 1)
})

t('six perfect days get no bonus', () => {
  const rows = fullWeek(levi).filter(r => r.day_of_week !== 3)
  const { earnedCents, perfectDays } = childWeekEarningsCents(levi, rows, FLAT)
  assert.equal(perfectDays, 6)
  assert.equal(earnedCents, 6 * 8)
})

t('the bonus also applies in per_chore mode', () => {
  assert.equal(childWeekEarningsCents(levi, fullWeek(levi), PER).earnedCents, 7 * 24 + 1)
})

group('edges')

t('a child with no chores earns nothing and has no perfect day', () => {
  assert.equal(childDayEarningsCents([], allDone, FLAT), 0)
  assert.equal(isPerfectDay([], new Set()), false)
})

t('a null reward_cents counts as zero', () => {
  assert.equal(childDayEarningsCents([chore('x', null)], new Set(['x']), PER), 0)
})

t('absent settings fall back to the schema default rate', () => {
  assert.equal(dailyRewardCents(null), DEFAULT_DAILY_REWARD_CENTS)
  assert.equal(childDayEarningsCents(levi, allDone, null), DEFAULT_DAILY_REWARD_CENTS)
})

t('rows with a null day_of_week are ignored', () => {
  const rows: DayCompletion[] = levi.map(c => ({ chore_id: c.id, day_of_week: null }))
  assert.equal(childWeekEarningsCents(levi, rows, FLAT).earnedCents, 0)
})


// ---------------------------------------------------------------------------
// Currency formatting — added when the chore reward input was rebuilt.
// ---------------------------------------------------------------------------

group('currency formatting')

t('formats minor units without float drift', () => {
  assert.equal(formatAmount(8, 'USD'), '0.08')
  assert.equal(formatAmount(800, 'USD'), '8.00')
  assert.equal(formatAmount(25, 'USD'), '0.25')
  assert.equal(formatAmount(0, 'USD'), '0.00')
  // The three amounts actually found in production, which is how this got noticed.
  assert.equal(formatMoney(8, 'USD'), '$0.08')
  assert.equal(formatMoney(100, 'USD'), '$1.00')
  assert.equal(formatMoney(800, 'USD'), '$8.00')
})

t('zero-decimal currencies do not show a fractional part', () => {
  // ¥1.00 and ₩1.00 are meaningless — these have no minor unit.
  assert.equal(findCurrency('JPY').decimals, 0)
  assert.equal(formatAmount(12000, 'JPY'), '120')
  assert.equal(formatMoney(12000, 'JPY'), '¥120')
  assert.equal(formatMoney(500000, 'KRW'), '₩5000')
})

t('an unknown or missing currency falls back to USD rather than throwing', () => {
  assert.equal(currencySymbol(null), '$')
  assert.equal(currencySymbol(undefined), '$')
  assert.equal(currencySymbol('NOPE'), '$')
  assert.equal(formatMoney(150, 'GBP'), '£1.50')
})

t('a new chore is NOT defaulted from the flat daily rate', () => {
  // The bug: the per-chore default was read from daily_reward_cents, so a
  // family on an 8c daily rate got every new chore defaulted to $0.08.
  // These are unrelated quantities that merely share a unit.
  assert.equal(DEFAULT_CHORE_REWARD_CENTS, 25)
  assert.notEqual(DEFAULT_CHORE_REWARD_CENTS, DEFAULT_DAILY_REWARD_CENTS)
})

t('flat mode ignores per-chore amounts entirely', () => {
  // Why the chore form now says so out loud. These wildly different per-chore
  // values produce the same earnings under the flat rate.
  const flat = { reward_mode: 'flat', daily_reward_cents: 8, weekly_bonus_cents: 0 }
  const chores = [{ id: 'a', reward_cents: 800 }, { id: 'b', reward_cents: 8 }]
  const allDone = new Set(['a', 'b'])
  assert.equal(childDayEarningsCents(chores, allDone, flat), 8)

  const cheap = [{ id: 'a', reward_cents: 1 }, { id: 'b', reward_cents: 1 }]
  assert.equal(childDayEarningsCents(cheap, allDone, flat), 8, 'flat earnings must not depend on chore amounts')
})


group('typing a money amount')

/** Replay a literal keystroke sequence through the input's onChange logic. */
function typeAmount(keys: string): { shown: string; cents: number } {
  let draft = ''
  let cents = 0
  for (const k of keys) {
    draft = sanitizeAmountInput(draft + k)
    const c = amountToCents(draft)
    if (c !== null) cents = c
  }
  return { shown: draft, cents }
}

t('typing "0.08" gives 8 cents — it used to give $8.00', () => {
  // The reported bug. A controlled <input type="number"> reports e.target.value
  // as "" for the intermediate "0.", so the decimal was swallowed and the
  // keystrokes landed as "08" = 800 cents.
  assert.equal(typeAmount('0.08').cents, 8)
  assert.equal(typeAmount('0.08').shown, '0.08')
  // Every intermediate state must survive, or the next keystroke can't happen.
  assert.equal(typeAmount('0').shown, '0')
  assert.equal(typeAmount('0.').shown, '0.')
  assert.equal(typeAmount('0.0').shown, '0.0')
})

t('string math avoids the float truncation that ate a cent', () => {
  // parseFloat('0.29') * 100 is 28.999999999999996; Int()/floor gives 28.
  assert.equal(typeAmount('0.29').cents, 29)
  assert.equal(typeAmount('0.57').cents, 57)
  assert.equal(typeAmount('1.15').cents, 115)
  assert.equal(Math.trunc(parseFloat('0.29') * 100), 28, 'sanity: the naive path really does lose it')
})

t('handles the awkward inputs a real keyboard produces', () => {
  assert.equal(typeAmount('8').cents, 800)
  assert.equal(typeAmount('.08').cents, 8)      // leading dot
  assert.equal(typeAmount('00.08').cents, 8)    // leading zeros collapsed
  assert.equal(typeAmount('1.2.3').cents, 123)  // second dot ignored
  assert.equal(typeAmount('5abc').cents, 500)   // letters stripped
  assert.equal(typeAmount('12.3456').cents, 1234) // capped at 2 decimals
})

t('an incomplete amount parses as null rather than zero', () => {
  // So the field can hold "" or "." mid-type without snapping the value to 0.
  assert.equal(amountToCents(''), null)
  assert.equal(amountToCents('.'), null)
  assert.equal(amountToCents('0'), 0)
})


console.log(`\n${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)