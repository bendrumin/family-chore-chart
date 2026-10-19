/**
 * Unit tests for routineIncome. Run with `npm run test:unit`.
 */
import assert from 'node:assert/strict'
import { routineIncome, ROUTINE_MONEY_SINCE } from './routine-earnings'

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

const row = (o: Partial<{ routine_id: string; date: string; completed_at: string; points_earned: number | null }>) => ({
  routine_id: 'r1',
  date: '2026-10-20',
  completed_at: '2026-10-20T13:00:00Z',
  points_earned: 25,
  ...o,
})

t('a completed routine after the start date earns its reward', () =>
  assert.deepEqual(routineIncome([row({})]), [{ date: '2026-10-20', cents: 25 }]))
t('history before the start date is not counted', () =>
  assert.deepEqual(routineIncome([row({ completed_at: '2026-10-18T23:59:59Z', date: '2026-10-18' })]), []))
t('the start date itself counts', () =>
  assert.equal(routineIncome([row({ completed_at: ROUTINE_MONEY_SINCE, date: '2026-10-19' })]).length, 1))
t('unfinished routines (0 points) and nulls earn nothing', () =>
  assert.deepEqual(routineIncome([row({ points_earned: 0 }), row({ points_earned: null })]), []))
t('the same routine twice in a day pays once', () =>
  assert.deepEqual(routineIncome([row({}), row({ completed_at: '2026-10-20T14:00:00Z' })]), [{ date: '2026-10-20', cents: 25 }]))
t('different routines the same day both pay', () =>
  assert.equal(routineIncome([row({}), row({ routine_id: 'r2', points_earned: 10 })]).reduce((s, e) => s + e.cents, 0), 35))
t('no date column falls back to the completion day', () =>
  assert.deepEqual(routineIncome([{ routine_id: 'r1', date: null, completed_at: '2026-10-21T08:00:00Z', points_earned: 5 }]), [{ date: '2026-10-21', cents: 5 }]))

console.log(`\n${passed} passed, ${failed} failed`)
if (failed) process.exit(1)
