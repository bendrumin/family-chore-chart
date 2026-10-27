/**
 * Unit tests for feature discovery and lapse timing. Run with `npm run test:unit`.
 */
import assert from 'node:assert/strict'
import { FEATURES, cardCopy, copyLang, fallbackPush, untriedFeatures, lapseDue, nextFeature, withinRange, type FamilyUsage } from './discovery'

const none: FamilyUsage = { hasPin: false, hasRoutine: false, hasPet: false, hasMoney: false, hasChallenge: false, hasCalendar: false, kidCount: 2 }
const all: FamilyUsage = { hasPin: true, hasRoutine: true, hasPet: true, hasMoney: true, hasChallenge: true, hasCalendar: true, kidCount: 2 }

// Retention levers first, for everyone.
assert.equal(nextFeature(none, false, 'push')?.id, 'kid_login')
assert.equal(nextFeature({ ...none, hasPin: true }, false, 'push')?.id, 'routines')

// A free family is never pointed at a Premium-only feature.
assert.equal(nextFeature({ ...none, hasPin: true, hasRoutine: true }, false, 'push'), null, 'free, push: nothing left')
assert.equal(nextFeature({ ...none, hasPin: true, hasRoutine: true }, false, 'web')?.id, 'star_pets', 'free gets the pup on web')
assert.equal(nextFeature({ ...none, hasPin: true, hasRoutine: true, hasPet: true }, false, 'web'), null)

// Premium continues into what they are paying for.
assert.equal(nextFeature({ ...none, hasPin: true, hasRoutine: true }, true, 'push')?.id, 'money_jars')
assert.equal(nextFeature({ ...all, hasCalendar: false }, true, 'push')?.id, 'calendar_feed')
assert.equal(nextFeature(all, true, 'web'), null)

// Star Pets never go out by push: the iOS app does not have them yet.
for (const premium of [true, false]) {
  const usage = { ...none, hasPin: true, hasRoutine: true }
  assert.notEqual(nextFeature(usage, premium, 'push')?.id, 'star_pets')
}
assert.ok(!FEATURES.find((f) => f.id === 'star_pets')!.surfaces.includes('push'))

// One kid: no challenges, on any surface.
const solo = { ...none, hasPin: true, hasRoutine: true, hasMoney: true, kidCount: 1 }
assert.equal(nextFeature(solo, true, 'push')?.id, 'calendar_feed')
assert.ok(!untriedFeatures(solo, true, 'web').some((f) => f.id === 'challenges'))

// Dismissed features are skipped, the next one surfaces.
assert.equal(nextFeature(none, true, 'web', new Set(['kid_login']))?.id, 'routines')

// Copy uses the kid's name and carries no em dashes (house style).
for (const f of FEATURES) {
  const p = f.push('Emma')
  const c = f.card('Emma')
  for (const s of [p.title, p.body, c.title, c.body, c.cta]) {
    assert.ok(s.length > 0)
    assert.ok(!s.includes('—'), `em dash in ${f.id}: ${s}`)
  }
}
assert.match(fallbackPush('Leo').body, /Leo/)

// Card translations: every feature, every language, the kid's name where the
// English has it, and no em dashes.
assert.equal(copyLang('pt-BR'), 'pt')
assert.equal(copyLang('es_MX'), 'es')
assert.equal(copyLang('ar'), 'ar')
assert.equal(copyLang('fr'), 'en')
assert.equal(copyLang(null), 'en')
for (const f of FEATURES) {
  const named = f.card('Emma').body.includes('Emma') || f.card('Emma').title.includes('Emma')
  for (const lang of ['es', 'pt', 'ar'] as const) {
    const c = cardCopy(f, 'Emma', lang)
    for (const s of [c.title, c.body, c.cta]) {
      assert.ok(s.length > 0)
      assert.ok(!s.includes('—'), `em dash in ${lang} ${f.id}`)
    }
    assert.notDeepEqual(c, f.card('Emma'), `${lang} ${f.id} is untranslated`)
    if (named) assert.ok((c.title + c.body).includes('Emma'), `${lang} ${f.id} drops the kid's name`)
  }
}
assert.deepEqual(cardCopy(FEATURES[0], 'Emma'), FEATURES[0].card('Emma'))

// Lapse timing.
const now = new Date('2026-10-26T12:00:00Z')
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000)

assert.equal(lapseDue({ lastActivity: null, lastNudged: null, now, onVacation: false }).due, false, 'never active: outreach handles them')
assert.equal(lapseDue({ lastActivity: daysAgo(3), lastNudged: null, now, onVacation: false }).due, false, 'too soon')
assert.equal(lapseDue({ lastActivity: daysAgo(7), lastNudged: null, now, onVacation: false }).due, true, 'a week quiet')
assert.equal(lapseDue({ lastActivity: daysAgo(30), lastNudged: null, now, onVacation: false }).due, true)
assert.equal(lapseDue({ lastActivity: daysAgo(31), lastNudged: null, now, onVacation: false }).due, false, 'long gone')
assert.equal(lapseDue({ lastActivity: daysAgo(10), lastNudged: null, now, onVacation: true }).due, false, 'vacation means quiet')

// One per lapse.
assert.equal(lapseDue({ lastActivity: daysAgo(10), lastNudged: daysAgo(2), now, onVacation: false }).due, false, 'already nudged this lapse')
assert.equal(lapseDue({ lastActivity: daysAgo(10), lastNudged: daysAgo(40), now, onVacation: false }).due, true, 'came back, went quiet again')
assert.equal(lapseDue({ lastActivity: daysAgo(12), lastNudged: null, now, onVacation: false }).daysQuiet, 12)

// Date ranges, inclusive, open-ended allowed.
assert.equal(withinRange('2026-10-26', '2026-10-20', '2026-10-30'), true)
assert.equal(withinRange('2026-10-30', '2026-10-20', '2026-10-30'), true)
assert.equal(withinRange('2026-10-31', '2026-10-20', '2026-10-30'), false)
assert.equal(withinRange('2026-10-26', '2026-10-20', null), true, 'open-ended vacation')
assert.equal(withinRange('2026-10-26', null, null), false)

console.log('discovery tests passed')
