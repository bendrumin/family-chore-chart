/**
 * Unit tests for shared-chore rotation: week math and whose turn it is.
 * Run with `npm run test:unit`.
 */
import assert from 'node:assert/strict'
import { sundayOf, weekNumber, turnIndex, rotationChanges } from './chore-rotation'

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

t('sundayOf a Wednesday', () => assert.equal(sundayOf(new Date('2026-10-07T15:00:00Z')), '2026-10-04'))
t('sundayOf a Sunday is itself', () => assert.equal(sundayOf(new Date('2026-10-04T12:00:00Z')), '2026-10-04'))
t('sundayOf respects the family timezone (Sat night in Chicago, Sun UTC)', () =>
  assert.equal(sundayOf(new Date('2026-10-11T03:00:00Z'), 'America/Chicago'), '2026-10-04'))
t('weekNumber steps by one a week', () => assert.equal(weekNumber('2026-10-11') - weekNumber('2026-10-04'), 1))
t('turn 0 in the starting week', () => assert.equal(turnIndex(3, '2026-10-04', '2026-10-04'), 0))
t('turn advances weekly and wraps', () => {
  assert.equal(turnIndex(3, '2026-10-04', '2026-10-11'), 1)
  assert.equal(turnIndex(3, '2026-10-04', '2026-10-18'), 2)
  assert.equal(turnIndex(3, '2026-10-04', '2026-10-25'), 0)
})
t('a week before the start still lands on a member', () => assert.equal(turnIndex(2, '2026-10-11', '2026-10-04'), 1))
t('changes flip only what is wrong', () => {
  const members = [
    { id: 'a', rotation_order: 0, is_active: true },
    { id: 'b', rotation_order: 1, is_active: false },
  ]
  assert.deepEqual(rotationChanges(members, '2026-10-04', '2026-10-04'), [])
  assert.deepEqual(rotationChanges(members, '2026-10-04', '2026-10-11'), [
    { id: 'a', is_active: false },
    { id: 'b', is_active: true },
  ])
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed) process.exit(1)
