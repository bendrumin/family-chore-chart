import 'server-only'
import { createSign, createPrivateKey } from 'node:crypto'
import { connect } from 'node:http2'

/**
 * Minimal APNs client — direct HTTP/2 to Apple, no SDK.
 *
 * The design decision (docs/push-notifications-plan.md) was native and direct:
 * no OneSignal, no Firebase. APNs speaks HTTP/2 with an ES256 JWT, both of
 * which Node has built in, so this adds zero dependencies.
 *
 * Wholly env-gated: without APNS_TEAM_ID / APNS_KEY_ID / APNS_PRIVATE_KEY the
 * module reports itself unconfigured and every send is a cheap no-op. Push is
 * decoration on top of the product — it must never be able to break the
 * endpoint that triggered it.
 */

const TEAM_ID = process.env.APNS_TEAM_ID?.trim()
const KEY_ID = process.env.APNS_KEY_ID?.trim()

/**
 * Rebuild a clean PEM no matter how the paste into Vercel mangled it: literal
 * "\n" escapes, wrapping quotes, CRLF, or the whole key flattened onto one
 * line all still contain the same base64 body — extract it and re-wrap.
 * (A dashboard paste of the .p8 produced error:1E08010C:DECODER
 * routines::unsupported from createPrivateKey until normalized this way.)
 */
function normalizePem(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  let s = raw.replace(/\\n/g, '\n').replace(/\r/g, '').trim()
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim()
  }
  const m = s.match(/-----BEGIN ([A-Z0-9 ]+)-----([\s\S]*?)-----END \1-----/)
  if (!m) return s
  const body = m[2].replace(/\s+/g, '')
  return `-----BEGIN ${m[1]}-----\n${(body.match(/.{1,64}/g) ?? []).join('\n')}\n-----END ${m[1]}-----\n`
}

const PRIVATE_KEY = normalizePem(process.env.APNS_PRIVATE_KEY)
const TOPIC = process.env.APNS_TOPIC?.trim() || 'com.chorestar.ChoreStar'

export function apnsConfigured(): boolean {
  return Boolean(TEAM_ID && KEY_ID && PRIVATE_KEY)
}

/**
 * Provider JWT, cached. Apple rejects tokens older than an hour and throttles
 * refreshes more frequent than ~20 minutes, so one token is reused for 40.
 */
let cachedJwt: { token: string; issuedAt: number } | null = null

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url')
}

function providerJwt(): string {
  const now = Math.floor(Date.now() / 1000)
  if (cachedJwt && now - cachedJwt.issuedAt < 40 * 60) return cachedJwt.token

  const header = base64url(JSON.stringify({ alg: 'ES256', kid: KEY_ID }))
  const payload = base64url(JSON.stringify({ iss: TEAM_ID, iat: now }))
  const signingInput = `${header}.${payload}`

  const sign = createSign('SHA256')
  sign.update(signingInput)
  // ieee-p1363: JWT ES256 wants raw r||s, not ASN.1 DER.
  const signature = sign.sign({
    key: createPrivateKey(PRIVATE_KEY as string),
    dsaEncoding: 'ieee-p1363',
  })

  const token = `${signingInput}.${base64url(signature)}`
  cachedJwt = { token, issuedAt: now }
  return token
}

export interface ApnsSendResult {
  ok: boolean
  /** True when APNs says this token is dead and the row should be deleted. */
  tokenGone: boolean
  status: number
}

/**
 * Send one alert to one device token.
 *
 * `environment` picks the gateway: Xcode installs get sandbox tokens, TestFlight
 * and App Store get production ones, and the two are mutually invalid.
 */
export async function sendApnsAlert(
  deviceToken: string,
  environment: 'development' | 'production',
  title: string,
  body: string
): Promise<ApnsSendResult> {
  if (!apnsConfigured()) return { ok: false, tokenGone: false, status: 0 }

  const host =
    environment === 'development'
      ? 'https://api.sandbox.push.apple.com'
      : 'https://api.push.apple.com'

  const payload = JSON.stringify({
    aps: { alert: { title, body }, sound: 'default' },
  })

  return new Promise<ApnsSendResult>((resolve) => {
    const client = connect(host)
    // A hung HTTP/2 session must not pin a serverless invocation.
    const bail = setTimeout(() => {
      client.close()
      console.error(`[push] apns timeout env=${environment} token=${deviceToken.slice(0, 8)}…`)
      resolve({ ok: false, tokenGone: false, status: 0 })
    }, 8000)

    client.on('error', (err) => {
      clearTimeout(bail)
      console.error(`[push] apns connect error env=${environment}: ${err.message}`)
      resolve({ ok: false, tokenGone: false, status: 0 })
    })

    const req = client.request({
      ':method': 'POST',
      ':path': `/3/device/${deviceToken}`,
      authorization: `bearer ${providerJwt()}`,
      'apns-topic': TOPIC,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'content-type': 'application/json',
    })

    let status = 0
    let responseBody = ''
    req.on('response', (headers) => {
      status = Number(headers[':status'] ?? 0)
    })
    req.on('data', (chunk) => { responseBody += chunk })
    req.on('end', () => {
      clearTimeout(bail)
      client.close()
      // 410 = token expired; 400 BadDeviceToken = wrong gateway or dead token.
      const tokenGone =
        status === 410 || (status === 400 && responseBody.includes('BadDeviceToken'))
      // Token prefix only — enough to correlate with a device_push_tokens row.
      const line = `[push] apns status=${status} env=${environment} token=${deviceToken.slice(0, 8)}…${responseBody ? ` body=${responseBody}` : ''}`
      if (status === 200) console.log(line)
      else console.error(line)
      resolve({ ok: status === 200, tokenGone, status })
    })
    req.on('error', (err) => {
      clearTimeout(bail)
      client.close()
      console.error(`[push] apns request error env=${environment}: ${err.message}`)
      resolve({ ok: false, tokenGone: false, status: 0 })
    })

    req.end(payload)
  })
}
