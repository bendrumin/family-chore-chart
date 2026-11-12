/**
 * Unit tests for Star Pet requests (migration 039). Run with `npm run test:unit`.
 */
import assert from 'node:assert/strict'
import { ASK_PUSH_COOLDOWN_HOURS, canAskFor, petRequestPush, petRequestTitle, shouldPushAsk } from './requests'

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

t('a free-plan kid can ask for every species but the pup', () => {
  for (const s of ['kitty', 'bunny', 'dino', 'panda', 'owl'] as const) assert.equal(canAskFor(s, false), true)
  assert.equal(canAskFor('pup', false), false)
})

t('a Premium family has nothing to ask for', () => {
  assert.equal(canAskFor('kitty', true), false)
})

t('the parent is told who wants which pet', () => {
  assert.equal(petRequestTitle('Maya', 'kitty'), 'Maya wants the kitty 🐱')
  const push = petRequestPush('Leo', 'dino')
  assert.equal(push.title, 'Leo wants the dino 🦖')
  assert.match(push.body, /Premium unlocks all six/)
})

t('a fresh ask pushes; changing their mind within a day does not', () => {
  const now = new Date('2026-11-12T18:00:00Z')
  assert.equal(shouldPushAsk(null, now), true)
  assert.equal(shouldPushAsk('2026-11-12T17:00:00Z', now), false)
  const old = new Date(now.getTime() - (ASK_PUSH_COOLDOWN_HOURS + 1) * 3_600_000).toISOString()
  assert.equal(shouldPushAsk(old, now), true)
})

t('a request stamped in the future (clock skew) still pushes', () => {
  assert.equal(shouldPushAsk('2026-11-13T18:00:00Z', new Date('2026-11-12T18:00:00Z')), true)
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
