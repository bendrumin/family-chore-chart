/**
 * Unit tests for the renewal-off email copy. Run with `npm run test:unit`.
 */
import assert from 'node:assert/strict'
import { deferredDue, renewalOffEmail, renewalOffTiming } from './renewal-off'
import { FEATURES, untriedFeatures } from './discovery'

const endsOn = new Date('2026-11-24T10:00:00Z')
const none = { hasPin: true, hasRoutine: true, hasPet: false, hasMoney: false, hasChallenge: false, hasCalendar: false, kidCount: 2 }

// Premium features only, never Star Pets (not on iOS), in discovery order.
const untried = untriedFeatures(none, true, 'push').filter((f) => f.premiumOnly)
assert.deepEqual(untried.map((f) => f.id), ['money_jars', 'challenges', 'calendar_feed'])

const e = renewalOffEmail({ untried: untried.map((f) => f.card('Emma')), endsOn })
assert.equal(e.subject, 'Before you go, try this')
assert.match(e.text, /^Hi there,/)
assert.match(e.text, /until November 24/)
assert.match(e.text, /Before you go, try this: Spend, Save and Give jars\./)
assert.match(e.text, /Also included and still waiting for you: Start a family challenge, Put chores on your calendar\./)

// Tried everything: no pitch, the subject is just the date.
const done = renewalOffEmail({ untried: [], endsOn })
assert.equal(done.subject, 'Your ChoreStar Premium runs until November 24')
assert.doesNotMatch(done.text, /Before you go/)

// One feature: no "also" line. No expiry known: no date claimed.
const one = renewalOffEmail({ untried: [FEATURES[3].card('Leo')], endsOn: null })
assert.doesNotMatch(one.text, /Also included/)
assert.match(one.text, /end of your current period/)

for (const m of [e, done, one]) assert.ok(!(m.subject + m.text).includes('—'), 'no em dashes')

// Timing: the Rod case. Bought monthly, renewal off 12 minutes later.
const t0 = new Date('2026-10-27T03:31:00Z')
const minutes = (n: number) => new Date(t0.getTime() + n * 60_000)
const days = (n: number) => new Date(t0.getTime() + n * 86_400_000)
assert.equal(renewalOffTiming({ purchasedAt: t0, endsAt: days(30), now: minutes(12) }), 'later', 'just bought: wait')
assert.equal(renewalOffTiming({ purchasedAt: t0, endsAt: days(7), now: minutes(5) }), 'later', 'free week: wait')
assert.equal(renewalOffTiming({ purchasedAt: t0, endsAt: days(30), now: days(10) }), 'now', 'mid-subscription: send')
assert.equal(renewalOffTiming({ purchasedAt: t0, endsAt: days(2), now: minutes(5) }), 'now', 'ends soon anyway: send')
assert.equal(renewalOffTiming({ purchasedAt: null, endsAt: days(30), now: minutes(5) }), 'now', 'unknown: send, as before')
assert.equal(renewalOffTiming({ purchasedAt: t0, endsAt: null, now: minutes(5) }), 'now')

assert.equal(deferredDue(days(30), days(20)), false, 'too early')
assert.equal(deferredDue(days(30), days(27)), true, 'three days left')
assert.equal(deferredDue(days(30), days(29.5)), true)
assert.equal(deferredDue(days(30), days(31)), false, 'already over')

console.log('renewal-off tests passed')
