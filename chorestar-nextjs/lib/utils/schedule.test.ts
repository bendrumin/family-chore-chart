/**
 * Unit tests for the week display order. Run with `npm run test:unit`.
 *
 * weekDisplayOrder returns STORAGE day indexes (0=Sunday .. 6=Saturday) in the
 * locale's display order — the values never change meaning, only their order.
 */
import assert from 'node:assert/strict'
import {
  ALL_DAYS,
  dueToday,
  isDueOn,
  isOnVacation,
  missingDueCells,
  vacationDaysOfWeek,
  vacationWindowFromSettings,
  weekCompletionRate,
  weekDisplayOrder,
  weeklySlots,
} from './schedule'
import { computeStreaks } from './streak'

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

group('weekDisplayOrder fallback')

t('no locale and no navigator (SSR) is Sunday-first', () => {
  // Node has no `navigator` in this test process, so the implicit path is the
  // same one a server render takes.
  assert.deepEqual(weekDisplayOrder(), [0, 1, 2, 3, 4, 5, 6])
})

t('a nonsense locale tag falls back to Sunday-first', () => {
  assert.deepEqual(weekDisplayOrder('not a locale!!'), [0, 1, 2, 3, 4, 5, 6])
})

group('weekDisplayOrder by locale')

t('en-US starts on Sunday (Intl firstDay 7 maps to index 0)', () => {
  assert.deepEqual(weekDisplayOrder('en-US'), [0, 1, 2, 3, 4, 5, 6])
})

t('en-GB starts on Monday', () => {
  assert.deepEqual(weekDisplayOrder('en-GB'), [1, 2, 3, 4, 5, 6, 0])
})

t('ar-EG starts on Saturday (Intl firstDay 6 stays index 6)', () => {
  assert.deepEqual(weekDisplayOrder('ar-EG'), [6, 0, 1, 2, 3, 4, 5])
})

group('weekDisplayOrder invariants')

t('every order is a permutation of the seven storage indexes', () => {
  for (const tag of ['en-US', 'en-GB', 'ar-EG', 'ar-SA', 'pt-BR', 'de-DE']) {
    const order = weekDisplayOrder(tag)
    assert.equal(order.length, 7, tag)
    assert.deepEqual([...order].sort((a, b) => a - b), [...ALL_DAYS], tag)
  }
})

t('display order is consecutive: each column is the previous day plus one', () => {
  for (const tag of ['en-US', 'en-GB', 'ar-EG']) {
    const order = weekDisplayOrder(tag)
    for (let i = 1; i < 7; i++) {
      assert.equal(order[i], (order[i - 1] + 1) % 7, `${tag} column ${i}`)
    }
  }
})

group('missingDueCells: schedule masks')

// 0=Sunday .. 6=Saturday, same convention as the rest of this module.
const everyday = { id: 'everyday', days_of_week: null }
const tuesdays = { id: 'tuesdays', days_of_week: [2] }
const weekdays = { id: 'weekdays', days_of_week: [1, 2, 3, 4, 5] }

t('a Tuesdays-only chore contributes at most one cell across the whole week', () => {
  const cells = missingDueCells([tuesdays], [], 6)
  assert.deepEqual(cells, [{ choreId: 'tuesdays', dayOfWeek: 2 }])
})

t('a Tuesdays-only chore contributes nothing before Tuesday', () => {
  assert.deepEqual(missingDueCells([tuesdays], [], 1), [])
})

t('an empty schedule means every day (the pre-migration fallback)', () => {
  const cells = missingDueCells([{ id: 'legacy', days_of_week: [] }], [], 2)
  assert.deepEqual(
    cells.map(c => c.dayOfWeek),
    [0, 1, 2]
  )
})

t('off-days are never emitted, even when other chores are due then', () => {
  const cells = missingDueCells([everyday, weekdays], [], 0)
  // Sunday: only the everyday chore is due.
  assert.deepEqual(cells, [{ choreId: 'everyday', dayOfWeek: 0 }])
})

group('missingDueCells: throughDay cutoff')

t('throughDay 2 stops after Tuesday', () => {
  const cells = missingDueCells([everyday], [], 2)
  assert.deepEqual(
    cells.map(c => c.dayOfWeek),
    [0, 1, 2]
  )
})

t('throughDay 0 is Sunday only', () => {
  assert.deepEqual(missingDueCells([everyday], [], 0), [{ choreId: 'everyday', dayOfWeek: 0 }])
})

t('a negative throughDay yields nothing', () => {
  assert.deepEqual(missingDueCells([everyday], [], -1), [])
})

t('throughDay past Saturday is clamped to the seven real days', () => {
  assert.equal(missingDueCells([everyday], [], 99).length, 7)
})

group('missingDueCells: existing rows count as filled')

t('an already-completed cell is skipped', () => {
  const cells = missingDueCells([everyday], [{ chore_id: 'everyday', day_of_week: 1 }], 2)
  assert.deepEqual(
    cells.map(c => c.dayOfWeek),
    [0, 2]
  )
})

t('a pending row counts as present, so its cell is not refilled', () => {
  const pending = { chore_id: 'everyday', day_of_week: 1, status: 'pending' }
  const cells = missingDueCells([everyday], [pending], 2)
  assert.deepEqual(
    cells.map(c => c.dayOfWeek),
    [0, 2]
  )
})

t('completions only fill the chore they belong to', () => {
  const cells = missingDueCells(
    [everyday, tuesdays],
    [{ chore_id: 'everyday', day_of_week: 2 }],
    2
  )
  assert.deepEqual(cells, [
    { choreId: 'everyday', dayOfWeek: 0 },
    { choreId: 'everyday', dayOfWeek: 1 },
    { choreId: 'tuesdays', dayOfWeek: 2 },
  ])
})

t('a row with a null day_of_week fills nothing', () => {
  const cells = missingDueCells([everyday], [{ chore_id: 'everyday', day_of_week: null }], 0)
  assert.deepEqual(cells, [{ choreId: 'everyday', dayOfWeek: 0 }])
})

group('missingDueCells: empty inputs')

t('no chores means no cells', () => {
  assert.deepEqual(missingDueCells([], [], 6), [])
})

t('a fully completed week has nothing missing', () => {
  const done = ALL_DAYS.map(day => ({ chore_id: 'everyday', day_of_week: day }))
  assert.deepEqual(missingDueCells([everyday], done, 6), [])
})

group('weekCompletionRate: the denominator is one week of due slots')

t('an everyday chore done all seven days is 100%', () => {
  const done = ALL_DAYS.map(day => ({ chore_id: 'everyday', day_of_week: day }))
  assert.equal(weekCompletionRate([everyday], done), 100)
})

t('nothing done is 0%', () => {
  assert.equal(weekCompletionRate([everyday], []), 0)
})

t('no chores means 0%, not a division by zero', () => {
  assert.equal(weekCompletionRate([], [{ chore_id: 'everyday', day_of_week: 1 }]), 0)
})

t('partial weeks round to whole percents', () => {
  // Weekdays chore: 5 slots, 2 filled = 40%.
  const done = [
    { chore_id: 'weekdays', day_of_week: 1 },
    { chore_id: 'weekdays', day_of_week: 2 },
  ]
  assert.equal(weekCompletionRate([weekdays], done), 40)
})

t('mixed schedules pool their slots', () => {
  // everyday (7 slots) + tuesdays (1 slot) = 8; fill 4 = 50%.
  const done = [
    { chore_id: 'everyday', day_of_week: 0 },
    { chore_id: 'everyday', day_of_week: 1 },
    { chore_id: 'everyday', day_of_week: 2 },
    { chore_id: 'tuesdays', day_of_week: 2 },
  ]
  assert.equal(weekCompletionRate([everyday, tuesdays], done), 50)
})

group('weekCompletionRate: can never exceed 100')

t('duplicate rows for the same cell count once', () => {
  const done = [
    { chore_id: 'tuesdays', day_of_week: 2 },
    { chore_id: 'tuesdays', day_of_week: 2 },
    { chore_id: 'tuesdays', day_of_week: 2 },
  ]
  assert.equal(weekCompletionRate([tuesdays], done), 100)
})

t('many weeks of rows accidentally passed at once still cap at 100 (the 518% bug)', () => {
  // Five weeks of a fully-done everyday chore, unscoped: 35 rows, 7 slots.
  // The old math said 500%; distinct due cells say 100%.
  const fiveWeeks = Array.from({ length: 5 }, () =>
    ALL_DAYS.map(day => ({ chore_id: 'everyday', day_of_week: day }))
  ).flat()
  assert.equal(weekCompletionRate([everyday], fiveWeeks), 100)
})

group('weekCompletionRate: only due cells of listed chores count')

t('an off-schedule tick fills no due cell', () => {
  // Tuesday's chore ticked on Wednesday: real work, but not schedule adherence.
  assert.equal(weekCompletionRate([tuesdays], [{ chore_id: 'tuesdays', day_of_week: 3 }]), 0)
})

t('rows from chores not in the list (deleted or inactive) are ignored', () => {
  const done = [
    { chore_id: 'deleted-chore', day_of_week: 2 },
    { chore_id: 'tuesdays', day_of_week: 2 },
  ]
  assert.equal(weekCompletionRate([tuesdays], done), 100)
})

t('a row with a null day_of_week fills nothing', () => {
  assert.equal(weekCompletionRate([everyday], [{ chore_id: 'everyday', day_of_week: null }]), 0)
})

// ── Vacation mode (migration 019) ────────────────────────────────────────────
// 2026-07-05 is a Sunday, so the week is Sun 07-05 .. Sat 07-11. The window
// under test is Tue 07-07 through Thu 07-09, inclusive on both ends.
const WEEK = '2026-07-05'
const WINDOW = { starts_on: '2026-07-07', ends_on: '2026-07-09' }
const localDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

group('vacation mode: the window is date-only and inclusive on both ends')

t('the starts_on and ends_on days are both inside', () => {
  assert.equal(isOnVacation(localDate('2026-07-07'), [WINDOW]), true)
  assert.equal(isOnVacation(localDate('2026-07-09'), [WINDOW]), true)
})

t('the days on either side are both outside', () => {
  assert.equal(isOnVacation(localDate('2026-07-06'), [WINDOW]), false)
  assert.equal(isOnVacation(localDate('2026-07-10'), [WINDOW]), false)
})

t('no windows means never on vacation', () => {
  assert.equal(isOnVacation(localDate('2026-07-07'), []), false)
  assert.equal(isOnVacation(localDate('2026-07-07'), null), false)
  assert.equal(isOnVacation(localDate('2026-07-07'), undefined), false)
})

t('a single-day window covers exactly that day', () => {
  const oneDay = { starts_on: '2026-07-08', ends_on: '2026-07-08' }
  assert.equal(isOnVacation(localDate('2026-07-08'), [oneDay]), true)
  assert.equal(isOnVacation(localDate('2026-07-07'), [oneDay]), false)
  assert.equal(isOnVacation(localDate('2026-07-09'), [oneDay]), false)
})

group('vacation mode: reading the settings row')

t('a pre-migration row (no columns) means no window', () => {
  assert.equal(vacationWindowFromSettings({}), null)
  assert.equal(vacationWindowFromSettings(null), null)
  assert.equal(vacationWindowFromSettings(undefined), null)
})

t('a half-set or inverted pair means no window', () => {
  assert.equal(vacationWindowFromSettings({ vacation_starts_on: '2026-07-07' }), null)
  assert.equal(vacationWindowFromSettings({ vacation_ends_on: '2026-07-09' }), null)
  assert.equal(
    vacationWindowFromSettings({ vacation_starts_on: '2026-07-09', vacation_ends_on: '2026-07-07' }),
    null
  )
})

t('garbage values mean no window', () => {
  assert.equal(
    vacationWindowFromSettings({ vacation_starts_on: 'soon', vacation_ends_on: 'later' }),
    null
  )
})

t('a valid pair round-trips', () => {
  assert.deepEqual(
    vacationWindowFromSettings({ vacation_starts_on: '2026-07-07', vacation_ends_on: '2026-07-09' }),
    WINDOW
  )
})

group('vacation mode: due-cell derivations')

t('the window maps to day indexes for its week, boundaries included', () => {
  assert.deepEqual([...vacationDaysOfWeek(WEEK, [WINDOW])].sort(), [2, 3, 4])
})

t('a window elsewhere leaves the week untouched', () => {
  assert.equal(vacationDaysOfWeek('2026-08-02', [WINDOW]).size, 0)
})

t('a window spanning the whole week turns every day off', () => {
  const wholeWeek = { starts_on: '2026-07-05', ends_on: '2026-07-11' }
  assert.equal(vacationDaysOfWeek(WEEK, [wholeWeek]).size, 7)
})

t('isDueOn is false inside the window, including both boundary days', () => {
  const vacationDays = vacationDaysOfWeek(WEEK, [WINDOW])
  assert.equal(isDueOn(everyday, 2, vacationDays), false) // starts_on day
  assert.equal(isDueOn(everyday, 4, vacationDays), false) // ends_on day
  assert.equal(isDueOn(everyday, 1, vacationDays), true)
  assert.equal(isDueOn(everyday, 5, vacationDays), true)
})

t('a vacation week holds no due slots and scores no due cells', () => {
  const wholeWeek = vacationDaysOfWeek(WEEK, [{ starts_on: '2026-07-05', ends_on: '2026-07-11' }])
  assert.equal(weeklySlots([everyday, weekdays], wholeWeek), 0)
  assert.equal(missingDueCells([everyday, weekdays], [], 6, wholeWeek).length, 0)
  // Nothing due means a 0% rate by construction, and ticks made anyway
  // cannot fill cells that do not exist.
  const done = ALL_DAYS.map(day => ({ chore_id: 'everyday', day_of_week: day }))
  assert.equal(weekCompletionRate([everyday], done, wholeWeek), 0)
})

t('a partial window removes exactly its days from the backfill', () => {
  const vacationDays = vacationDaysOfWeek(WEEK, [WINDOW])
  const cells = missingDueCells([everyday], [], 6, vacationDays)
  assert.deepEqual(cells.map(c => c.dayOfWeek), [0, 1, 5, 6])
})

t('rates ignore vacation days in both the numerator and the denominator', () => {
  // Everyday chore, Tue-Thu on vacation: 4 slots. Done Sun+Mon = 50%.
  const vacationDays = vacationDaysOfWeek(WEEK, [WINDOW])
  const done = [
    { chore_id: 'everyday', day_of_week: 0 },
    { chore_id: 'everyday', day_of_week: 1 },
    { chore_id: 'everyday', day_of_week: 3 }, // ticked on vacation: fills nothing
  ]
  assert.equal(weekCompletionRate([everyday], done, vacationDays), 50)
})

t('dueToday is empty on a vacation day and unchanged off it', () => {
  assert.deepEqual(dueToday([everyday], localDate('2026-07-08'), [WINDOW]), [])
  assert.deepEqual(dueToday([everyday], localDate('2026-07-10'), [WINDOW]), [everyday])
})

t('omitting the vacation parameter keeps the old behavior exactly', () => {
  assert.equal(isDueOn(everyday, 2), true)
  assert.equal(weeklySlots([everyday]), 7)
  assert.equal(missingDueCells([everyday], [], 6).length, 7)
})

group('vacation mode: streaks skip the window')

// Everyday chore, done Sun 07-05, Mon 07-06, Fri 07-10, Sat 07-11; the
// Tue-Thu gap in between is the vacation.
const streakChores = [{ id: 'everyday', days_of_week: null }]
const streakCompletions = [0, 1, 5, 6].map(day => ({
  chore_id: 'everyday',
  week_start: WEEK,
  day_of_week: day,
  status: 'approved',
}))
const saturday = { weekStart: WEEK, dayOfWeek: 6 }

t('a streak survives a vacation window', () => {
  const s = computeStreaks(streakChores, streakCompletions, saturday, [WINDOW])
  assert.equal(s.current, 4)
  assert.equal(s.best, 4)
})

t('the same gap without a window breaks the streak (sanity check)', () => {
  const s = computeStreaks(streakChores, streakCompletions, saturday)
  assert.equal(s.current, 2)
})

t('on a vacation day nothing is due today and the day is not "perfect"', () => {
  const wednesday = { weekStart: WEEK, dayOfWeek: 3 }
  const s = computeStreaks(streakChores, streakCompletions, wednesday, [WINDOW])
  assert.equal(s.todayDue, 0)
  assert.equal(s.todayDone, 0)
  assert.equal(s.todayPerfect, false)
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
