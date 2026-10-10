/**
 * Unit tests for keepPremiumReason: when one billing rail ends, a family still
 * paying on another keeps Premium. Run with `npm run test:unit`.
 */
import assert from 'node:assert/strict'
import { keepPremiumReason } from './keep-premium'

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

t('lifetime is never downgraded', () => assert.equal(keepPremiumReason({ tier: 'lifetime', ending: 'stripe', active: {} }), 'kept-lifetime'))
t('Stripe ends, Apple still active: keep', () => assert.equal(keepPremiumReason({ tier: 'premium', ending: 'stripe', active: { apple: true } }), 'kept-apple-active'))
t('Apple ends, Google still active: keep', () => assert.equal(keepPremiumReason({ tier: 'premium', ending: 'apple', active: { google: true } }), 'kept-google-active'))
t('Google ends, Stripe still active: keep', () => assert.equal(keepPremiumReason({ tier: 'premium', ending: 'google', active: { stripe: true } }), 'kept-stripe-active'))
t('the ending rail itself never keeps premium', () => assert.equal(keepPremiumReason({ tier: 'premium', ending: 'apple', active: { apple: true } }), null))
t('nothing else active: downgrade', () => assert.equal(keepPremiumReason({ tier: 'premium', ending: 'stripe', active: { apple: false, google: false } }), null))

console.log(`\n${passed} passed, ${failed} failed`)
if (failed) process.exit(1)
