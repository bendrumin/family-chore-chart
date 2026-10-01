/**
 * Unit tests for the Sign in with Apple server helpers: key parsing, the
 * client-secret JWT, and the token/revoke request shapes. A throwaway P-256
 * key and a fake fetch stand in for Apple. Run with `npm run test:unit`.
 */
import assert from 'node:assert/strict'
import { generateKeyPairSync, createVerify } from 'crypto'
import {
  normalizePrivateKey, appleConfig, clientSecret, exchangeAuthorizationCode, revokeRefreshToken, usesApple,
  APPLE_IOS_CLIENT_ID,
} from './sign-in'

let passed = 0
let failed = 0
let chain = Promise.resolve()
function t(name: string, fn: () => void | Promise<void>) {
  chain = chain.then(fn).then(
    () => { passed++; console.log(`  ok    ${name}`) },
    (err) => { failed++; console.log(`  FAIL  ${name}`); console.log(`        ${(err as Error).message.split('\n')[0]}`) }
  )
}
const group = (name: string) => { chain = chain.then(() => console.log(`\n${name}`)) }

const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' })
const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
const cfg = { keyId: 'TESTKEY123', teamId: '5ANRA6JZC2', privateKey: pem }
const decode = (part: string) => JSON.parse(Buffer.from(part, 'base64url').toString())

/** A fetch that records the request and answers with `status` and `body`. */
function fakeFetch(status: number, body: unknown) {
  const calls: { url: string; form: URLSearchParams }[] = []
  const f = (async (url: string, init?: RequestInit) => {
    calls.push({ url, form: new URLSearchParams(String(init?.body)) })
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status })
  }) as unknown as typeof fetch
  return { f, calls }
}

group('private key')
t('raw PEM passes through', () => assert.equal(normalizePrivateKey(pem), pem.trim()))
t('escaped newlines (as pasted into Vercel) are restored', () =>
  assert.equal(normalizePrivateKey(pem.trim().replace(/\n/g, '\\n')), pem.trim()))
t('base64 of the whole file decodes', () =>
  assert.equal(normalizePrivateKey(Buffer.from(pem).toString('base64')).trim(), pem.trim()))
t('config is null until both env vars exist', () => {
  assert.equal(appleConfig({ APPLE_SIGNIN_KEY_ID: 'X' } as unknown as NodeJS.ProcessEnv), null)
  assert.equal(appleConfig({ APPLE_SIGNIN_KEY_ID: 'X', APPLE_SIGNIN_PRIVATE_KEY: pem } as unknown as NodeJS.ProcessEnv)?.teamId, '5ANRA6JZC2')
})

group('client secret')
t('verifies against the public key with the claims Apple checks', () => {
  const jwt = clientSecret(cfg, APPLE_IOS_CLIENT_ID, 1_800_000_000)
  const [h, p, s] = jwt.split('.')
  const ok = createVerify('sha256').update(`${h}.${p}`).verify({ key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(s, 'base64url'))
  assert.equal(ok, true)
  assert.deepEqual(decode(h), { alg: 'ES256', kid: 'TESTKEY123', typ: 'JWT' })
  assert.deepEqual(decode(p), { iss: '5ANRA6JZC2', iat: 1_800_000_000, exp: 1_800_000_300, aud: 'https://appleid.apple.com', sub: APPLE_IOS_CLIENT_ID })
})

group('apple endpoints')
t('code exchange posts the right form and returns the refresh token', async () => {
  const { f, calls } = fakeFetch(200, { refresh_token: 'r.abc', access_token: 'a' })
  assert.equal(await exchangeAuthorizationCode(cfg, 'c.123', APPLE_IOS_CLIENT_ID, f), 'r.abc')
  assert.equal(calls[0].url, 'https://appleid.apple.com/auth/token')
  assert.equal(calls[0].form.get('grant_type'), 'authorization_code')
  assert.equal(calls[0].form.get('code'), 'c.123')
  assert.equal(calls[0].form.get('client_id'), APPLE_IOS_CLIENT_ID)
  assert.equal(calls[0].form.get('client_secret')?.split('.').length, 3)
})
t('a rejected code throws with Apple’s error', async () => {
  const { f } = fakeFetch(400, { error: 'invalid_grant' })
  await assert.rejects(exchangeAuthorizationCode(cfg, 'used', APPLE_IOS_CLIENT_ID, f), /invalid_grant/)
})
t('revoke names the token and its type', async () => {
  const { f, calls } = fakeFetch(200, '')
  await revokeRefreshToken(cfg, 'r.abc', 'com.chorestar.web', f)
  assert.equal(calls[0].url, 'https://appleid.apple.com/auth/revoke')
  assert.equal(calls[0].form.get('token'), 'r.abc')
  assert.equal(calls[0].form.get('token_type_hint'), 'refresh_token')
  assert.equal(calls[0].form.get('client_id'), 'com.chorestar.web')
})
t('a failed revoke throws', async () => {
  const { f } = fakeFetch(400, 'invalid_client')
  await assert.rejects(revokeRefreshToken(cfg, 'r', 'x', f), /400/)
})

group('provider detection')
t('first sign-in with Apple', () => assert.equal(usesApple({ app_metadata: { provider: 'apple', providers: ['apple'] } }), true))
t('email family that later linked Apple', () => assert.equal(usesApple({ app_metadata: { provider: 'email', providers: ['email', 'apple'] } }), true))
t('email only', () => assert.equal(usesApple({ app_metadata: { provider: 'email' } }), false))
t('no user', () => assert.equal(usesApple(null), false))

chain.then(() => {
  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed) process.exit(1)
})
