/**
 * Unit tests for the pure half of signup attribution (migration 021):
 * building a visit record from a URL + referrer, and the first-touch merge
 * rule (a tagged campaign beats an untagged first touch, nothing else does).
 * Run with `npm run test:unit`.
 */
import assert from 'node:assert/strict'
import { visitRecord, firstTouch, type AttributionRecord } from './attribution'

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

const NOW = new Date('2026-09-13T12:00:00Z')

group('visitRecord')

t('captures utm parameters and the landing path', () => {
  const rec = visitRecord(
    new URL('https://chorestar.app/blog/some-post?utm_source=reddit&utm_medium=social&utm_campaign=launch'),
    '',
    NOW
  )
  assert.equal(rec?.utm_source, 'reddit')
  assert.equal(rec?.utm_medium, 'social')
  assert.equal(rec?.utm_campaign, 'launch')
  assert.equal(rec?.landing, '/blog/some-post')
  assert.equal(rec?.captured_at, NOW.toISOString())
})

t('keeps an external referrer, origin and path only', () => {
  const rec = visitRecord(
    new URL('https://chorestar.app/'),
    'https://www.reddit.com/r/iosapps/comments/abc?share=1',
    NOW
  )
  assert.equal(rec?.referrer, 'https://www.reddit.com/r/iosapps/comments/abc')
})

t('drops a same-origin referrer (navigation, not attribution)', () => {
  const rec = visitRecord(new URL('https://chorestar.app/signup'), 'https://chorestar.app/', NOW)
  assert.equal(rec?.referrer, undefined)
  assert.equal(rec?.landing, '/signup')
})

t('tolerates an unparseable referrer', () => {
  const rec = visitRecord(new URL('https://chorestar.app/'), 'not a url', NOW)
  assert.equal(rec?.referrer, undefined)
})

t('clips oversized values to 200 characters', () => {
  const rec = visitRecord(
    new URL(`https://chorestar.app/?utm_source=${'x'.repeat(500)}`),
    '',
    NOW
  )
  assert.equal(rec?.utm_source?.length, 200)
})

group('firstTouch merge')

const untagged: AttributionRecord = { referrer: 'https://google.com/', landing: '/', captured_at: '2026-09-01T00:00:00Z' }
const tagged: AttributionRecord = { utm_source: 'reddit', landing: '/', captured_at: '2026-09-10T00:00:00Z' }

t('first visit wins by default', () => {
  const later: AttributionRecord = { referrer: 'https://bing.com/', landing: '/pricing' }
  assert.equal(firstTouch(untagged, later), untagged)
})

t('a tagged visit replaces an untagged first touch', () => {
  assert.equal(firstTouch(untagged, tagged), tagged)
})

t('a tagged first touch is never replaced', () => {
  const laterTagged: AttributionRecord = { utm_source: 'linkedin', landing: '/' }
  assert.equal(firstTouch(tagged, laterTagged), tagged)
})

t('handles empty sides', () => {
  assert.equal(firstTouch(null, tagged), tagged)
  assert.equal(firstTouch(untagged, null), untagged)
  assert.equal(firstTouch(null, null), null)
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
