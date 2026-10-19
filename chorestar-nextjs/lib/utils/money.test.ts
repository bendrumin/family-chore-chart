/**
 * Unit tests for kid money management (migration 030): jars derived from
 * dated income, payday and catch-up, the allowance threshold, interest caps,
 * deductions that won't go below zero, and screen-time minutes.
 * Run with `npm run test:unit`.
 */
import assert from 'node:assert/strict'
import {
  NO_SPLIT,
  addDaysYmd,
  allowanceDecision,
  completionRate,
  computeJars,
  currentVersion,
  deductionCents,
  earnedChoreMinutes,
  formatMinutes,
  formatRate,
  isValidSplit,
  localDateIn,
  nextPayday,
  paydayToSettle,
  splitCents,
  splitOn,
  weekStartOf,
  weekdayOf,
  weeklyInterestCents,
  INTEREST_MAX_CENTS_PER_WEEK,
  type SplitVersion,
} from './money'
import { childDatedEarnings, childTotalEarningsCents, type ChoreReward, type DatedCompletion } from './earnings'

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

const v = (effectiveOn: string, spend: number, save: number, give: number, enabled = true, createdAt?: string): SplitVersion => ({
  effectiveOn,
  spend,
  save,
  give,
  enabled,
  createdAt,
})

// --- splits -----------------------------------------------------------------

t('a split must total 100 in whole percents', () => {
  assert.ok(isValidSplit({ spend: 70, save: 20, give: 10 }))
  assert.ok(isValidSplit({ spend: 100, save: 0, give: 0 }))
  assert.ok(!isValidSplit({ spend: 70, save: 20, give: 5 }))
  assert.ok(!isValidSplit({ spend: 70.5, save: 19.5, give: 10 }))
  assert.ok(!isValidSplit({ spend: 110, save: -10, give: 0 }))
})

t('splitCents always adds back up, Spend takes the rounding', () => {
  for (const cents of [0, 1, 7, 33, 99, 100, 101, 1234]) {
    const p = splitCents(cents, { spend: 70, save: 20, give: 10 })
    assert.equal(p.spend + p.save + p.give, cents)
    assert.ok(p.save >= 0 && p.give >= 0)
  }
  assert.deepEqual(splitCents(100, { spend: 70, save: 20, give: 10 }), { spend: 70, save: 20, give: 10 })
  assert.deepEqual(splitCents(33, { spend: 70, save: 20, give: 10 }), { spend: 24, save: 6, give: 3 })
})

t('splitCents of a negative amount stays symmetric', () => {
  const p = splitCents(-100, { spend: 70, save: 20, give: 10 })
  assert.deepEqual(p, { spend: -70, save: -20, give: -10 })
})

t('splitOn: before any version, everything is Spend', () => {
  assert.deepEqual(splitOn([v('2026-10-10', 70, 20, 10)], '2026-10-09'), NO_SPLIT)
})

t('splitOn: the version in force on the day, inclusive', () => {
  const versions = [v('2026-10-10', 70, 20, 10), v('2026-10-15', 50, 40, 10)]
  assert.deepEqual(splitOn(versions, '2026-10-10'), { spend: 70, save: 20, give: 10 })
  assert.deepEqual(splitOn(versions, '2026-10-14'), { spend: 70, save: 20, give: 10 })
  assert.deepEqual(splitOn(versions, '2026-10-15'), { spend: 50, save: 40, give: 10 })
})

t('splitOn: a disabled version means one balance again', () => {
  assert.deepEqual(splitOn([v('2026-10-10', 70, 20, 10), v('2026-10-12', 100, 0, 0, false)], '2026-10-13'), NO_SPLIT)
})

t('currentVersion: same-day changes resolve by created_at', () => {
  const versions = [v('2026-10-10', 50, 40, 10, true, '2026-10-10T12:00:00Z'), v('2026-10-10', 70, 20, 10, true, '2026-10-10T09:00:00Z')]
  assert.equal(currentVersion(versions)?.spend, 50)
  assert.deepEqual(splitOn(versions, '2026-10-10'), { spend: 50, save: 40, give: 10 })
  assert.equal(currentVersion([]), null)
})

// --- computeJars --------------------------------------------------------------

t('no versions: every cent is Spend, totals match', () => {
  const jars = computeJars([{ date: '2026-10-01', cents: 500 }], [{ jar: 'spend', cents: -200 }], [])
  assert.deepEqual(jars, { spend: 300, save: 0, give: 0, total: 300 })
})

t('earnings before the split was turned on stay in Spend', () => {
  const income = [
    { date: '2026-10-08', cents: 300 },
    { date: '2026-10-09', cents: 200 },
    { date: '2026-10-10', cents: 100 },
    { date: '2026-10-11', cents: 100 },
  ]
  const jars = computeJars(income, [], [v('2026-10-10', 70, 20, 10)])
  assert.deepEqual(jars, { spend: 500 + 140, save: 40, give: 20, total: 700 })
})

t('a late tick for a past day uses that day\'s split, not today\'s', () => {
  const versions = [v('2026-10-10', 70, 20, 10)]
  const before = computeJars([{ date: '2026-10-12', cents: 100 }], [], versions)
  const after = computeJars([{ date: '2026-10-12', cents: 100 }, { date: '2026-10-05', cents: 100 }], [], versions)
  assert.equal(after.save, before.save, 'the pre-split day adds only to Spend')
  assert.equal(after.spend, before.spend + 100)
})

t('splits group by version, so many small earnings round once', () => {
  const income = Array.from({ length: 10 }, (_, i) => ({ date: addDaysYmd('2026-10-10', i), cents: 25 }))
  const jars = computeJars(income, [], [v('2026-10-01', 70, 20, 10)])
  // 250 split once: 50 save, 25 give. Per-item rounding would give 5 + 2 each = 50 / 20.
  assert.deepEqual(jars, { spend: 175, save: 50, give: 25, total: 250 })
})

t('jar entries: goal payouts from Save, store from Spend, donations from Give', () => {
  const jars = computeJars(
    [{ date: '2026-10-10', cents: 1000 }],
    [
      { jar: 'spend', cents: -300 },
      { jar: 'save', cents: -150 },
      { jar: 'give', cents: -100 },
      { jar: 'save', cents: 5 },
    ],
    [v('2026-10-01', 50, 30, 20)]
  )
  assert.deepEqual(jars, { spend: 200, save: 155, give: 100, total: 455 })
})

t('transfers move money between jars without changing the total', () => {
  const base = computeJars([{ date: '2026-10-10', cents: 1000 }], [], [v('2026-10-01', 70, 20, 10)])
  const swept = computeJars(
    [{ date: '2026-10-10', cents: 1000 }],
    [
      { jar: 'save', cents: -200 },
      { jar: 'spend', cents: 200 },
      { jar: 'give', cents: -100 },
      { jar: 'spend', cents: 100 },
    ],
    [v('2026-10-01', 70, 20, 10), v('2026-10-12', 100, 0, 0, false)]
  )
  assert.equal(swept.total, base.total)
  assert.deepEqual(swept, { spend: 1000, save: 0, give: 0, total: 1000 })
})

t('a fine allowed to go negative shows as negative Spend', () => {
  const jars = computeJars([{ date: '2026-10-10', cents: 100 }], [{ jar: 'spend', cents: -300 }], [])
  assert.equal(jars.spend, -200)
  assert.equal(jars.total, -200)
})

// --- dated earnings feed the jars -------------------------------------------------

t('childDatedEarnings sums to childTotalEarningsCents (per chore, two weeks)', () => {
  const chores: ChoreReward[] = [
    { id: 'a', reward_cents: 25 },
    { id: 'b', reward_cents: 50, days_of_week: [1, 3, 5] },
  ]
  const completions: DatedCompletion[] = [
    { chore_id: 'a', day_of_week: 0, week_start: '2026-10-04' },
    { chore_id: 'b', day_of_week: 1, week_start: '2026-10-04' },
    { chore_id: 'a', day_of_week: 2, week_start: '2026-10-11' },
    { chore_id: 'a', day_of_week: 3, week_start: '2026-10-11', status: 'pending' },
  ]
  const settings = { reward_mode: 'per_chore', daily_reward_cents: 100, weekly_bonus_cents: 0 }
  const dated = childDatedEarnings(chores, completions, settings)
  assert.equal(dated.reduce((s, e) => s + e.cents, 0), childTotalEarningsCents(chores, completions, settings))
  assert.deepEqual(dated.find((e) => e.date === '2026-10-13'), { date: '2026-10-13', cents: 25 })
  assert.ok(!dated.some((e) => e.date === '2026-10-14'), 'pending tick earns nothing yet')
})

t('childDatedEarnings dates the perfect-week bonus to Saturday (flat mode)', () => {
  const chores: ChoreReward[] = [{ id: 'a', reward_cents: 0 }]
  const completions: DatedCompletion[] = Array.from({ length: 7 }, (_, d) => ({ chore_id: 'a', day_of_week: d, week_start: '2026-10-04' }))
  const settings = { reward_mode: 'flat', daily_reward_cents: 100, weekly_bonus_cents: 300 }
  const dated = childDatedEarnings(chores, completions, settings)
  assert.equal(dated.reduce((s, e) => s + e.cents, 0), childTotalEarningsCents(chores, completions, settings))
  assert.equal(dated.filter((e) => e.date === '2026-10-10').reduce((s, e) => s + e.cents, 0), 400)
})

// --- calendar and payday -------------------------------------------------------------

t('weekday and week start in YYYY-MM-DD, server timezone free', () => {
  assert.equal(weekdayOf('2026-10-18'), 0)
  assert.equal(weekdayOf('2026-10-24'), 6)
  assert.equal(weekStartOf('2026-10-21'), '2026-10-18')
  assert.equal(weekStartOf('2026-10-18'), '2026-10-18')
  assert.equal(addDaysYmd('2026-12-31', 1), '2027-01-01')
})

t('localDateIn uses the family timezone', () => {
  const now = new Date('2026-10-18T03:00:00Z') // Sat 10pm in Chicago
  assert.equal(localDateIn(now, 'America/Chicago'), '2026-10-17')
  assert.equal(localDateIn(now, 'UTC'), '2026-10-18')
  assert.equal(localDateIn(now, 'Not/AZone'), '2026-10-18')
})

t('payday: settles on the day', () => {
  assert.equal(paydayToSettle('2026-10-24', 6), '2026-10-24')
})

t('payday: catches up to two days late, not three', () => {
  assert.equal(paydayToSettle('2026-10-25', 6), '2026-10-24')
  assert.equal(paydayToSettle('2026-10-26', 6), '2026-10-24')
  assert.equal(paydayToSettle('2026-10-27', 6), null)
  assert.equal(paydayToSettle('2026-10-23', 6), null)
})

t('payday: never one from before it was switched on', () => {
  assert.equal(paydayToSettle('2026-10-26', 6, '2026-10-25'), null)
  assert.equal(paydayToSettle('2026-10-24', 6, '2026-10-24'), '2026-10-24')
})

t('a catch-up payday keys to the payday\'s week, so it can\'t pay twice', () => {
  // Friday payday caught up on Sunday still belongs to Friday's week.
  const payday = paydayToSettle('2026-10-25', 5)
  assert.equal(payday, '2026-10-23')
  assert.equal(weekStartOf(payday!), '2026-10-18')
})

t('nextPayday', () => {
  assert.equal(nextPayday('2026-10-19', 6), '2026-10-24')
  assert.equal(nextPayday('2026-10-24', 6), '2026-10-24')
})

// --- allowance threshold ---------------------------------------------------------------

const rateChores = [
  { id: 'a' },
  { id: 'b', days_of_week: [1, 3, 5] },
]

t('completionRate: distinct due cells over a window spanning two weeks', () => {
  // Window Sat 10-17 .. Fri 10-23. 'a' due 7 days, 'b' due Mon/Wed/Fri = 3. 10 due.
  const completions = [
    { chore_id: 'a', week_start: '2026-10-11', day_of_week: 6 },
    { chore_id: 'a', week_start: '2026-10-11', day_of_week: 6 }, // duplicate
    { chore_id: 'a', week_start: '2026-10-18', day_of_week: 0 },
    { chore_id: 'a', week_start: '2026-10-18', day_of_week: 1 },
    { chore_id: 'b', week_start: '2026-10-18', day_of_week: 1 },
    { chore_id: 'b', week_start: '2026-10-18', day_of_week: 2 }, // off schedule
    { chore_id: 'a', week_start: '2026-10-18', day_of_week: 2, status: 'pending' },
  ]
  assert.deepEqual(completionRate(rateChores, completions, '2026-10-17', '2026-10-23'), { due: 10, done: 4, percent: 40 })
})

t('completionRate: vacation days hold nothing due; an all-vacation week is null', () => {
  const r = completionRate(rateChores, [], '2026-10-17', '2026-10-23', [{ starts_on: '2026-10-17', ends_on: '2026-10-23' }])
  assert.deepEqual(r, { due: 0, done: 0, percent: null })
})

t('allowance: no threshold always pays', () => {
  const d = allowanceDecision(500, null, { due: 10, done: 0, percent: 0 })
  assert.equal(d.cents, 500)
  assert.ok(d.paid)
})

t('allowance: threshold met pays, missed pays 0 with the reason', () => {
  assert.equal(allowanceDecision(500, 80, { due: 10, done: 8, percent: 80 }).cents, 500)
  const missed = allowanceDecision(500, 80, { due: 10, done: 7, percent: 70 })
  assert.equal(missed.cents, 0)
  assert.ok(!missed.paid)
  assert.match(missed.note, /70%.*80%/)
})

t('allowance: a week with nothing due counts as met', () => {
  assert.equal(allowanceDecision(500, 80, { due: 0, done: 0, percent: null }).cents, 500)
})

// --- interest -----------------------------------------------------------------------------

t('interest: rounds down, nothing on an empty or negative Save', () => {
  assert.equal(weeklyInterestCents(1000, 200), 20)
  assert.equal(weeklyInterestCents(149, 100), 1)
  assert.equal(weeklyInterestCents(99, 100), 0)
  assert.equal(weeklyInterestCents(0, 500), 0)
  assert.equal(weeklyInterestCents(-500, 500), 0)
  assert.equal(weeklyInterestCents(1000, 0), 0)
})

t('interest: rate capped at 10%, payment capped per week', () => {
  assert.equal(weeklyInterestCents(1000, 5000), 100)
  assert.equal(weeklyInterestCents(1_000_000, 1000), INTEREST_MAX_CENTS_PER_WEEK)
})

t('formatRate', () => {
  assert.equal(formatRate(200), '2%')
  assert.equal(formatRate(250), '2.5%')
  assert.equal(formatRate(125), '1.25%')
})

// --- deductions ------------------------------------------------------------------------------

t('deductions never go below zero unless allowed', () => {
  assert.equal(deductionCents(200, 500, false), 200)
  assert.equal(deductionCents(200, 150, false), 150)
  assert.equal(deductionCents(200, 0, false), 0)
  assert.equal(deductionCents(200, -50, false), 0)
  assert.equal(deductionCents(200, 50, true), 200)
  assert.equal(deductionCents(0, 50, true), 0)
})

// --- minutes -----------------------------------------------------------------------------------

t('minutes: each approved chore-day once, pending and no-minute chores ignored', () => {
  const byChore = new Map([['a', 15], ['b', 0]])
  const completions = [
    { chore_id: 'a', week_start: '2026-10-18', day_of_week: 1 },
    { chore_id: 'a', week_start: '2026-10-18', day_of_week: 1 },
    { chore_id: 'a', week_start: '2026-10-18', day_of_week: 2, status: 'approved' },
    { chore_id: 'a', week_start: '2026-10-18', day_of_week: 3, status: 'pending' },
    { chore_id: 'b', week_start: '2026-10-18', day_of_week: 1 },
    { chore_id: 'c', week_start: '2026-10-18', day_of_week: 1 },
  ]
  assert.equal(earnedChoreMinutes(byChore, completions), 30)
})

t('formatMinutes', () => {
  assert.equal(formatMinutes(45), '45 min')
  assert.equal(formatMinutes(60), '1 h')
  assert.equal(formatMinutes(90), '1 h 30 min')
  assert.equal(formatMinutes(-30), '-30 min')
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
