/**
 * Unit tests for free-trial check-ins. Run with `npm run test:unit`.
 */
import assert from 'node:assert/strict'
import { dayOneTrialPush, dayThreeTrialEmail, endingTrialEmail, endingTrialPush, premiumUsed, trialDay, trialFromApple, trialStepDue, type AppleRow, type TrialStep } from './trial'
import type { FamilyUsage } from './discovery'

const DAY = 86_400_000
const start = new Date('2026-10-28T00:41:00Z')
const end = new Date('2026-11-04T01:40:57Z')
const at = (days: number) => new Date(start.getTime() + days * DAY)
const row = (type: string, created: Date, expires: Date | null, subtype: string | null = null): AppleRow => ({
  user_id: 'u', notification_type: type, subtype, created_at: created.toISOString(), expires_at: expires?.toISOString() ?? null,
})

// The first real monthly trial: subscribed, then switched to yearly (a renewal pref change).
const first = [row('SUBSCRIBED', start, end, 'INITIAL_BUY'), row('DID_CHANGE_RENEWAL_PREF', at(0.02), end, 'UPGRADE')]
const t = trialFromApple(first, at(1))
assert.ok(t, 'a 7-day SUBSCRIBED period is a trial')
assert.equal(t!.endsAt.toISOString(), end.toISOString())
assert.equal(t!.renewing, true)

// A paid month is not a trial.
assert.equal(trialFromApple([row('SUBSCRIBED', start, new Date(start.getTime() + 30 * DAY))], at(1)), null)
// Converted or ended: no longer a trial.
assert.equal(trialFromApple([...first, row('DID_RENEW', end, new Date(end.getTime() + 365 * DAY))], at(1)), null)
assert.equal(trialFromApple([...first, row('EXPIRED', at(2), end)], at(2)), null)
assert.equal(trialFromApple(first, at(8)), null, 'past the end')
// Renewal off, and back on.
const off = [...first, row('DID_CHANGE_RENEWAL_STATUS', at(0.1), end, 'AUTO_RENEW_DISABLED')]
assert.equal(trialFromApple(off, at(1))!.renewing, false)
assert.equal(trialFromApple([...off, row('DID_CHANGE_RENEWAL_STATUS', at(2), end, 'AUTO_RENEW_ENABLED')], at(3))!.renewing, true)
// Order of rows does not matter.
assert.equal(trialFromApple([...off].reverse(), at(1))!.renewing, false)

// Schedule.
const none = new Set<TrialStep>()
const trial = { startedAt: start, endsAt: end, renewing: true }
assert.equal(trialStepDue(trial, at(0.5), none), null, 'nothing on day 0')
assert.equal(trialStepDue(trial, at(1.2), none), 'trial-day1')
assert.equal(trialStepDue(trial, at(1.2), new Set(['trial-day1'])), null)
assert.equal(trialStepDue(trial, at(3.2), new Set(['trial-day1'])), 'trial-day3')
assert.equal(trialStepDue(trial, at(3.2), none), 'trial-day3', 'a missed day 1 is not sent late')
assert.equal(trialStepDue(trial, at(4.5), new Set(['trial-day3'])), null, 'day 1 never follows day 3')
assert.equal(trialStepDue(trial, at(5.5), new Set(['trial-day1', 'trial-day3'])), 'trial-ending')
assert.equal(trialStepDue({ ...trial, renewing: false }, at(5.5), none), null, 'renewal off: renewal-off.ts covers the end')
assert.equal(trialStepDue(trial, at(7.1), none), null, 'over')

assert.equal(trialDay(start, at(0.1)), 1)
assert.equal(trialDay(start, at(3.5)), 4)
assert.equal(trialDay(start, at(9)), 7)

// Copy.
const usage: FamilyUsage = { hasPin: false, hasRoutine: true, hasPet: false, hasMoney: true, hasChallenge: false, hasCalendar: false, kidCount: 1 }
assert.match(dayOneTrialPush('Maya', usage).title, /Maya/)
assert.match(dayOneTrialPush('Maya', usage).body, /PIN/)
assert.notEqual(dayOneTrialPush('Maya', { ...usage, hasPin: true }).body.includes('PIN'), true)
assert.deepEqual(premiumUsed(usage), ['Spend, Save and Give jars'])

const d3 = dayThreeTrialEmail({ kid: 'Maya', stats: { choresDone: 12, routinesDone: 1 }, untried: [{ title: 'A', body: 'a.' }, { title: 'B', body: 'b.' }, { title: 'C', body: 'c.' }], endsAt: end })
assert.match(d3.text, /12 chores checked off and 1 routine finished/)
assert.match(d3.text, /- A\. a\.\n- B\. b\./)
assert.ok(!d3.text.includes('- C'), 'two suggestions at most')
assert.match(dayThreeTrialEmail({ kid: 'Maya', stats: { choresDone: 0, routinesDone: 0 }, untried: [], endsAt: end }).text, /let Maya do it/)

const ending = endingTrialEmail({ rail: 'apple', stats: { choresDone: 30, routinesDone: 0 }, used: [], wouldPause: { kids: ['Leo'], chores: 4 }, endsAt: end })
assert.equal(ending.subject, 'Your free week ends November 4')
assert.match(ending.text, /Leo and 4 chores would pause/)
assert.match(ending.text, /Settings, tap your name, then Subscriptions/)
assert.match(endingTrialEmail({ rail: 'stripe', stats: { choresDone: 0, routinesDone: 0 }, used: [], wouldPause: { kids: [], chores: 0 }, endsAt: end }).text, /Billing, then Manage subscription/)
assert.equal(endingTrialPush(end).title, 'Your free week ends Wednesday')

// House style: no em dashes in anything a family reads.
for (const s of [d3.text, ending.text, endingTrialPush(end).body, dayOneTrialPush('Maya', usage).body]) assert.ok(!s.includes('—'))

console.log('trial tests passed')
