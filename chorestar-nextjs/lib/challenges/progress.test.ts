/**
 * Unit tests for family challenge progress (migration 031). Run with
 * `npm run test:unit`.
 */
import assert from 'node:assert/strict'
import {
  addDays,
  challengePhase,
  challengeProgress,
  choreCompletionDate,
  computeChallengeProgress,
  contributionLabel,
  countContributions,
  daysLeft,
  describeTarget,
  fetchRange,
  isIsoDate,
  rewardCredits,
  routineCompletionDate,
  todayIn,
  weekWindow,
  windowState,
  type ChallengeDef,
  type ChallengeInputs,
} from './progress'
import { CHALLENGE_TEMPLATES } from './templates'
import { createChallengeSchema, challengeInsertRow, isChallengePremiumError } from './schema'
import { sortChallenges, withProgress } from './data'

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

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const C = '33333333-3333-4333-8333-333333333333'
const OUTSIDER = '44444444-4444-4444-8444-444444444444'

// Week of Sunday 2026-10-18 .. Saturday 2026-10-24.
const WEEK = { starts_on: '2026-10-18', ends_on: '2026-10-24' }

function choresDef(over: Partial<ChallengeDef> = {}): ChallengeDef {
  return { metric: 'chores', mode: 'team', target: 5, chore_filter: 'any', routine_type: null, child_ids: [A, B], ...WEEK, ...over }
}

function routinesDef(over: Partial<ChallengeDef> = {}): ChallengeDef {
  return { metric: 'routines', mode: 'each', target: 2, chore_filter: 'any', routine_type: 'bedtime', child_ids: [A, B], ...WEEK, ...over }
}

const empty: ChallengeInputs = { chores: [], choreCompletions: [], routines: [], routineCompletions: [] }

console.log('dates')

t('isIsoDate accepts real dates only', () => {
  assert.equal(isIsoDate('2026-10-18'), true)
  assert.equal(isIsoDate('2026-02-30'), false)
  assert.equal(isIsoDate('2026-1-5'), false)
  assert.equal(isIsoDate(20261018), false)
})

t('addDays crosses months and years', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01')
  assert.equal(addDays('2026-01-01', -1), '2025-12-31')
})

t('weekWindow is Sunday..Saturday', () => {
  assert.deepEqual(weekWindow('2026-10-21'), WEEK)
  assert.deepEqual(weekWindow('2026-10-18'), WEEK)
  assert.deepEqual(weekWindow('2026-10-24'), WEEK)
})

t('todayIn uses the family timezone', () => {
  const now = new Date('2026-10-19T03:00:00Z')
  assert.equal(todayIn('UTC', now), '2026-10-19')
  assert.equal(todayIn('America/Los_Angeles', now), '2026-10-18')
  assert.equal(todayIn('Not/AZone', now), '2026-10-19')
  assert.equal(todayIn(null, now), '2026-10-19')
})

t('a chore tick is dated week_start + day_of_week', () => {
  assert.equal(choreCompletionDate({ chore_id: 'x', week_start: '2026-10-18', day_of_week: 3 }), '2026-10-21')
  assert.equal(choreCompletionDate({ chore_id: 'x', week_start: null, day_of_week: 3 }), null)
  assert.equal(choreCompletionDate({ chore_id: 'x', week_start: '2026-10-18', day_of_week: 9 }), null)
})

t('a routine is dated by completed_at in the family zone, else by date', () => {
  const c = { routine_id: 'r', child_id: A, date: '2026-10-25', completed_at: '2026-10-25T02:30:00Z' }
  assert.equal(routineCompletionDate(c, 'America/New_York'), '2026-10-24')
  assert.equal(routineCompletionDate(c, 'UTC'), '2026-10-25')
  assert.equal(routineCompletionDate({ routine_id: 'r', child_id: A, date: '2026-10-20' }, 'UTC'), '2026-10-20')
})

t('window state and days left', () => {
  assert.equal(windowState(WEEK, '2026-10-17'), 'upcoming')
  assert.equal(windowState(WEEK, '2026-10-18'), 'active')
  assert.equal(windowState(WEEK, '2026-10-24'), 'active')
  assert.equal(windowState(WEEK, '2026-10-25'), 'ended')
  assert.equal(daysLeft(WEEK, '2026-10-18'), 7)
  assert.equal(daysLeft(WEEK, '2026-10-24'), 1)
  assert.equal(daysLeft(WEEK, '2026-10-25'), 0)
  assert.equal(daysLeft(WEEK, '2026-10-10'), 7)
})

t('fetchRange widens to whole weeks and a day either side', () => {
  assert.deepEqual(fetchRange([{ starts_on: '2026-10-20', ends_on: '2026-10-22' }, { starts_on: '2026-10-21', ends_on: '2026-10-30' }]), {
    weekFrom: '2026-10-18',
    weekTo: '2026-10-30',
    dateFrom: '2026-10-19',
    dateTo: '2026-10-31',
  })
  assert.equal(fetchRange([]), null)
})

console.log('counting chores')

const chores = [
  { id: 'a1', child_id: A, rotation_mode: null },
  { id: 'a2', child_id: A, rotation_mode: 'grab' },
  { id: 'b1', child_id: B, rotation_mode: null },
  { id: 'b2', child_id: B, rotation_mode: 'grab' },
  { id: 'x1', child_id: OUTSIDER, rotation_mode: null },
]

t('counts approved ticks of participants inside the window', () => {
  const counts = countContributions(choresDef(), {
    ...empty,
    chores,
    choreCompletions: [
      { chore_id: 'a1', week_start: '2026-10-18', day_of_week: 0 },
      { chore_id: 'a1', week_start: '2026-10-18', day_of_week: 1, status: 'approved' },
      { chore_id: 'b1', week_start: '2026-10-18', day_of_week: 6 },
      { chore_id: 'b1', week_start: '2026-10-18', day_of_week: 2, status: 'pending' }, // waiting: not yet
      { chore_id: 'b1', week_start: '2026-10-18', day_of_week: 3, status: 'rejected' },
      { chore_id: 'b1', week_start: '2026-10-11', day_of_week: 6 }, // last week
      { chore_id: 'b1', week_start: '2026-10-25', day_of_week: 0 }, // next week
      { chore_id: 'x1', week_start: '2026-10-18', day_of_week: 1 }, // not in the challenge
      { chore_id: 'gone', week_start: '2026-10-18', day_of_week: 1 }, // unknown chore
    ],
  })
  assert.deepEqual(counts, { [A]: 2, [B]: 1 })
})

t('duplicate rows for the same chore and day count once', () => {
  const counts = countContributions(choresDef(), {
    ...empty,
    chores,
    choreCompletions: [
      { chore_id: 'a1', week_start: '2026-10-18', day_of_week: 2 },
      { chore_id: 'a1', week_start: '2026-10-18', day_of_week: 2 },
    ],
  })
  assert.equal(counts[A], 1)
})

t('a window that starts mid-week counts only its days', () => {
  const counts = countContributions(choresDef({ starts_on: '2026-10-21', ends_on: '2026-10-22' }), {
    ...empty,
    chores,
    choreCompletions: [
      { chore_id: 'a1', week_start: '2026-10-18', day_of_week: 2 }, // 20th
      { chore_id: 'a1', week_start: '2026-10-18', day_of_week: 3 }, // 21st
      { chore_id: 'a1', week_start: '2026-10-18', day_of_week: 4 }, // 22nd
      { chore_id: 'a1', week_start: '2026-10-18', day_of_week: 5 }, // 23rd
    ],
  })
  assert.equal(counts[A], 2)
})

t("'bonus' counts only bonus chores (025 grab)", () => {
  const counts = countContributions(choresDef({ chore_filter: 'bonus' }), {
    ...empty,
    chores,
    choreCompletions: [
      { chore_id: 'a1', week_start: '2026-10-18', day_of_week: 1 },
      { chore_id: 'a2', week_start: '2026-10-18', day_of_week: 1 },
      { chore_id: 'b2', week_start: '2026-10-18', day_of_week: 2 },
    ],
  })
  assert.deepEqual(counts, { [A]: 1, [B]: 1 })
})

t('a participant with nothing yet still has a zero', () => {
  const counts = countContributions(choresDef({ child_ids: [A, B, C] }), { ...empty, chores })
  assert.deepEqual(counts, { [A]: 0, [B]: 0, [C]: 0 })
})

console.log('counting routines')

const routines = [
  { id: 'ra-bed', child_id: A, type: 'bedtime' },
  { id: 'ra-am', child_id: A, type: 'morning' },
  { id: 'rb-bed', child_id: B, type: 'bedtime' },
  { id: 'rx-bed', child_id: OUTSIDER, type: 'bedtime' },
]

t('counts routine completions of the chosen type, one per routine per day', () => {
  const counts = countContributions(routinesDef(), {
    ...empty,
    routines,
    routineCompletions: [
      { routine_id: 'ra-bed', child_id: A, date: '2026-10-18' },
      { routine_id: 'ra-bed', child_id: A, date: '2026-10-19' },
      { routine_id: 'ra-bed', child_id: A, date: '2026-10-19' }, // duplicate
      { routine_id: 'ra-am', child_id: A, date: '2026-10-19' }, // wrong type
      { routine_id: 'rb-bed', child_id: B, date: '2026-10-20' },
      { routine_id: 'rb-bed', child_id: B, date: '2026-10-25' }, // after the window
      { routine_id: 'rx-bed', child_id: OUTSIDER, date: '2026-10-20' },
    ],
    timeZone: 'UTC',
  })
  assert.deepEqual(counts, { [A]: 2, [B]: 1 })
})

t('any routine type counts when routine_type is null', () => {
  const counts = countContributions(routinesDef({ routine_type: null }), {
    ...empty,
    routines,
    routineCompletions: [
      { routine_id: 'ra-bed', child_id: A, date: '2026-10-19' },
      { routine_id: 'ra-am', child_id: A, date: '2026-10-19' },
    ],
  })
  assert.equal(counts[A], 2)
})

t("a bedtime routine finished Saturday night in New York counts for Saturday", () => {
  const counts = countContributions(routinesDef(), {
    ...empty,
    routines,
    // 22:30 Saturday local = 02:30 Sunday UTC; the server stored Sunday's date.
    routineCompletions: [{ routine_id: 'ra-bed', child_id: A, date: '2026-10-25', completed_at: '2026-10-25T02:30:00Z' }],
    timeZone: 'America/New_York',
  })
  assert.equal(counts[A], 1)
})

console.log('progress')

t('team: counts add up, met at target, bar capped at 100', () => {
  const p = challengeProgress(choresDef({ target: 5 }), { [A]: 4, [B]: 3 })
  assert.equal(p.current, 5)
  assert.equal(p.goal, 5)
  assert.equal(p.percent, 100)
  assert.equal(p.met, true)
  assert.equal(p.remaining, 0)
  assert.deepEqual(p.kids.map(k => k.count), [4, 3])
})

t('team: partial progress', () => {
  const p = challengeProgress(choresDef({ target: 50 }), { [A]: 10, [B]: 5 })
  assert.equal(p.current, 15)
  assert.equal(p.percent, 30)
  assert.equal(p.met, false)
  assert.equal(p.remaining, 35)
  assert.equal(p.kids[0].done, true)
})

t('each: one kid racing ahead cannot fill the bar for the others', () => {
  const p = challengeProgress(routinesDef({ target: 5 }), { [A]: 9, [B]: 1 })
  assert.equal(p.goal, 10)
  assert.equal(p.current, 6)
  assert.equal(p.percent, 60)
  assert.equal(p.met, false)
  assert.deepEqual(p.kids.map(k => [k.done, k.toGo]), [[true, 0], [false, 4]])
})

t('each: met when every kid reaches the target', () => {
  const p = challengeProgress(routinesDef({ target: 5 }), { [A]: 5, [B]: 6 })
  assert.equal(p.met, true)
  assert.equal(p.percent, 100)
})

t('computeChallengeProgress chains counting and progress', () => {
  const p = computeChallengeProgress(choresDef({ target: 2 }), {
    ...empty,
    chores,
    choreCompletions: [
      { chore_id: 'a1', week_start: '2026-10-18', day_of_week: 1 },
      { chore_id: 'b1', week_start: '2026-10-18', day_of_week: 1 },
    ],
  })
  assert.equal(p.met, true)
})

t('phase: won before delivered, missed after the window, cancelled wins', () => {
  const row = { status: 'active' as const, ...WEEK }
  assert.equal(challengePhase(row, { met: false }, '2026-10-17'), 'upcoming')
  assert.equal(challengePhase(row, { met: false }, '2026-10-20'), 'active')
  assert.equal(challengePhase(row, { met: true }, '2026-10-20'), 'won')
  assert.equal(challengePhase(row, { met: true }, '2026-10-30'), 'won')
  assert.equal(challengePhase(row, { met: false }, '2026-10-25'), 'missed')
  assert.equal(challengePhase({ ...row, status: 'delivered' }, { met: true }, '2026-10-20'), 'delivered')
  assert.equal(challengePhase({ ...row, status: 'cancelled' }, { met: true }, '2026-10-20'), 'cancelled')
})

console.log('rewards')

const challenge = { id: 'ch1', reward_cents: 250, child_ids: [A, B, A], title: 'Pizza Night', reward_text: 'Pizza night' }

t('credits every participant once when met', () => {
  const rows = rewardCredits(challenge, true)
  assert.equal(rows.length, 2)
  assert.deepEqual(rows.map(r => [r.child_id, r.amount_cents]), [[A, 250], [B, 250]])
  assert.equal(rows[0].challenge_id, 'ch1')
  assert.match(rows[0].note, /Pizza Night/)
})

t('no credits when not met or no money attached', () => {
  assert.deepEqual(rewardCredits(challenge, false), [])
  assert.deepEqual(rewardCredits({ ...challenge, reward_cents: 0 }, true), [])
})

console.log('copy and templates')

t('describeTarget reads naturally', () => {
  assert.equal(describeTarget(choresDef({ target: 50 })), '50 chores together')
  assert.equal(describeTarget(choresDef({ target: 1 })), '1 chore together')
  assert.equal(describeTarget(choresDef({ target: 10, chore_filter: 'bonus' })), '10 bonus chores together')
  assert.equal(describeTarget(routinesDef({ target: 5 })), '5 bedtime routines each')
  assert.equal(describeTarget(routinesDef({ target: 3, routine_type: null, mode: 'team' })), '3 routines together')
})

t('contribution labels encourage and never rank', () => {
  assert.equal(contributionLabel({ childId: A, count: 0, done: false, toGo: 0 }, 'team'), 'Ready to help')
  assert.equal(contributionLabel({ childId: A, count: 3, done: true, toGo: 0 }, 'team'), 'Helped 3x')
  assert.equal(contributionLabel({ childId: A, count: 2, done: false, toGo: 3 }, 'each'), '2 so far, 3 to go')
  assert.equal(contributionLabel({ childId: A, count: 5, done: true, toGo: 0 }, 'each'), 'Done!')
})

t('every template is a valid challenge', () => {
  assert.ok(CHALLENGE_TEMPLATES.length >= 3)
  for (const tpl of CHALLENGE_TEMPLATES) {
    const r = createChallengeSchema.safeParse({
      title: tpl.title,
      emoji: tpl.emoji,
      rewardText: tpl.reward_text,
      metric: tpl.metric,
      mode: tpl.mode,
      target: tpl.target,
      choreFilter: tpl.chore_filter,
      routineType: tpl.routine_type,
      childIds: [A, B],
      ...{ startsOn: WEEK.starts_on, endsOn: WEEK.ends_on },
    })
    assert.ok(r.success, `${tpl.key}: ${r.success ? '' : r.error.issues[0]?.message}`)
  }
  assert.equal(describeTarget(CHALLENGE_TEMPLATES[0]), '50 chores together')
})

console.log('schema')

const valid = {
  title: 'Pizza Night',
  rewardText: 'Pizza night',
  metric: 'chores',
  mode: 'team',
  target: 50,
  childIds: [A, B],
  startsOn: '2026-10-18',
  endsOn: '2026-10-24',
}

t('accepts a valid body and defaults money to zero', () => {
  const r = createChallengeSchema.safeParse(valid)
  assert.ok(r.success)
  if (r.success) assert.equal(r.data.rewardCents, 0)
})

t('needs two different kids', () => {
  assert.equal(createChallengeSchema.safeParse({ ...valid, childIds: [A] }).success, false)
  assert.equal(createChallengeSchema.safeParse({ ...valid, childIds: [A, A] }).success, false)
})

t('rejects a window that ends first, runs too long, or has a bad date', () => {
  assert.equal(createChallengeSchema.safeParse({ ...valid, endsOn: '2026-10-17' }).success, false)
  assert.equal(createChallengeSchema.safeParse({ ...valid, endsOn: '2027-02-01' }).success, false)
  assert.equal(createChallengeSchema.safeParse({ ...valid, startsOn: '2026-02-30' }).success, false)
})

t('rejects silly targets and money', () => {
  assert.equal(createChallengeSchema.safeParse({ ...valid, target: 0 }).success, false)
  assert.equal(createChallengeSchema.safeParse({ ...valid, target: 2.5 }).success, false)
  assert.equal(createChallengeSchema.safeParse({ ...valid, rewardCents: -1 }).success, false)
})

t('insert row drops filters that do not apply and dedupes kids', () => {
  const parsed = createChallengeSchema.parse({ ...valid, routineType: 'bedtime', choreFilter: 'bonus', childIds: [A, B, C] })
  const row = challengeInsertRow(parsed, 'owner', 'parent')
  assert.equal(row.routine_type, null)
  assert.equal(row.chore_filter, 'bonus')
  assert.equal(row.user_id, 'owner')
  assert.equal(row.created_by, 'parent')
  const r2 = challengeInsertRow(createChallengeSchema.parse({ ...valid, metric: 'routines', choreFilter: 'bonus', routineType: 'bedtime' }), 'o', 'p')
  assert.equal(r2.chore_filter, 'any')
  assert.equal(r2.routine_type, 'bedtime')
})

t('spots the 031 premium refusal', () => {
  assert.equal(isChallengePremiumError({ hint: 'premium_required_challenges' }), true)
  assert.equal(isChallengePremiumError({ message: 'Family challenges are part of Premium.' }), true)
  assert.equal(isChallengePremiumError({ hint: 'free_limit_goals' }), false)
  assert.equal(isChallengePremiumError(null), false)
})

console.log('data helpers')

t('withProgress + sortChallenges: won first, then running, then done', () => {
  const base = { user_id: 'o', emoji: null, reward_text: 'x', reward_cents: 0, delivered_at: null, created_at: '2026-10-18T00:00:00Z' }
  const rows = [
    { ...base, ...choresDef({ target: 99 }), id: 'running', title: 'r', status: 'active' as const },
    { ...base, ...choresDef({ target: 1 }), id: 'won', title: 'w', status: 'active' as const },
    { ...base, ...choresDef({ target: 1 }), id: 'delivered', title: 'd', status: 'delivered' as const },
  ]
  const inputs: ChallengeInputs = {
    ...empty,
    chores,
    choreCompletions: [{ chore_id: 'a1', week_start: '2026-10-18', day_of_week: 1 }],
    timeZone: 'UTC',
  }
  const list = sortChallenges(withProgress(rows, inputs, new Date('2026-10-20T12:00:00Z')))
  assert.deepEqual(list.map(c => [c.challenge.id, c.phase]), [
    ['won', 'won'],
    ['running', 'active'],
    ['delivered', 'delivered'],
  ])
  assert.equal(list[1].daysLeft, 5)
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
