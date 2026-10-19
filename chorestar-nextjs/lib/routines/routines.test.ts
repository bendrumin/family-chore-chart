/**
 * Unit tests for the routine upgrades (migration 032): picture-step paths,
 * the gentle finish-by timer, read-aloud language choice, and the live-view
 * helpers. Run with `npm run test:unit`.
 */
import assert from 'node:assert/strict'
import {
  stepPhotoObjectPath,
  isStepPhotoPathFor,
  allowedStepImagePath,
  orphanedStepPhotos,
} from './step-photos'
import {
  routineTimeStatus,
  finishedEarlyBy,
  formatClock,
  targetMinutesToSeconds,
  suggestedTargetSeconds,
} from './routine-timer'
import { toSpeechTag, speechLangFor, speechTextFor } from './speech'
import { isProgressFresh, liveProgressLine, createThrottledReporter, STALE_AFTER_MS } from './live-progress'

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

const OWNER = 'AAAAAAAA-1111-4111-8111-111111111111'
const CHILD = 'bbbbbbbb-2222-4222-8222-222222222222'
const OTHER_CHILD = 'cccccccc-3333-4333-8333-333333333333'
const PHOTO = 'dddddddd-4444-4444-8444-444444444444'

// --- step photos -----------------------------------------------------------

t('object path is lowercased owner/child/uuid.jpg', () =>
  assert.equal(stepPhotoObjectPath(OWNER, CHILD, PHOTO), `${OWNER.toLowerCase()}/${CHILD}/${PHOTO}.jpg`))

t('a path in the family folder passes', () =>
  assert.ok(isStepPhotoPathFor(stepPhotoObjectPath(OWNER, CHILD, PHOTO), OWNER)))

t('a path in another family folder fails', () =>
  assert.ok(!isStepPhotoPathFor(stepPhotoObjectPath(OTHER_CHILD, CHILD, PHOTO), OWNER)))

t('a path for another child fails when the child is given', () =>
  assert.ok(!isStepPhotoPathFor(stepPhotoObjectPath(OWNER, OTHER_CHILD, PHOTO), OWNER, CHILD)))

t('traversal, extra folders and junk names fail', () => {
  const o = OWNER.toLowerCase()
  assert.ok(!isStepPhotoPathFor(`${o}/../x/${PHOTO}.jpg`, OWNER))
  assert.ok(!isStepPhotoPathFor(`${o}/${CHILD}/a/${PHOTO}.jpg`, OWNER))
  assert.ok(!isStepPhotoPathFor(`${o}/${CHILD}/photo.jpg`, OWNER))
  assert.ok(!isStepPhotoPathFor(`${o}/${CHILD}/${PHOTO}.png`, OWNER))
  assert.ok(!isStepPhotoPathFor(null, OWNER))
  assert.ok(!isStepPhotoPathFor(42, OWNER))
})

t('premium may save a new picture; free may not', () => {
  const path = stepPhotoObjectPath(OWNER, CHILD, PHOTO)
  const none = new Set<string>()
  assert.equal(allowedStepImagePath(path, { ownerId: OWNER, childId: CHILD, premium: true, existing: none }), path)
  assert.equal(allowedStepImagePath(path, { ownerId: OWNER, childId: CHILD, premium: false, existing: none }), null)
})

t('free plan keeps a picture the routine already had', () => {
  const path = stepPhotoObjectPath(OWNER, CHILD, PHOTO)
  assert.equal(allowedStepImagePath(path, { ownerId: OWNER, childId: CHILD, premium: false, existing: new Set([path]) }), path)
})

t('premium still cannot point at another child', () => {
  const path = stepPhotoObjectPath(OWNER, OTHER_CHILD, PHOTO)
  assert.equal(allowedStepImagePath(path, { ownerId: OWNER, childId: CHILD, premium: true, existing: new Set() }), null)
})

t('orphaned pictures are the ones dropped by a save', () => {
  assert.deepEqual(orphanedStepPhotos(['a', 'b', null, 'c'], ['b', undefined, 'd']), ['a', 'c'])
  assert.deepEqual(orphanedStepPhotos([], ['x']), [])
})

// --- finish-by timer -------------------------------------------------------

t('timer starts with plenty of time', () => {
  const s = routineTimeStatus(0, 1200)
  assert.equal(s.remainingSeconds, 1200)
  assert.equal(s.fractionLeft, 1)
  assert.equal(s.phase, 'plenty')
  assert.ok(!s.overTime)
})

t('timer phases step down calmly', () => {
  assert.equal(routineTimeStatus(700, 1200).phase, 'some')
  assert.equal(routineTimeStatus(1000, 1200).phase, 'little')
})

t('running over is not a failure, just "over" with zero left', () => {
  const s = routineTimeStatus(1500, 1200)
  assert.equal(s.remainingSeconds, 0)
  assert.equal(s.fractionLeft, 0)
  assert.ok(s.overTime)
  assert.equal(s.phase, 'over')
})

t('finishing early is reported; a whisker early or late is not', () => {
  assert.equal(finishedEarlyBy(900, 1200), 300)
  assert.equal(finishedEarlyBy(1190, 1200), null)
  assert.equal(finishedEarlyBy(1300, 1200), null)
  assert.equal(finishedEarlyBy(300, null), null)
})

t('clock formats minutes and seconds', () => {
  assert.equal(formatClock(0), '0:00')
  assert.equal(formatClock(65), '1:05')
  assert.equal(formatClock(1200), '20:00')
  assert.equal(formatClock(-3), '0:00')
})

t('builder minutes become clamped seconds', () => {
  assert.equal(targetMinutesToSeconds('20'), 1200)
  assert.equal(targetMinutesToSeconds(''), null)
  assert.equal(targetMinutesToSeconds('0'), null)
  assert.equal(targetMinutesToSeconds('abc'), null)
  assert.equal(targetMinutesToSeconds(500), 7200)
})

t('suggested finish-by is the step timers plus slack, whole minutes', () => {
  assert.equal(suggestedTargetSeconds([{ duration_seconds: 120 }, { duration_seconds: 600 }, {}]), 840)
  assert.equal(suggestedTargetSeconds([{}, { duration_seconds: null }]), null)
  assert.equal(suggestedTargetSeconds([{ duration_seconds: 10 }]), 60)
})

// --- read aloud -----------------------------------------------------------

t('short language codes map to voices', () => {
  assert.equal(toSpeechTag('es'), 'es-ES')
  assert.equal(toSpeechTag('pt'), 'pt-BR')
  assert.equal(toSpeechTag('en-GB'), 'en-GB')
  assert.equal(toSpeechTag('pt_PT'), 'pt-PT')
  assert.equal(toSpeechTag(''), null)
  assert.equal(toSpeechTag('not a lang!'), null)
})

t('a localized template title speaks in the kid locale', () =>
  assert.equal(speechLangFor({ familyLanguage: 'en', kidLocale: 'es', localized: true }), 'es-ES'))

t('a parent-typed title speaks in the family language', () =>
  assert.equal(speechLangFor({ familyLanguage: 'fr', kidLocale: 'es', localized: false, deviceLanguage: 'es-MX' }), 'fr-FR'))

t('no family language falls back to the device, then English', () => {
  assert.equal(speechLangFor({ familyLanguage: null, deviceLanguage: 'de-DE' }), 'de-DE')
  assert.equal(speechLangFor({}), 'en-US')
})

t('spoken text joins title and description', () => {
  assert.equal(speechTextFor('Brush teeth', null), 'Brush teeth')
  assert.equal(speechTextFor('Brush teeth', 'Top and bottom'), 'Brush teeth. Top and bottom')
  assert.equal(speechTextFor('Shoes on!', 'Velcro ones'), 'Shoes on! Velcro ones')
})

// --- live view -------------------------------------------------------------

t('progress is fresh for half an hour', () => {
  const now = Date.parse('2026-10-19T08:00:00Z')
  assert.ok(isProgressFresh('2026-10-19T07:45:00Z', now))
  assert.ok(!isProgressFresh(now - STALE_AFTER_MS - 1, now))
  assert.ok(!isProgressFresh('garbage', now))
})

t('live line reads naturally', () => {
  assert.equal(
    liveProgressLine({ childName: 'Maya', stepIndex: 2, stepsTotal: 6, stepTitle: 'Brush teeth' }),
    'Maya is on step 3 of 6 — Brush teeth'
  )
  assert.equal(liveProgressLine({ childName: 'Leo', stepIndex: 9, stepsTotal: 4 }), 'Leo is on step 4 of 4')
})

t('throttled reporter sends first, holds the latest, flushes on time', () => {
  let now = 0
  const timers: Array<{ at: number; fn: () => void; id: number }> = []
  let nextId = 1
  const clock = {
    now: () => now,
    setTimeout: (fn: () => void, ms: number) => {
      const id = nextId++
      timers.push({ at: now + ms, fn, id })
      return id
    },
    clearTimeout: (h: unknown) => {
      const i = timers.findIndex(x => x.id === h)
      if (i >= 0) timers.splice(i, 1)
    },
  }
  const sent: number[] = []
  const r = createThrottledReporter<number>(v => sent.push(v), 4000, clock)
  r.report(0)
  assert.deepEqual(sent, [0])
  now = 1000
  r.report(1)
  now = 2000
  r.report(2)
  assert.deepEqual(sent, [0])
  assert.equal(timers.length, 1)
  now = 4000
  timers.shift()!.fn()
  assert.deepEqual(sent, [0, 2])
  now = 5000
  r.report(3)
  r.flush()
  assert.deepEqual(sent, [0, 2, 3])
  now = 6000
  r.report(4)
  r.cancel()
  assert.equal(timers.length, 0)
  assert.deepEqual(sent, [0, 2, 3])
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
