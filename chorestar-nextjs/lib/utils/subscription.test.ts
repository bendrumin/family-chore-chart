/**
 * Unit tests for the free-plan limits. The numbers here are load-bearing:
 * marketing copy says "3 kids and 20 chores" everywhere, and the iOS app
 * enforces the same 20 (SupabaseManager.choreLimit), so a drift in either
 * limit is a cross-platform bug, and these tests pin them.
 * Run with `npm run test:unit`.
 */
import assert from 'node:assert/strict'
import { isPremium, getChildLimit, getChoreLimit, tierForCheckout, isGrandfathered, canUseFeature, isPremiumTheme, PREMIUM_GATE_CUTOFF } from './subscription'

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

group('tierForCheckout (Stripe webhook)')

t('monthly and annual subscriptions grant premium', () => {
  assert.equal(tierForCheckout('subscription', 'monthly'), 'premium')
  assert.equal(tierForCheckout('subscription', 'annual'), 'premium')
})

t('the one-time lifetime purchase grants lifetime (the $149.99 bug)', () => {
  assert.equal(tierForCheckout('payment', 'lifetime'), 'lifetime')
})

t('anything unexpected grants nothing', () => {
  assert.equal(tierForCheckout('payment', 'monthly'), null)
  assert.equal(tierForCheckout('payment', undefined), null)
  assert.equal(tierForCheckout('setup', 'lifetime'), null)
  assert.equal(tierForCheckout(null, null), null)
})

group('feature gates with grandfathering (docs/PREMIUM.md)')

t('accounts created before the cutoff keep every gated feature on free', () => {
  assert.equal(isGrandfathered('2026-09-10T13:35:00Z'), true)
  assert.equal(canUseFeature('sharing', 'free', '2026-09-10T13:35:00Z'), true)
  assert.equal(canUseFeature('themes', 'free', '2025-07-22T00:00:00Z'), true)
})

t('accounts created at or after the cutoff need premium', () => {
  assert.equal(isGrandfathered(PREMIUM_GATE_CUTOFF), false)
  assert.equal(canUseFeature('export', 'free', '2026-09-19T18:00:00Z'), false)
  assert.equal(canUseFeature('analytics', 'free', '2026-10-01T00:00:00Z'), false)
})

t('premium and lifetime always pass, regardless of age', () => {
  assert.equal(canUseFeature('sharing', 'premium', '2026-12-01T00:00:00Z'), true)
  assert.equal(canUseFeature('themes', 'lifetime', undefined), true)
})

t('missing or garbage created_at is not grandfathered (fail closed for free)', () => {
  assert.equal(isGrandfathered(undefined), false)
  assert.equal(isGrandfathered('not a date'), false)
  assert.equal(canUseFeature('export', 'free', null), false)
})

t('the six premium themes are the ones iOS locks', () => {
  for (const id of ['ocean', 'sunset', 'forest', 'aurora', 'coral', 'lavender']) assert.equal(isPremiumTheme(id), true)
  assert.equal(isPremiumTheme('christmas'), false)
  assert.equal(isPremiumTheme(null), false)
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
