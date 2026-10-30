/**
 * Unit tests for appStoreLink. Run with `npm run test:unit`.
 */
import assert from 'node:assert/strict'
import { appStoreLink, APP_STORE_URL } from './app-store-link'

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

t('no provider token: the plain link, never a half-tracked one', () => assert.equal(appStoreLink('home', ''), APP_STORE_URL))
t('with a token: Apple\'s campaign format', () =>
  assert.equal(appStoreLink('blog', '123456'), 'https://apps.apple.com/app/apple-store/id6761279049?pt=123456&ct=blog&mt=8'))

console.log(`\n${passed} passed, ${failed} failed`)
if (failed) process.exit(1)
