/**
 * Unit tests for the shared signup-profile rules: platform tagging, source
 * sanitizing, family-name fallback, and ensureProfile's retry semantics
 * against a fake client. Run with `npm run test:unit`.
 */
import assert from 'node:assert/strict'
import type { PostgrestError } from '@supabase/supabase-js'
import {
  platformFromUserAgent, buildSignupSource, resolveFamilyName, ensureProfile, type ProfileWriter,
} from './signup-profile'

let passed = 0
let failed = 0
// Tests run one after another so output stays under its group heading.
let chain = Promise.resolve()
function t(name: string, fn: () => void | Promise<void>) {
  chain = chain.then(fn).then(
    () => { passed++; console.log(`  ok    ${name}`) },
    (err) => { failed++; console.log(`  FAIL  ${name}`); console.log(`        ${(err as Error).message.split('\n')[0]}`) }
  )
}
const group = (name: string) => { chain = chain.then(() => console.log(`\n${name}`)) }

const pgError = (code: string, message = code) => ({ code, message, details: '', hint: '' }) as PostgrestError

/** A fake profiles table: `results` are the insert outcomes in order; `exists` answers the lookup. */
function fake(results: (PostgrestError | null)[], exists = false) {
  const inserts: Record<string, unknown>[] = []
  const writer: ProfileWriter = {
    from: () => ({
      insert: async (row) => { inserts.push(row); return { error: results.shift() ?? null } },
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: exists ? { id: 'u1' } : null }) }) }),
    }),
  }
  return { writer, inserts }
}
const input = { id: 'u1', email: 'a@b.co', familyName: 'The Tests', signupSource: { platform: 'web', method: 'apple' } }

group('platform')
t('iOS app: CFNetwork without Mozilla', () => assert.equal(platformFromUserAgent('ChoreStar/36 CFNetwork/1498 Darwin/25.0.0'), 'ios_app'))
t('Safari on iPhone is web', () => assert.equal(platformFromUserAgent('Mozilla/5.0 (iPhone) AppleWebKit Safari Darwin'), 'web'))
t('native Android tag', () => assert.equal(platformFromUserAgent('ChoreStarAndroid/2.1 (Android)'), 'android_app'))
t('missing UA is web', () => assert.equal(platformFromUserAgent(null), 'web'))

group('signup source')
t('keeps allowlisted keys, drops the rest, clips', () => {
  const s = buildSignupSource({ utm_source: 'chatgpt.com', evil: 'x', landing: 'y'.repeat(300), referrer: '' }, 'web', 'google')
  assert.deepEqual(Object.keys(s).sort(), ['landing', 'method', 'platform', 'utm_source'])
  assert.equal(s.landing.length, 200)
  assert.equal(s.method, 'google')
})
t('non-object input still records platform and method', () =>
  assert.deepEqual(buildSignupSource('nope', 'ios_app'), { platform: 'ios_app', method: 'email' }))

group('family name')
t('explicit name wins', () => assert.deepEqual(resolveFamilyName(' The Siegels ', { full_name: 'Ben' }, 'b@x.co'), { name: 'The Siegels', defaulted: false }))
t('metadata family_name counts as chosen', () => assert.deepEqual(resolveFamilyName(undefined, { family_name: 'Oslin' }, null), { name: 'Oslin', defaulted: false }))
t('provider display name is a default', () => assert.deepEqual(resolveFamilyName('', { full_name: 'Jane Doe' }, 'j@x.co'), { name: 'Jane Doe', defaulted: true }))
t('Apple relay email prefix is a default', () => assert.deepEqual(resolveFamilyName(null, {}, 'x7k2@privaterelay.appleid.com'), { name: 'x7k2', defaulted: true }))
t('nothing at all', () => assert.deepEqual(resolveFamilyName(null, null, null), { name: 'My Family', defaulted: true }))

group('ensureProfile')
t('creates with a kid login code and the source', async () => {
  const { writer, inserts } = fake([null])
  assert.deepEqual(await ensureProfile(writer, input), { created: true, error: null })
  assert.match(String(inserts[0].kid_login_code), /^[0-9a-f]{8}$/)
  assert.deepEqual(inserts[0].signup_source, input.signupSource)
})
t('existing profile is success, not created', async () => {
  const { writer } = fake([pgError('23505')], true)
  assert.deepEqual(await ensureProfile(writer, input), { created: false, error: null })
})
t('kid-code collision retries with a new code', async () => {
  const { writer, inserts } = fake([pgError('23505'), null])
  assert.equal((await ensureProfile(writer, input)).created, true)
  assert.equal(inserts.length, 2)
  assert.notEqual(inserts[0].kid_login_code, inserts[1].kid_login_code)
})
t('missing signup_source column drops attribution, still creates', async () => {
  const { writer, inserts } = fake([pgError('PGRST204', "Could not find the 'signup_source' column"), null])
  assert.equal((await ensureProfile(writer, input)).created, true)
  assert.equal('signup_source' in inserts[1], false)
})
t('other errors surface', async () => {
  const { writer } = fake([pgError('42501')])
  assert.equal((await ensureProfile(writer, input)).error?.code, '42501')
})
t('endless collisions give up with an error', async () => {
  const { writer } = fake(Array(10).fill(pgError('23505')))
  const r = await ensureProfile(writer, input)
  assert.equal(r.created, false)
  assert.ok(r.error)
})

chain.then(() => {
  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed) process.exit(1)
})
