/**
 * Unit tests for kid-facing streaks. Run with `npm run test:unit`.
 */
import assert from 'node:assert/strict'
import { computeStreaks, shiftDay, type StreakCompletion } from './streak'

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

// Week of Sunday 2026-08-23; "today" is Thursday 2026-08-27.
const WEEK = '2026-08-23'
const PREV = '2026-08-16'
const THU = { weekStart: WEEK, dayOfWeek: 4 }

const daily = { id: 'd', days_of_week: [0, 1, 2, 3, 4, 5, 6] }
const weekdays = { id: 'w', days_of_week: [1, 2, 3, 4, 5] }

const done = (id: string, week: string, day: number): StreakCompletion => ({
  chore_id: id,
  week_start: week,
  day_of_week: day,
})

group('shiftDay crosses week boundaries')

t('back one day from Sunday lands on the previous Saturday', () => {
  assert.deepEqual(shiftDay({ weekStart: WEEK, dayOfWeek: 0 }, -1), { weekStart: PREV, dayOfWeek: 6 })
})

t('forward one day from Saturday lands on the next Sunday', () => {
  assert.deepEqual(shiftDay({ weekStart: PREV, dayOfWeek: 6 }, 1), { weekStart: WEEK, dayOfWeek: 0 })
})

group('current streak')

t('consecutive finished days ending today', () => {
  const s = computeStreaks([daily], [done('d', WEEK, 2), done('d', WEEK, 3), done('d', WEEK, 4)], THU)
  assert.equal(s.current, 3)
  assert.equal(s.todayPerfect, true)
})

t('an unfinished today does not break the run, it is just not counted yet', () => {
  const s = computeStreaks([daily], [done('d', WEEK, 2), done('d', WEEK, 3)], THU)
  assert.equal(s.current, 2)
  assert.equal(s.todayPerfect, false)
})

t('a missed day before today ends the run', () => {
  const s = computeStreaks([daily], [done('d', WEEK, 1), done('d', WEEK, 4)], THU)
  assert.equal(s.current, 1)
})

t('days with nothing due are skipped: a weekdays-only kid keeps the streak over the weekend', () => {
  // Thu, Fri of the previous week, then (weekend off) Mon..Thu this week.
  const comps = [
    done('w', PREV, 4), done('w', PREV, 5),
    done('w', WEEK, 1), done('w', WEEK, 2), done('w', WEEK, 3), done('w', WEEK, 4),
  ]
  assert.equal(computeStreaks([weekdays], comps, THU).current, 6)
})

t('a day is only finished when every chore due that day is done', () => {
  const comps = [done('d', WEEK, 3), done('w', WEEK, 3), done('d', WEEK, 4)] // Thu: w missing
  const s = computeStreaks([daily, weekdays], comps, THU)
  assert.equal(s.current, 1)
  assert.equal(s.todayDue, 2)
  assert.equal(s.todayDone, 1)
})

t('no chores means no streak', () => {
  assert.equal(computeStreaks([], [done('d', WEEK, 4)], THU).current, 0)
})

group('best streak')

t('best remembers a longer run from an earlier week', () => {
  const comps = [
    done('d', PREV, 0), done('d', PREV, 1), done('d', PREV, 2), done('d', PREV, 3), done('d', PREV, 4),
    done('d', WEEK, 4),
  ]
  const s = computeStreaks([daily], comps, THU)
  assert.equal(s.current, 1)
  assert.equal(s.best, 5)
})

t('best is at least the current streak', () => {
  const s = computeStreaks([daily], [done('d', WEEK, 3), done('d', WEEK, 4)], THU)
  assert.equal(s.best, 2)
})

console.log(`\n${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
