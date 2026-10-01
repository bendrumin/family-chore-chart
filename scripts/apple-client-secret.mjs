#!/usr/bin/env node
// Mints the "Secret Key (for OAuth)" Supabase's Apple provider wants: an ES256
// JWT signed with the Sign in with Apple .p8, which Apple caps at 6 months.
// Rerun it before the printed expiry and paste the new value into Supabase.
// See docs/SIGN-IN-WITH-APPLE.md, step 4.
//
//   node scripts/apple-client-secret.mjs <path to AuthKey_KEYID.p8> [services id]
//
// The secret goes to the clipboard, never to the terminal. Signing mirrors
// ChoreStar-iOS/scripts/asc.mjs (dsaEncoding ieee-p1363 gives the raw r||s
// signature a JWT wants).
import { createSign, createPrivateKey } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { execFileSync } from 'node:child_process'

const TEAM_ID = '5ANRA6JZC2'
const [keyPath, servicesId = 'com.chorestar.web'] = process.argv.slice(2)
if (!keyPath) {
  console.error('usage: node scripts/apple-client-secret.mjs <AuthKey_KEYID.p8> [services id]')
  process.exit(1)
}
const keyId = basename(keyPath).match(/^AuthKey_([A-Z0-9]{10})\.p8$/)?.[1]
if (!keyId) {
  console.error('expected the file Apple downloaded, named AuthKey_<10-char key id>.p8')
  process.exit(1)
}

const now = Math.floor(Date.now() / 1000)
const exp = now + 180 * 86400 // Apple rejects anything over 6 months
const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const input = `${b64u({ alg: 'ES256', kid: keyId, typ: 'JWT' })}.${b64u({
  iss: TEAM_ID,
  iat: now,
  exp,
  aud: 'https://appleid.apple.com',
  sub: servicesId,
})}`
const key = createPrivateKey(readFileSync(keyPath))
const sig = createSign('sha256').update(input).sign({ key, dsaEncoding: 'ieee-p1363' })

execFileSync('pbcopy', { input: `${input}.${sig.toString('base64url')}` })
console.log(`Copied to clipboard: client secret for ${servicesId} (key ${keyId}, team ${TEAM_ID}).`)
console.log(`Paste it into Supabase → Authentication → Providers → Apple → Secret Key (for OAuth).`)
console.log(`It expires ${new Date(exp * 1000).toDateString()}. Put a reminder a week before that.`)
