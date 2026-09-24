/**
 * Unit tests for the app icon badge helpers. Run with `npm run test:unit`.
 */
import assert from 'node:assert/strict'
import { badgeCountForToday, clearAppBadge, syncAppBadge } from './app-badge'

// Remaining = due today minus done; loading leaves the badge alone.
assert.equal(badgeCountForToday({ familyDone: 3, familyTotal: 8, loading: false }), 5)
assert.equal(badgeCountForToday({ familyDone: 8, familyTotal: 8, loading: false }), 0)
assert.equal(badgeCountForToday({ familyDone: 0, familyTotal: 0, loading: false }), 0, 'vacation / nothing due')
assert.equal(badgeCountForToday({ familyDone: 0, familyTotal: 4, loading: true }), null)

function fakeNavigator(fail = false) {
  const calls: string[] = []
  return {
    calls,
    nav: {
      setAppBadge: async (n?: number) => { calls.push(`set:${n}`); if (fail) throw new Error('denied') },
      clearAppBadge: async () => { calls.push('clear'); if (fail) throw new Error('denied') },
    },
  }
}

async function run() {
  const a = fakeNavigator()
  await syncAppBadge(5, a.nav)
  await syncAppBadge(0, a.nav)
  await clearAppBadge(a.nav)
  assert.deepEqual(a.calls, ['set:5', 'clear', 'clear'], 'zero clears instead of showing a 0 badge')

  // Unsupported browser: a no-op, never a throw.
  await syncAppBadge(3, null)
  await clearAppBadge(null)

  // A rejected call (permission denied, not installed) is swallowed.
  const b = fakeNavigator(true)
  await syncAppBadge(2, b.nav)
  await clearAppBadge(b.nav)
  assert.deepEqual(b.calls, ['set:2', 'clear'])

  console.log('app-badge tests passed')
}

run().catch(err => { console.error(err); process.exit(1) })
