/**
 * Unit tests for the PDF text rules. Run with `npm run test:unit`.
 */
import assert from 'node:assert/strict'
import { chartTitle, characters, fitText, isRightToLeft, needsBrowserText } from './pdf-text'

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

t('English stays real text', () => assert.equal(needsBrowserText("Maya's Weekly Chore Chart"), false))
t('Spanish, Portuguese and French stay real text', () => assert.equal(needsBrowserText('José Ñáñez São Cœur'), false))
t('prices and PDF punctuation stay real text', () => assert.equal(needsBrowserText('€5 – “ok” • £2…'), false))
t('Arabic is drawn by the browser', () => assert.equal(needsBrowserText('ليان'), true))
t('Cyrillic and Chinese are drawn by the browser', () => {
  assert.equal(needsBrowserText('Маша'), true)
  assert.equal(needsBrowserText('小明'), true)
})
t('emoji are drawn by the browser', () => assert.equal(needsBrowserText('Leo 🌟'), true))
t('right-to-left is detected, Latin is not', () => {
  assert.equal(isRightToLeft('ليان'), true)
  assert.equal(isRightToLeft('שרה'), true)
  assert.equal(isRightToLeft('Maya'), false)
})
t('an English line with an Arabic name stays left to right', () => assert.equal(isRightToLeft("ليان's Weekly Chore Chart"), false))
t('cutting never splits an emoji', () => assert.deepEqual(characters('a👨‍👩‍👧b'), ['a', '👨‍👩‍👧', 'b']))
t('a named chart', () => assert.equal(chartTitle('Maya', 'stars'), "Maya's Weekly Chore Chart"))
t('no name never prints "My\'s"', () => {
  assert.equal(chartTitle(' ', 'stars'), 'My Weekly Chore Chart')
  assert.equal(chartTitle('', 'rainbow'), 'My Week')
  assert.equal(chartTitle('', 'minimal'), 'Weekly Chores')
})
const byLength = (s: string) => s.length
t('text that fits is untouched', () => assert.equal(fitText('Dishes', 10, byLength), 'Dishes'))
t('long text is cut with an ellipsis', () => assert.equal(fitText('Empty the dishwasher', 10, byLength), 'Empty t...'))
t('a cut never leaves a space before the ellipsis', () => assert.equal(fitText('Take out trash', 8, byLength), 'Take...'))

console.log(`\n${passed} passed, ${failed} failed`)
if (failed) process.exit(1)
