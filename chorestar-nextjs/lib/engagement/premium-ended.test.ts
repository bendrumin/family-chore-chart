/**
 * Unit tests for the "Premium ended, here is what paused" email. Run with `npm run test:unit`.
 */
import assert from 'node:assert/strict'
import { premiumEndedEmail } from './premium-ended'

const limits = { kids: 3, chores: 20 }

const both = premiumEndedEmail({ kids: ['Leo'], chores: 25, limits })
assert.equal(both.subject, 'Leo and 25 chores are paused, nothing is deleted')
assert.match(both.text, /so Leo and 25 chores are paused for now/)
assert.match(both.text, /Nothing is deleted/)
assert.match(both.text, /Choose what stays on/)

const one = premiumEndedEmail({ kids: [], chores: 1, limits })
assert.equal(one.subject, '1 chore is paused, nothing is deleted')
assert.match(one.text, /so 1 chore is paused/)

assert.equal(premiumEndedEmail({ kids: ['Leo', 'Mia'], chores: 0, limits }).subject, 'Leo and Mia are paused, nothing is deleted')
assert.ok(!both.text.includes('—'), 'no em dashes')

console.log('premium-ended tests passed')
