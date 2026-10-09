/**
 * Unit tests for decideEntitlement: which verified Apple transactions make an
 * account Premium, and when that's saved. Run with `npm run test:unit`.
 */
import assert from 'node:assert/strict'
import { decideEntitlement } from './entitlement'

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

const NOW = 1_800_000_000_000
const ME = '0b3c1a52-1111-4a4a-9c9c-000000000001'
const OTHER = '0b3c1a52-1111-4a4a-9c9c-000000000002'
const tx = (over: Record<string, unknown> = {}) => ({
  productId: 'com.chorestar.premium.monthly',
  expiresDate: NOW + 86_400_000,
  revocationDate: undefined,
  appAccountToken: ME,
  originalTransactionId: '2000001234',
  ...over,
}) as any
const decide = (over: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) =>
  decideEntitlement({ userId: ME, environment: 'Production', transaction: tx(over), claimedByUserId: null, now: NOW, ...extra } as any)

t('own active purchase grants and saves', () => assert.deepEqual(decide(), { grant: true, persist: true, originalTransactionId: '2000001234' }))
t('token matching is case-insensitive', () => assert.equal(decide({ appAccountToken: ME.toUpperCase() }).grant, true))
t("another account's purchase is refused", () => assert.equal(decide({ appAccountToken: OTHER }).grant, false))
t('expired is refused', () => assert.equal(decide({ expiresDate: NOW - 1 }).grant, false))
t('refunded is refused', () => assert.equal(decide({ revocationDate: NOW - 5 }).grant, false))
t('other products are refused', () => assert.equal(decide({ productId: 'com.example.thing' }).grant, false))
t('no token, unclaimed: grants (offer codes, old purchases)', () => assert.equal(decide({ appAccountToken: undefined }).grant, true))
t('no token, claimed by another family: refused', () => assert.equal(decide({ appAccountToken: undefined }, { claimedByUserId: OTHER }).grant, false))
t('sandbox grants for the session, never saved', () => assert.deepEqual(decide({}, { environment: 'Sandbox' }), { grant: true, persist: false, originalTransactionId: '2000001234' }))

console.log(`\n${passed} passed, ${failed} failed`)
if (failed) process.exit(1)
