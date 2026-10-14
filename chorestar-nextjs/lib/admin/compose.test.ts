/**
 * Unit tests for the founder hub's Compose tab helpers.
 * Run with `npm run test:unit`.
 */
import assert from 'node:assert/strict'
import { directCampaign, fillTemplate, joinNames, sentRecently, validateCompose, varsFor, DIRECT_PREFIX } from './compose'

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

const NOW = new Date('2026-10-14T12:00:00Z')

t('names join the way a person writes them', () => {
  assert.equal(joinNames([]), 'your kids')
  assert.equal(joinNames(['Maya']), 'Maya')
  assert.equal(joinNames(['Maya', 'Leo']), 'Maya and Leo')
  assert.equal(joinNames(['Maya', 'Leo', ' Ava ']), 'Maya, Leo and Ava')
})
t('placeholders fill, everywhere they appear', () => {
  const v = varsFor({ familyName: 'Star Family', kidNames: ['Maya', 'Leo'] })
  assert.equal(fillTemplate('Hi {family}! {kids} did great. Thanks, {family}', v), 'Hi Star Family! Maya and Leo did great. Thanks, Star Family')
})
t('a blank family name reads as "there"', () => assert.equal(fillTemplate('Hi {family}', varsFor({ familyName: ' ', kidNames: [] })), 'Hi there'))
t('other braces are left alone', () => assert.equal(fillTemplate('{x} {family}', varsFor({ familyName: 'F', kidNames: [] })), '{x} F'))
t('valid note passes', () => assert.equal(validateCompose({ subject: 'Hi', body: 'Hello {kids}' }), null))
t('empty subject or body is refused', () => {
  assert.match(validateCompose({ subject: ' ', body: 'x' })!, /subject/)
  assert.match(validateCompose({ subject: 'x', body: '\n' })!, /message/)
})
t('a multi-line subject is refused (no header injection)', () => assert.match(validateCompose({ subject: 'a\nBcc: x@y.z', body: 'x' })!, /one line/))
t('a mistyped placeholder is caught', () => assert.match(validateCompose({ subject: 'Hi', body: 'Hi {famly}' })!, /\{famly\}/))
t('sent within 3 days counts as recent', () => {
  assert.equal(sentRecently(null, NOW), false)
  assert.equal(sentRecently('2026-10-12T13:00:00Z', NOW), true)
  assert.equal(sentRecently('2026-10-10T12:00:00Z', NOW), false)
})
t('direct campaign is labelled, timed and trimmed', () => {
  const c = directCampaign('  A quick question  ', NOW)
  assert.equal(c, `${DIRECT_PREFIX}2026-10-14 12:00 · A quick question`)
  assert.ok(directCampaign('x'.repeat(200), NOW).length < 120)
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed) process.exit(1)
