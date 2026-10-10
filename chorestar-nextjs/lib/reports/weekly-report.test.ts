/**
 * Unit tests for the weekly report email's wording and rendering.
 * Run with `npm run test:unit`.
 */
import assert from 'node:assert/strict'
import { kidHeadline, renderWeeklyReport, weekLabel, reportWeekDue, type KidWeek } from './weekly-report'

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
const kid = (over: Partial<KidWeek> = {}): KidWeek => ({ name: 'Maya', choresDone: 12, perfectDays: 3, dueDays: 7, earnedCents: 300, streak: 4, goals: [], ...over })

t('perfect week', () => assert.equal(kidHeadline(kid({ perfectDays: 7 })), 'Maya finished every day. A perfect week!'))
t('some perfect days', () => assert.equal(kidHeadline(kid()), 'Maya had 3 perfect days.'))
t('one perfect day is singular', () => assert.equal(kidHeadline(kid({ perfectDays: 1 })), 'Maya had 1 perfect day.'))
t('ticks but no perfect day', () => assert.equal(kidHeadline(kid({ perfectDays: 0, choresDone: 1 })), 'Maya checked off 1 chore.'))
t('nothing done', () => assert.equal(kidHeadline(kid({ perfectDays: 0, choresDone: 0 })), 'Maya had a quiet week.'))
t('week label', () => assert.equal(weekLabel('2026-10-04'), 'Oct 4 – Oct 10'))
const r = renderWeeklyReport({
  familyName: 'The <Star> Family', weekLabel: 'Oct 4 – Oct 10', currencyCode: 'USD',
  kids: [kid({ goals: [{ title: 'Lego', emoji: '🧱', progressCents: 1700, targetCents: 2500 }] }), kid({ name: 'Leo', earnedCents: 50 })],
  dashboardUrl: 'https://chorestar.app/dashboard', unsubscribeUrl: 'https://chorestar.app/api/reports/weekly/unsubscribe?t=abc',
})
t('subject names the family and week', () => assert.equal(r.subject, "The <Star> Family's week on ChoreStar: Oct 4 – Oct 10"))
t('totals add up', () => assert.ok(r.text.includes('Earned together: $3.50')))
t('goals show progress', () => assert.ok(r.text.includes('🧱 Lego: $17.00 of $25.00')))
t('every email carries the unsubscribe link', () => { assert.ok(r.text.includes('unsubscribe?t=abc')); assert.ok(r.html.includes('unsubscribe?t=abc')) })
t('html escapes family names', () => assert.ok(r.html.includes('The &lt;Star&gt; Family') && !r.html.includes('<Star>')))

t('due on Sunday: reports last week', () => assert.equal(reportWeekDue(new Date('2026-10-11T15:00:00Z'), { timezone: 'America/Chicago', weekly_report_last_sent: null }), '2026-10-04'))
t('not due on Saturday', () => assert.equal(reportWeekDue(new Date('2026-10-10T15:00:00Z'), { timezone: 'UTC', weekly_report_last_sent: null }), null))
t('not twice in one week', () => assert.equal(reportWeekDue(new Date('2026-10-11T15:00:00Z'), { timezone: 'UTC', weekly_report_last_sent: '2026-10-11' }), null))
t("family's own Sunday: Sydney is already Monday", () => assert.equal(reportWeekDue(new Date('2026-10-11T15:00:00Z'), { timezone: 'Australia/Sydney', weekly_report_last_sent: null }), null))

console.log(`\n${passed} passed, ${failed} failed`)
if (failed) process.exit(1)
