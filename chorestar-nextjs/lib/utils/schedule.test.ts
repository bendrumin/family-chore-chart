/**
 * Unit tests for the week display order. Run with `npm run test:unit`.
 *
 * weekDisplayOrder returns STORAGE day indexes (0=Sunday .. 6=Saturday) in the
 * locale's display order — the values never change meaning, only their order.
 */
import assert from 'node:assert/strict'
import { ALL_DAYS, missingDueCells, weekDisplayOrder } from './schedule'

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

group('weekDisplayOrder fallback')

t('no locale and no navigator (SSR) is Sunday-first', () => {
  // Node has no `navigator` in this test process, so the implicit path is the
  // same one a server render takes.
  assert.deepEqual(weekDisplayOrder(), [0, 1, 2, 3, 4, 5, 6])
})

t('a nonsense locale tag falls back to Sunday-first', () => {
  assert.deepEqual(weekDisplayOrder('not a locale!!'), [0, 1, 2, 3, 4, 5, 6])
})

group('weekDisplayOrder by locale')

t('en-US starts on Sunday (Intl firstDay 7 maps to index 0)', () => {
  assert.deepEqual(weekDisplayOrder('en-US'), [0, 1, 2, 3, 4, 5, 6])
})

t('en-GB starts on Monday', () => {
  assert.deepEqual(weekDisplayOrder('en-GB'), [1, 2, 3, 4, 5, 6, 0])
})

t('ar-EG starts on Saturday (Intl firstDay 6 stays index 6)', () => {
  assert.deepEqual(weekDisplayOrder('ar-EG'), [6, 0, 1, 2, 3, 4, 5])
})

group('weekDisplayOrder invariants')

t('every order is a permutation of the seven storage indexes', () => {
  for (const tag of ['en-US', 'en-GB', 'ar-EG', 'ar-SA', 'pt-BR', 'de-DE']) {
    const order = weekDisplayOrder(tag)
    assert.equal(order.length, 7, tag)
    assert.deepEqual([...order].sort((a, b) => a - b), [...ALL_DAYS], tag)
  }
})

t('display order is consecutive: each column is the previous day plus one', () => {
  for (const tag of ['en-US', 'en-GB', 'ar-EG']) {
    const order = weekDisplayOrder(tag)
    for (let i = 1; i < 7; i++) {
      assert.equal(order[i], (order[i - 1] + 1) % 7, `${tag} column ${i}`)
    }
  }
})

group('missingDueCells: schedule masks')

// 0=Sunday .. 6=Saturday, same convention as the rest of this module.
const everyday = { id: 'everyday', days_of_week: null }
const tuesdays = { id: 'tuesdays', days_of_week: [2] }
const weekdays = { id: 'weekdays', days_of_week: [1, 2, 3, 4, 5] }

t('a Tuesdays-only chore contributes at most one cell across the whole week', () => {
  const cells = missingDueCells([tuesdays], [], 6)
  assert.deepEqual(cells, [{ choreId: 'tuesdays', dayOfWeek: 2 }])
})

t('a Tuesdays-only chore contributes nothing before Tuesday', () => {
  assert.deepEqual(missingDueCells([tuesdays], [], 1), [])
})

t('an empty schedule means every day (the pre-migration fallback)', () => {
  const cells = missingDueCells([{ id: 'legacy', days_of_week: [] }], [], 2)
  assert.deepEqual(
    cells.map(c => c.dayOfWeek),
    [0, 1, 2]
  )
})

t('off-days are never emitted, even when other chores are due then', () => {
  const cells = missingDueCells([everyday, weekdays], [], 0)
  // Sunday: only the everyday chore is due.
  assert.deepEqual(cells, [{ choreId: 'everyday', dayOfWeek: 0 }])
})

group('missingDueCells: throughDay cutoff')

t('throughDay 2 stops after Tuesday', () => {
  const cells = missingDueCells([everyday], [], 2)
  assert.deepEqual(
    cells.map(c => c.dayOfWeek),
    [0, 1, 2]
  )
})

t('throughDay 0 is Sunday only', () => {
  assert.deepEqual(missingDueCells([everyday], [], 0), [{ choreId: 'everyday', dayOfWeek: 0 }])
})

t('a negative throughDay yields nothing', () => {
  assert.deepEqual(missingDueCells([everyday], [], -1), [])
})

t('throughDay past Saturday is clamped to the seven real days', () => {
  assert.equal(missingDueCells([everyday], [], 99).length, 7)
})

group('missingDueCells: existing rows count as filled')

t('an already-completed cell is skipped', () => {
  const cells = missingDueCells([everyday], [{ chore_id: 'everyday', day_of_week: 1 }], 2)
  assert.deepEqual(
    cells.map(c => c.dayOfWeek),
    [0, 2]
  )
})

t('a pending row counts as present, so its cell is not refilled', () => {
  const pending = { chore_id: 'everyday', day_of_week: 1, status: 'pending' }
  const cells = missingDueCells([everyday], [pending], 2)
  assert.deepEqual(
    cells.map(c => c.dayOfWeek),
    [0, 2]
  )
})

t('completions only fill the chore they belong to', () => {
  const cells = missingDueCells(
    [everyday, tuesdays],
    [{ chore_id: 'everyday', day_of_week: 2 }],
    2
  )
  assert.deepEqual(cells, [
    { choreId: 'everyday', dayOfWeek: 0 },
    { choreId: 'everyday', dayOfWeek: 1 },
    { choreId: 'tuesdays', dayOfWeek: 2 },
  ])
})

t('a row with a null day_of_week fills nothing', () => {
  const cells = missingDueCells([everyday], [{ chore_id: 'everyday', day_of_week: null }], 0)
  assert.deepEqual(cells, [{ choreId: 'everyday', dayOfWeek: 0 }])
})

group('missingDueCells: empty inputs')

t('no chores means no cells', () => {
  assert.deepEqual(missingDueCells([], [], 6), [])
})

t('a fully completed week has nothing missing', () => {
  const done = ALL_DAYS.map(day => ({ chore_id: 'everyday', day_of_week: day }))
  assert.deepEqual(missingDueCells([everyday], done, 6), [])
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
