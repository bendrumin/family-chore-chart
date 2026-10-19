/**
 * Unit tests for managing shared chores as a group, and for spotting the
 * database triggers' refusals. Run with `npm run test:unit`.
 */
import assert from 'node:assert/strict'
import {
  sharedGroupOf,
  sharedChoreBadge,
  sharedChorePatch,
  STOP_SHARING_ARCHIVE_UPDATE,
  parseStopSharingAction,
  groupOwnership,
  splitShared,
  isBonusAlreadyClaimedError,
  isFreeGoalLimitError,
} from './shared-chores'

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

const G = '11111111-1111-1111-1111-111111111111'

t('an ordinary chore is not shared', () => {
  assert.equal(sharedGroupOf({}), null)
  assert.equal(sharedGroupOf({ rotation_group_id: null, rotation_mode: null }), null)
})
t('a group id without a mode (stopped sharing) is not shared', () =>
  assert.equal(sharedGroupOf({ rotation_group_id: G, rotation_mode: null }), null))
t('an unknown mode is not shared', () =>
  assert.equal(sharedGroupOf({ rotation_group_id: G, rotation_mode: 'other' }), null))
t('rotate and grab groups are shared', () => {
  assert.deepEqual(sharedGroupOf({ rotation_group_id: G, rotation_mode: 'rotate' }), { groupId: G, mode: 'rotate' })
  assert.deepEqual(sharedGroupOf({ rotation_group_id: G, rotation_mode: 'grab' }), { groupId: G, mode: 'grab' })
})

t('badge: rotate takes turns, grab is a bonus, ordinary has none', () => {
  assert.equal(sharedChoreBadge({ rotation_group_id: G, rotation_mode: 'rotate' })?.label, 'Takes turns')
  assert.equal(sharedChoreBadge({ rotation_group_id: G, rotation_mode: 'grab' })?.label, 'Bonus')
  assert.equal(sharedChoreBadge({}), null)
})

t('patch maps only the fields sent to columns', () => {
  assert.deepEqual(sharedChorePatch({ name: '  Dishes ', rewardCents: 50 }), { name: 'Dishes', reward_cents: 50 })
  assert.deepEqual(sharedChorePatch({}), {})
})
t('patch sorts and de-duplicates days', () =>
  assert.deepEqual(sharedChorePatch({ daysOfWeek: [5, 1, 3, 1] }), { days_of_week: [1, 3, 5] }))
t('patch sorts days numerically, not as strings', () =>
  assert.deepEqual(sharedChorePatch({ daysOfWeek: [6, 0, 10 as number] }).days_of_week, [0, 6, 10]))
t('patch keeps icon null, defaults a null category, carries photo flag', () =>
  assert.deepEqual(sharedChorePatch({ icon: null, category: null, requiresPhoto: true }), {
    icon: null,
    category: 'household_chores',
    requires_photo: true,
  }))
t('patch never touches rotation or is_active', () => {
  const p = sharedChorePatch({ name: 'x', icon: 'a', rewardCents: 1, daysOfWeek: [1], category: 'c', requiresPhoto: false })
  for (const k of Object.keys(p)) assert.ok(!k.startsWith('rotation_') && k !== 'is_active', k)
})

t('archive turns every copy off and takes it out of the rotation job', () => {
  assert.equal(STOP_SHARING_ARCHIVE_UPDATE.is_active, false)
  assert.equal(STOP_SHARING_ARCHIVE_UPDATE.rotation_mode, null)
  // the group id stays so past earnings keep counting
  assert.ok(!('rotation_group_id' in STOP_SHARING_ARCHIVE_UPDATE))
})

t('stop-sharing action parses archive/delete only', () => {
  assert.equal(parseStopSharingAction('archive'), 'archive')
  assert.equal(parseStopSharingAction('delete'), 'delete')
  assert.equal(parseStopSharingAction('nope'), null)
  assert.equal(parseStopSharingAction(null), null)
})

t('ownership: every copy must be one of the family kids', () => {
  assert.equal(groupOwnership([{ child_id: 'a' }, { child_id: 'b' }], ['a', 'b', 'c']), 'ok')
  assert.equal(groupOwnership([{ child_id: 'a' }, { child_id: 'x' }], ['a', 'b']), 'forbidden')
  assert.equal(groupOwnership([], ['a']), 'not_found')
})

t('splitShared separates ordinary chores and collapses groups', () => {
  const r = splitShared([
    { id: '1' },
    { id: '2', rotation_group_id: G, rotation_mode: 'rotate' },
    { id: '3', rotation_group_id: G, rotation_mode: 'rotate' },
    { id: '4', rotation_group_id: G, rotation_mode: null },
  ])
  assert.deepEqual(r, { plainIds: ['1', '4'], groupIds: [G] })
})

t('bonus-claimed error by hint or message', () => {
  assert.ok(isBonusAlreadyClaimedError({ hint: 'bonus_already_claimed', message: 'x' }))
  assert.ok(isBonusAlreadyClaimedError({ message: 'Someone already did this bonus chore today.' }))
  assert.ok(!isBonusAlreadyClaimedError({ message: 'permission denied' }))
  assert.ok(!isBonusAlreadyClaimedError(null))
  assert.ok(!isBonusAlreadyClaimedError('Someone already did this bonus chore today.'))
})

t('free goal limit error by hint or message', () => {
  assert.ok(isFreeGoalLimitError({ hint: 'free_limit_goals' }))
  assert.ok(isFreeGoalLimitError({ message: 'The free plan includes 1 active goal per child. Premium removes the limit.' }))
  assert.ok(!isFreeGoalLimitError({ hint: 'free_limit_chores', message: 'The free plan includes 20 chores.' }))
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
