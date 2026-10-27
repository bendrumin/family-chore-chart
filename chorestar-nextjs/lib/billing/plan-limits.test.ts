/**
 * Unit tests for pausing over the free limits. Run with `npm run test:unit`.
 */
import assert from 'node:assert/strict'
import { pickPaused, type LimitChore, type LimitKid } from './plan-limits'

const kid = (id: string, day: number): LimitKid => ({ id, created_at: `2026-10-${String(day).padStart(2, '0')}T00:00:00Z` })
const chore = (id: string, child: string, day: number, opts: Partial<LimitChore> = {}): LimitChore => ({
  id, child_id: child, created_at: `2026-10-${String(day).padStart(2, '0')}T00:00:00Z`, is_active: true, paused_by_plan: false, ...opts,
})

// The Rod case: four kids, the fourth added after buying. Oldest three stay.
{
  const kids = [kid('d', 4), kid('a', 1), kid('c', 3), kid('b', 2)]
  const r = pickPaused(kids, [chore('x', 'd', 5)])
  assert.deepEqual(r.pausedKids, ['d'])
  assert.deepEqual(r.pausedChores, ['x'], "a paused kid's chores pause too")
}

// The Alhilal case: 45 chores across 3 kids. Oldest 20 stay on.
{
  const kids = [kid('a', 1), kid('b', 2), kid('c', 3)]
  const chores = Array.from({ length: 45 }, (_, i) => chore(`c${i}`, ['a', 'b', 'c'][i % 3], 1 + (i % 28)))
  const r = pickPaused(kids, chores)
  assert.equal(r.activeChores.length, 20)
  assert.equal(r.pausedChores.length, 25)
  assert.deepEqual(r.pausedKids, [])
}

// Under the limits: nothing pauses.
{
  const r = pickPaused([kid('a', 1)], [chore('x', 'a', 1), chore('y', 'a', 2)])
  assert.deepEqual(r.pausedKids, [])
  assert.deepEqual(r.pausedChores, [])
}

// A chore the parent switched off is not the plan's business.
{
  const chores = [chore('off', 'a', 1, { is_active: false }), ...Array.from({ length: 20 }, (_, i) => chore(`c${i}`, 'a', 2 + (i % 20)))]
  const r = pickPaused([kid('a', 1)], chores)
  assert.ok(!r.pausedChores.includes('off'))
  assert.ok(!r.activeChores.includes('off'))
  assert.equal(r.pausedChores.length, 0)
}

// Already-paused chores still count, so a rebalance can bring them back.
{
  const chores = [chore('p', 'a', 1, { is_active: false, paused_by_plan: true }), chore('q', 'a', 2)]
  const r = pickPaused([kid('a', 1)], chores)
  assert.deepEqual([...r.activeChores].sort(), ['p', 'q'])
  assert.deepEqual(r.pausedChores, [])
}

// Ties on created_at break by id, so a rerun picks the same set.
{
  const kids = ['k4', 'k1', 'k3', 'k2'].map((id) => kid(id, 1))
  assert.deepEqual(pickPaused(kids, []).pausedKids, ['k4'])
}

// A parent's choice survives a rebalance: what is on stays on.
{
  const kids = [kid('a', 1), kid('b', 2), kid('c', 3), { ...kid('d', 4), paused_by_plan: false }]
  kids[0] = { ...kids[0], paused_by_plan: true } // parent kept d instead of a
  const r = pickPaused(kids, [])
  assert.deepEqual(r.pausedKids, ['a'])
  const chores = [chore('old', 'b', 1, { is_active: false, paused_by_plan: true }), ...Array.from({ length: 20 }, (_, i) => chore(`n${i}`, 'b', 2 + (i % 20)))]
  const rc = pickPaused([kid('b', 1)], chores)
  assert.deepEqual(rc.pausedChores, ['old'], 'the chosen 20 stay, the older paused one stays paused')
}

console.log('plan-limits tests passed')
