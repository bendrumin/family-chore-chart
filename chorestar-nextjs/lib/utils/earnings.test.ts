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
  childTotalEarningsCents,
  owedCents,
  isPerfectDay,
  dailyRewardCents,
  isPerChoreMode,
  DEFAULT_DAILY_REWARD_CENTS,
  type ChoreReward,
  type DayCompletion,
  type DatedCompletion,
  type EarningsSettings,
} from './earnings'
import {
  scheduleDays,
  isDueOn,
  formatSchedule,
  normalizeDays,
} from './schedule'
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

t('Gulf currencies format with their own symbols', () => {
  assert.equal(findCurrency('SAR').symbol, 'ر.س')
  assert.equal(formatMoney(100, 'SAR'), 'ر.س1.00')
  assert.equal(findCurrency('AED').symbol, 'د.إ')
  assert.equal(formatMoney(250, 'AED'), 'د.إ2.50')
})

t('an unknown or missing currency falls back to USD rather than throwing', () => {
  assert.equal(currencySymbol(null), '$')
  assert.equal(currencySymbol(undefined), '$')
  assert.equal(currencySymbol('NOPE'), '$')
  assert.equal(formatMoney(150, 'GBP'), '£1.50')
})

t('the new-chore default follows the reward mode', () => {
  // In per-chore mode the amount affects earnings, so it gets its own default
  // rather than copying the daily rate (an unrelated quantity).
  const perChore: EarningsSettings = { reward_mode: 'per_chore', daily_reward_cents: 8, weekly_bonus_cents: 0 }
  const defaultFor = (s: EarningsSettings) =>
    isPerChoreMode(s) ? DEFAULT_CHORE_REWARD_CENTS : dailyRewardCents(s)
  assert.equal(defaultFor(perChore), 10)

  // On the flat rate no per-chore figure is meaningful, so it matches the number
  // the family actually thinks in.
  const flat8: EarningsSettings = { reward_mode: 'flat', daily_reward_cents: 8, weekly_bonus_cents: 0 }
  assert.equal(defaultFor(flat8), 8)
  const flat50: EarningsSettings = { reward_mode: 'flat', daily_reward_cents: 50, weekly_bonus_cents: 0 }
  assert.equal(defaultFor(flat50), 50)

  // Absent settings fall back to the schema default, not to 25.
  assert.equal(defaultFor({ reward_mode: null, daily_reward_cents: null, weekly_bonus_cents: null }), DEFAULT_DAILY_REWARD_CENTS)
})

t('the flat daily rate is per day, not per chore — however many chores there are', () => {
  // The reason the notice names the amount: showing 8c on each of three chores
  // invites reading it as 24c a day.
  const flat: EarningsSettings = { reward_mode: 'flat', daily_reward_cents: 8, weekly_bonus_cents: 0 }
  const one = [{ id: 'a', reward_cents: 8 }]
  const three = [{ id: 'a', reward_cents: 8 }, { id: 'b', reward_cents: 8 }, { id: 'c', reward_cents: 8 }]
  assert.equal(childDayEarningsCents(one, new Set(['a']), flat), 8)
  assert.equal(childDayEarningsCents(three, new Set(['a', 'b', 'c']), flat), 8, 'three chores must still pay 8c, not 24c')
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


// --- Running allowance balance ------------------------------------------------

const dated = (choreId: string, day: number, week: string): DatedCompletion =>
  ({ chore_id: choreId, day_of_week: day, week_start: week })

t('total earnings add up across several weeks', () => {
  const chores = [chore('a', 100)]
  const total = childTotalEarningsCents(chores, [
    dated('a', 1, '2026-08-02'),
    dated('a', 2, '2026-08-02'),
    dated('a', 1, '2026-08-09'),
  ], PER)
  assert.equal(total, 300)
})

t('the weekly bonus is NOT paid for 7 perfect days split across two weeks', () => {
  // The whole reason totals are bucketed by week_start instead of being treated
  // as one long run of days: this would otherwise look like a perfect week.
  const chores = [chore('a', 10)]
  const spread: DatedCompletion[] = [
    ...[0, 1, 2, 3].map((d) => dated('a', d, '2026-08-02')),
    ...[0, 1, 2].map((d) => dated('a', d, '2026-08-09')),
  ]
  // 7 completions x 10c, and NO 1c bonus for either partial week.
  assert.equal(childTotalEarningsCents(chores, spread, PER), 70)
})

t('a genuinely perfect week still earns its bonus inside the total', () => {
  const chores = [chore('a', 10)]
  const week: DatedCompletion[] = [0, 1, 2, 3, 4, 5, 6].map((d) => dated('a', d, '2026-08-02'))
  assert.equal(childTotalEarningsCents(chores, week, PER), 70 + 1)
})

t('completions with no week_start are ignored rather than crashing', () => {
  const chores = [chore('a', 100)]
  const total = childTotalEarningsCents(chores, [
    { chore_id: 'a', day_of_week: 1, week_start: null },
    dated('a', 1, '2026-08-02'),
  ], PER)
  assert.equal(total, 100)
})

t('owed is earned minus paid, and never goes negative', () => {
  assert.equal(owedCents(500, 200), 300)
  assert.equal(owedCents(500, 500), 0)
  // Rewards lowered after a payout must not show a debt owed BY the child.
  assert.equal(owedCents(100, 500), 0)
})

t('a child with no chores is owed nothing', () => {
  assert.equal(childTotalEarningsCents([], [dated('a', 1, '2026-08-02')], PER), 0)
})


group('schedules: a chore is only due on its days')

const mon = { id: 'm', reward_cents: 50, days_of_week: [1] }
const daily = { id: 'd', reward_cents: 25, days_of_week: [0, 1, 2, 3, 4, 5, 6] }
const weekdaysOnly = { id: 'w', reward_cents: 10, days_of_week: [1, 2, 3, 4, 5] }

t('flat: a day with nothing due is not a perfect day and earns nothing', () => {
  assert.equal(isPerfectDay([mon], new Set(), 2), false)
  assert.equal(childDayEarningsCents([mon], new Set(), FLAT, 2), 0)
})

t('flat: finishing what is due today pays the daily rate even with other chores off today', () => {
  // Tuesday: only `daily` is due.
  assert.equal(isPerfectDay([mon, daily], new Set(['d']), 2), true)
  assert.equal(childDayEarningsCents([mon, daily], new Set(['d']), FLAT, 2), 8)
})

t('flat: on Monday both are due, so one done is not perfect', () => {
  assert.equal(childDayEarningsCents([mon, daily], new Set(['d']), FLAT, 1), 0)
})

t('per_chore: a chore ticked on an off day still pays', () => {
  assert.equal(childDayEarningsCents([mon], new Set(['m']), PER, 3), 50)
})

t('without a day, every chore counts as due (legacy callers)', () => {
  assert.equal(isPerfectDay([mon, daily], new Set(['d'])), false)
  assert.equal(isPerfectDay([mon, daily], new Set(['d', 'm'])), true)
})

t('week: a weekdays-only list has 5 due days and a 5/5 week pays the bonus', () => {
  const comps: DayCompletion[] = [1, 2, 3, 4, 5].map(d => ({ chore_id: 'w', day_of_week: d }))
  const r = childWeekEarningsCents([weekdaysOnly], comps, FLAT)
  assert.equal(r.dueDays, 5)
  assert.equal(r.perfectDays, 5)
  assert.equal(r.earnedCents, 5 * 8 + 1)
})

t('week: a missed due day forfeits the bonus', () => {
  const comps: DayCompletion[] = [1, 2, 3, 4].map(d => ({ chore_id: 'w', day_of_week: d }))
  const r = childWeekEarningsCents([weekdaysOnly], comps, FLAT)
  assert.equal(r.perfectDays, 4)
  assert.equal(r.earnedCents, 4 * 8)
})

t('week: an unscheduled list still has 7 due days', () => {
  assert.equal(childWeekEarningsCents([daily], [], FLAT).dueDays, 7)
})

t('an empty or missing schedule means every day', () => {
  assert.deepEqual(scheduleDays({ days_of_week: [] }), [0, 1, 2, 3, 4, 5, 6])
  assert.deepEqual(scheduleDays({}), [0, 1, 2, 3, 4, 5, 6])
  assert.equal(isDueOn({ days_of_week: null }, 4), true)
})

t('formatSchedule names the common shapes', () => {
  assert.equal(formatSchedule([0, 1, 2, 3, 4, 5, 6]), 'Every day')
  assert.equal(formatSchedule([1, 2, 3, 4, 5]), 'Weekdays')
  assert.equal(formatSchedule([0, 6]), 'Weekends')
  assert.equal(formatSchedule([2]), 'Tuesdays')
  assert.equal(formatSchedule([5, 1, 3]), 'Mon, Wed, Fri')
})

t('normalizeDays drops junk and duplicates', () => {
  assert.deepEqual(normalizeDays([6, 1, 1, 9, -1, 2.5]), [1, 6])
})


console.log(`\n${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)