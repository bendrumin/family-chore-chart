/**
 * Unit tests for isCronAuthorized. Run with `npm run test:unit`.
 */
import assert from 'node:assert/strict'
import { isCronAuthorized } from './cron-auth'

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

t('the right bearer passes', () => assert.equal(isCronAuthorized('Bearer s3cret', 's3cret'), true))
t('no header is refused', () => assert.equal(isCronAuthorized(null, 's3cret'), false))
t('a wrong secret is refused', () => assert.equal(isCronAuthorized('Bearer nope', 's3cret'), false))
t('the bare secret without Bearer is refused', () => assert.equal(isCronAuthorized('s3cret', 's3cret'), false))
t('no configured secret refuses everything', () => assert.equal(isCronAuthorized('Bearer ', ''), false))

console.log(`\n${passed} passed, ${failed} failed`)
if (failed) process.exit(1)
