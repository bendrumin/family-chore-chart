/**
 * Unit tests for trialDaysFor: the yearly plan's 7-day trial, once per family.
 * Run with `npm run test:unit`.
 */
import assert from 'node:assert/strict'
import { trialDaysFor, TRIAL_DAYS } from './trial'

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

const fresh = { stripeSubscriptions: 0, appleOriginalTransactionId: null, googlePurchaseToken: null }

t('a new family gets 7 days on yearly', () => assert.equal(trialDaysFor('annual', fresh), TRIAL_DAYS))
t('a new family gets 7 days on monthly too', () => assert.equal(trialDaysFor('monthly', fresh), TRIAL_DAYS))
t('lifetime has no trial', () => assert.equal(trialDaysFor('lifetime', fresh), null))
t('a past subscriber gets no monthly trial either', () => assert.equal(trialDaysFor('monthly', { ...fresh, stripeSubscriptions: 1 }), null))
t('a past Stripe subscriber buys straight away', () => assert.equal(trialDaysFor('annual', { ...fresh, stripeSubscriptions: 1 }), null))
t('an Apple subscriber (even lapsed) gets no web trial', () => assert.equal(trialDaysFor('annual', { ...fresh, appleOriginalTransactionId: '2000001' }), null))
t('a Google subscriber gets no web trial', () => assert.equal(trialDaysFor('annual', { ...fresh, googlePurchaseToken: 'tok' }), null))

console.log(`\n${passed} passed, ${failed} failed`)
if (failed) process.exit(1)
