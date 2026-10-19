/**
 * Unit tests for mapping database rows to the calendar feed. Run with
 * `npm run test:unit`.
 */
import assert from 'node:assert/strict'
import { feedCalendarName, toFeedInput, type FeedRows } from './feed-input'

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
    console.log(err)
  }
}

const NOW = new Date('2026-10-19T15:00:00Z')

function rows(overrides: Partial<FeedRows> = {}): FeedRows {
  return {
    feed: { id: 'f1', family_id: 'owner', child_id: null, timezone: 'Europe/London' },
    familyName: 'Smith Family',
    settings: { timezone: 'UTC', currency_code: 'GBP', reward_mode: 'per_chore', vacation_starts_on: '2026-12-20', vacation_ends_on: '2026-12-27' },
    children: [
      { id: 'maya', name: 'Maya' },
      { id: 'sam', name: 'Sam' },
    ],
    chores: [
      { id: 'c1', child_id: 'maya', name: 'Dishes', reward_cents: 50, days_of_week: [1], is_active: true, rotation_mode: 'rotate' },
      { id: 'c2', child_id: 'sam', name: 'Trash', reward_cents: 25, is_active: true, rotation_mode: 'weird' },
      { id: 'c3', child_id: 'sam', name: 'Old', is_active: false },
    ],
    routines: [
      { id: 'r1', child_id: 'maya', name: 'Morning', type: 'morning', is_active: true },
      { id: 'r2', child_id: 'sam', name: 'Bed', type: 'bedtime', is_active: false },
    ],
    steps: [
      { routine_id: 'r1', title: 'Dress', order_index: 2, duration_seconds: 60 },
      { routine_id: 'r1', title: 'Teeth', order_index: 1, duration_seconds: null },
    ],
    vacationHistory: [{ starts_on: '2026-08-01', ends_on: '2026-08-07' }],
    ...overrides,
  }
}

t('family feed: active chores and routines only, steps in order', () => {
  const input = toFeedInput(rows(), NOW, 'https://chorestar.app')
  assert.deepEqual(input.chores.map(c => c.id), ['c1', 'c2'])
  assert.deepEqual(input.routines.map(r => r.id), ['r1'])
  assert.deepEqual(input.routines[0].steps, [
    { title: 'Teeth', durationSeconds: null },
    { title: 'Dress', durationSeconds: 60 },
  ])
  assert.equal(input.chores[0].rotationMode, 'rotate')
  assert.equal(input.chores[1].rotationMode, null)
})

t('settings: currency, reward mode, and the zone falls back past UTC to the feed\'s', () => {
  const input = toFeedInput(rows(), NOW, 'https://chorestar.app')
  assert.equal(input.currencyCode, 'GBP')
  assert.equal(input.perChoreRewards, true)
  assert.equal(input.timeZone, 'Europe/London')
  assert.equal(input.calendarName, 'ChoreStar: Smith Family')
  const flat = toFeedInput(rows({ settings: { timezone: 'America/Denver', reward_mode: 'flat' } }), NOW, 'x')
  assert.equal(flat.timeZone, 'America/Denver')
  assert.equal(flat.perChoreRewards, false)
  assert.equal(flat.currencyCode, 'USD')
})

t('vacations: history plus the live window', () => {
  const input = toFeedInput(rows(), NOW, 'https://chorestar.app')
  assert.deepEqual(input.vacations, [
    { starts_on: '2026-08-01', ends_on: '2026-08-07' },
    { starts_on: '2026-12-20', ends_on: '2026-12-27' },
  ])
})

t('kid feed: only that kid, named after them', () => {
  const input = toFeedInput(rows({ feed: { id: 'f2', family_id: 'owner', child_id: 'sam', timezone: null } }), NOW, 'x')
  assert.deepEqual(input.children, [{ id: 'sam', name: 'Sam' }])
  assert.deepEqual(input.chores.map(c => c.id), ['c2'])
  assert.deepEqual(input.routines, [])
  assert.equal(input.calendarName, 'ChoreStar: Sam')
  assert.equal(input.timeZone, null) // UTC family, no browser zone: floating
})

t('feedCalendarName fallbacks', () => {
  assert.equal(feedCalendarName('  ', null), 'ChoreStar')
  assert.equal(feedCalendarName(null, undefined), 'ChoreStar')
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
