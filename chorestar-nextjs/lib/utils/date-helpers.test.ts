/**
 * Unit tests for week-key date math. Run with `npm run test:unit`.
 *
 * The regression these guard: `new Date('YYYY-MM-DD')` parses as UTC
 * midnight and `.toISOString()` serializes back to UTC, so mixing either
 * with local-calendar math shifts dates by a day depending on the
 * machine's timezone ("Week of Sep 5" labels for a Sep 6 week in the US;
 * Saturday week keys for Gulf and India families). Everything below must
 * hold in EVERY timezone the test machine could run in.
 */
import assert from 'node:assert/strict'
import { getWeekStart, getWeekEnd, getWeekInfo, getPreviousWeek, getNextWeek, isCurrentWeek } from './date-helpers'

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

group('getWeekStart stays on the local Sunday')

t('a local Monday maps to the day before', () => {
  // Monday Sep 7 2026, noon LOCAL time — week starts Sunday Sep 6.
  assert.equal(getWeekStart(new Date(2026, 8, 7, 12, 0)), '2026-09-06')
})

t('a local Sunday maps to itself, even at 00:00', () => {
  assert.equal(getWeekStart(new Date(2026, 8, 6, 0, 0)), '2026-09-06')
})

t('a local Saturday late evening maps to the previous Sunday', () => {
  assert.equal(getWeekStart(new Date(2026, 8, 5, 23, 59)), '2026-08-30')
})

t('does not mutate its input', () => {
  const d = new Date(2026, 8, 7, 12, 0)
  getWeekStart(d)
  assert.equal(d.getDate(), 7)
})

group('labels and arithmetic parse the key as a local date')

t('getWeekInfo labels the exact key date', () => {
  assert.equal(getWeekInfo('2026-09-06').displayText, 'Week of Sep 6')
})

t('getWeekInfo carries the year when it differs', () => {
  const info = getWeekInfo('2025-12-28')
  assert.equal(info.displayText, 'Week of Dec 28, 2025')
})

t('week end is the following Saturday', () => {
  assert.equal(getWeekEnd('2026-09-06'), '2026-09-12')
  assert.equal(getWeekInfo('2026-09-06').weekEnd, '2026-09-12')
})

t('previous and next week move exactly seven days', () => {
  assert.equal(getPreviousWeek('2026-09-06'), '2026-08-30')
  assert.equal(getNextWeek('2026-09-06'), '2026-09-13')
})

t('month boundaries survive the round trip', () => {
  assert.equal(getNextWeek('2026-08-30'), '2026-09-06')
  assert.equal(getPreviousWeek('2026-01-04'), '2025-12-28')
})

group('isCurrentWeek agrees with getWeekStart')

t('the computed current week is current', () => {
  assert.equal(isCurrentWeek(getWeekStart()), true)
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
