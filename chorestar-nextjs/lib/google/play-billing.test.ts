/**
 * Tests for the pure half of Google Play Billing: state -> tier, push
 * decoding, notification names. Run with `npm run test:unit`.
 */
import assert from 'node:assert/strict'
import {
  tierForPlaySubscriptionState, decodePubSubPush, playNotificationName, pushTokenMatches,
  PLAY_PRODUCT_IDS, PLAY_SUBSCRIPTION_PRODUCT_IDS,
} from './play-billing'

let passed = 0
let failed = 0
function t(name: string, fn: () => void) {
  try { fn(); passed++; console.log(`  ok    ${name}`) }
  catch (err) { failed++; console.log(`  FAIL  ${name}`); console.log(`        ${(err as Error).message.split('\n')[0]}`) }
}
const group = (name: string) => console.log(`\n${name}`)

group('tierForPlaySubscriptionState')

t('active, canceled-but-not-expired, and grace period keep premium', () => {
  assert.equal(tierForPlaySubscriptionState('SUBSCRIPTION_STATE_ACTIVE'), 'premium')
  assert.equal(tierForPlaySubscriptionState('SUBSCRIPTION_STATE_CANCELED'), 'premium')
  assert.equal(tierForPlaySubscriptionState('SUBSCRIPTION_STATE_IN_GRACE_PERIOD'), 'premium')
})

t('expired, on hold, and paused remove access', () => {
  assert.equal(tierForPlaySubscriptionState('SUBSCRIPTION_STATE_EXPIRED'), 'free')
  assert.equal(tierForPlaySubscriptionState('SUBSCRIPTION_STATE_ON_HOLD'), 'free')
  assert.equal(tierForPlaySubscriptionState('SUBSCRIPTION_STATE_PAUSED'), 'free')
})

t('pending and unknown states change nothing', () => {
  assert.equal(tierForPlaySubscriptionState('SUBSCRIPTION_STATE_PENDING'), null)
  assert.equal(tierForPlaySubscriptionState('SUBSCRIPTION_STATE_UNSPECIFIED'), null)
  assert.equal(tierForPlaySubscriptionState(undefined), null)
})

group('decodePubSubPush')

const notification = {
  version: '1.0', packageName: 'com.chorestar.app', eventTimeMillis: '1789900000000',
  subscriptionNotification: { version: '1.0', notificationType: 4, purchaseToken: 'tok_abc', subscriptionId: 'chorestar_premium_monthly' },
}
const push = { message: { data: Buffer.from(JSON.stringify(notification)).toString('base64'), messageId: '1' }, subscription: 'projects/x/subscriptions/y' }

t('decodes the base64 developer notification out of a push envelope', () => {
  const d = decodePubSubPush(push)
  assert.equal(d?.packageName, 'com.chorestar.app')
  assert.equal(d?.subscriptionNotification?.notificationType, 4)
  assert.equal(d?.subscriptionNotification?.purchaseToken, 'tok_abc')
})

t('rejects malformed envelopes without throwing', () => {
  assert.equal(decodePubSubPush(null), null)
  assert.equal(decodePubSubPush({}), null)
  assert.equal(decodePubSubPush({ message: { data: '%%%not-base64-json' } }), null)
  assert.equal(decodePubSubPush({ message: { data: Buffer.from('"just a string"').toString('base64') } }), null)
})

t('a test notification decodes too (the Console "send test" button)', () => {
  const d = decodePubSubPush({ message: { data: Buffer.from(JSON.stringify({ version: '1.0', packageName: 'com.chorestar.app', testNotification: { version: '1.0' } })).toString('base64') } })
  assert.ok(d?.testNotification)
})

group('names, ids, token check')

t('notification type ints map to names; unknown ints stay legible', () => {
  assert.equal(playNotificationName(4), 'SUBSCRIPTION_PURCHASED')
  assert.equal(playNotificationName(13), 'SUBSCRIPTION_EXPIRED')
  assert.equal(playNotificationName(99), 'UNKNOWN_99')
  assert.equal(playNotificationName(undefined), 'UNKNOWN')
})

t('the two product ids are the only subscriptions we honor', () => {
  assert.deepEqual([...PLAY_SUBSCRIPTION_PRODUCT_IDS].sort(), ['chorestar_premium_monthly', 'chorestar_premium_yearly'])
  assert.equal(PLAY_PRODUCT_IDS.monthly, 'chorestar_premium_monthly')
})

t('push token compare: exact match only, never on missing config', () => {
  assert.equal(pushTokenMatches('abc', 'abc'), true)
  assert.equal(pushTokenMatches('abd', 'abc'), false)
  assert.equal(pushTokenMatches('abc', undefined), false)
  assert.equal(pushTokenMatches(null, 'abc'), false)
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
