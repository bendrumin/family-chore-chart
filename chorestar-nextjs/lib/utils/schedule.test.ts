/**
 * Unit tests for the week display order. Run with `npm run test:unit`.
 *
 * weekDisplayOrder returns STORAGE day indexes (0=Sunday .. 6=Saturday) in the
 * locale's display order — the values never change meaning, only their order.
 */
import assert from 'node:assert/strict'
import { ALL_DAYS, weekDisplayOrder } from './schedule'

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

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
