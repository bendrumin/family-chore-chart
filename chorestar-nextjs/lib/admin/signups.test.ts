/**
 * Unit tests for the admin Signups tab's labeling rules: where a signup came
 * from, how it was made, and the zero-filled daily series.
 * Run with `npm run test:unit`.
 */
import assert from 'node:assert/strict'
import { sourceLabel, methodOf, platformOf, dailyCounts, tally, localDay } from './signups'

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

group('source')
t('UTM wins over referrer', () => assert.equal(sourceLabel({ utm_source: 'chatgpt.com', referrer: 'https://www.google.com/' }), 'chatgpt.com'))
t('referrer host, www stripped', () => assert.equal(sourceLabel({ referrer: 'https://www.google.com/search' }), 'google.com'))
t('Reddit Android app package reads as Reddit', () => assert.equal(sourceLabel({ referrer: 'android-app://com.reddit.frontpage/' }), 'reddit.com (app)'))
t('iOS app signups have no web source', () => assert.equal(sourceLabel({ platform: 'ios_app' }), 'In the iOS app'))
t('web with nothing is direct', () => assert.equal(sourceLabel({ platform: 'web', landing: '/' }), 'Direct'))
t('pre-migration accounts', () => assert.equal(sourceLabel(null), 'Not recorded'))

group('method and platform')
t('recorded method wins', () => assert.equal(methodOf({ method: 'apple' }, 'email'), 'Apple'))
t('falls back to the auth provider', () => assert.equal(methodOf(null, 'apple'), 'Apple'))
t('defaults to email', () => assert.equal(methodOf(undefined, undefined), 'Email'))
t('platform labels', () => {
  assert.equal(platformOf({ platform: 'ios_app' }), 'iOS app')
  assert.equal(platformOf({ platform: 'android_app' }), 'Android app')
  assert.equal(platformOf(null), 'Not recorded')
})

group('daily series')
const now = new Date('2026-10-01T17:00:00Z') // noon Central
t('zero-filled, oldest first, ending today', () => {
  const d = dailyCounts([], 7, now)
  assert.equal(d.length, 7)
  assert.equal(d[6].date, '2026-10-01')
  assert.equal(d[0].date, '2026-09-25')
  assert.ok(d.every((x) => x.count === 0))
})
t('9pm Central lands on its own day, not tomorrow (UTC)', () => {
  assert.equal(localDay('2026-10-01T02:00:00Z'), '2026-09-30')
  const d = dailyCounts(['2026-10-01T02:00:00Z', '2026-10-01T15:00:00Z'], 3, now)
  assert.deepEqual(d.map((x) => x.count), [0, 1, 1])
})
t('signups outside the window are ignored', () => assert.equal(dailyCounts(['2026-08-01T12:00:00Z'], 7, now).reduce((s, x) => s + x.count, 0), 0))

group('tally')
t('largest first, ties alphabetical', () =>
  assert.deepEqual(tally(['b', 'a', 'b', 'c', 'a', 'b']), [
    { label: 'b', count: 3 },
    { label: 'a', count: 2 },
    { label: 'c', count: 1 },
  ]))

console.log(`\n${passed} passed, ${failed} failed`)
if (failed) process.exit(1)
