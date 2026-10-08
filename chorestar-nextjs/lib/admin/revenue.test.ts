/**
 * Unit tests for the admin Revenue tab's totaling rules: plan detection,
 * currency conversion, and what counts toward gross, this month and MRR.
 * Run with `npm run test:unit`.
 */
import assert from 'node:assert/strict'
import { planOf, toUsd, summarize, type Purchase, type Subscriber } from './revenue'

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

const buy = (over: Partial<Purchase>): Purchase => ({
  family: 'F', email: 'f@x.com', channel: 'apple', plan: 'monthly', date: '2026-10-07T20:30:00.000Z',
  amount: 4.99, currency: 'USD', usd: 4.99, country: 'USA', kind: 'purchase', ...over,
})
const sub = (over: Partial<Subscriber>): Subscriber => ({
  family: 'F', email: 'f@x.com', channel: 'apple', plan: 'monthly', price: 4.99, currency: 'USD', usd: 4.99,
  country: 'USA', since: '2026-09-01T00:00:00.000Z', status: 'active', periodEnds: null, ...over,
})
const NOW = new Date('2026-10-08T12:00:00Z')

group('planOf')
t('Apple yearly product id', () => assert.equal(planOf('com.chorestar.premium.yearly'), 'yearly'))
t('Apple monthly product id', () => assert.equal(planOf('com.chorestar.premium.monthly'), 'monthly'))
t('Stripe interval "year"', () => assert.equal(planOf('year'), 'yearly'))
t('lifetime', () => assert.equal(planOf('ChoreStar Lifetime'), 'lifetime'))
t('unknown', () => assert.equal(planOf(null), 'other'))

group('toUsd')
t('SAR is pegged at 3.75', () => assert.equal(toUsd(19.99, 'SAR'), 5.33))
t('USD passes through', () => assert.equal(toUsd(49.99, 'usd'), 49.99))
t('unknown currency is null, not zero', () => assert.equal(toUsd(10, 'XYZ'), null))

group('summarize')
t('refunds are left out of gross', () => {
  const s = summarize([buy({}), buy({ kind: 'refunded', usd: 49.99, amount: 49.99 })], [], NOW)
  assert.equal(s.totals.grossUsd, 4.99)
})
t('this month only counts this month', () => {
  const s = summarize([buy({}), buy({ date: '2026-09-17T00:00:00.000Z' })], [], NOW)
  assert.equal(s.totals.thisMonthUsd, 4.99)
})
t('MRR: yearly is a twelfth, auto-renew off does not recur', () => {
  const s = summarize([], [
    sub({ plan: 'yearly', usd: 49.99 }),
    sub({ usd: 4.99 }),
    sub({ status: 'auto-renew off', usd: 3.73 }),
  ], NOW)
  assert.equal(s.totals.mrrUsd, 9.16)
})
t('Apple proceeds are 85%', () => assert.equal(summarize([buy({ usd: 10, amount: 10 })], [], NOW).totals.estProceedsUsd, 8.5))
t('a renewal is the same paying family', () => {
  const s = summarize([buy({}), buy({ kind: 'renewal' }), buy({ email: 'g@x.com' })], [], NOW)
  assert.equal(s.totals.payingFamilies, 2)
})
t('per-currency totals keep the original currency', () => {
  const s = summarize([buy({ amount: 19.99, currency: 'SAR', usd: 5.33 }), buy({ amount: 19.99, currency: 'SAR', usd: 5.33, kind: 'renewal' })], [], NOW)
  assert.deepEqual(s.byCurrency, [{ currency: 'SAR', amount: 39.98 }])
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed) process.exit(1)
