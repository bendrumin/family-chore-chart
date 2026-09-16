/**
 * Unit tests for the free-plan limits. The numbers here are load-bearing:
 * marketing copy says "3 kids and 20 chores" everywhere, and the iOS app
 * enforces the same 20 (SupabaseManager.choreLimit), so a drift in either
 * limit is a cross-platform bug, and these tests pin them.
 * Run with `npm run test:unit`.
 */
import assert from 'node:assert/strict'
import { isPremium, getChildLimit, getChoreLimit } from './subscription'

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

group('isPremium')

t('premium and lifetime are premium', () => {
  assert.equal(isPremium('premium'), true)
  assert.equal(isPremium('lifetime'), true)
})

t('free, undefined, and junk strings are not', () => {
  assert.equal(isPremium('free'), false)
  assert.equal(isPremium(undefined), false)
  assert.equal(isPremium('Premium'), false)
})

group('limits')

t('free plan: 3 kids, 20 chores (the numbers the marketing promises)', () => {
  assert.equal(getChildLimit('free'), 3)
  assert.equal(getChoreLimit('free'), 20)
})

t('unknown tier is treated as free', () => {
  assert.equal(getChildLimit(undefined), 3)
  assert.equal(getChoreLimit(''), 20)
})

t('premium and lifetime are unlimited', () => {
  assert.equal(getChildLimit('premium'), Infinity)
  assert.equal(getChoreLimit('premium'), Infinity)
  assert.equal(getChildLimit('lifetime'), Infinity)
  assert.equal(getChoreLimit('lifetime'), Infinity)
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
