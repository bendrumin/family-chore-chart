#!/usr/bin/env node
// Does every premium profile actually have a payment behind it?
//
//   node --env-file=.env.local scripts/audit-entitlements.mjs          # report only
//   node --env-file=.env.local scripts/audit-entitlements.mjs --apply  # downgrade the unbacked
//
// Written after finding a family who cancelled in Stripe in November 2025 and
// was still premium eleven months later: the webhook looked the user up by
// subscription.metadata.userId, that subscription had none, and the handler
// returned silently. Tiers are money, so this reads Stripe rather than trusting
// the column, and refuses to touch anything it cannot explain.
//
// COMPED lists accounts that are premium on purpose (the founder, the App
// Review demo). They are reported, never changed.
import { createClient } from '@supabase/supabase-js'

const COMPED = new Set(['bsiegel13@gmail.com', 'appreview@chorestar.app'])
const apply = process.argv.includes('--apply')

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()
const key = (process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim().replace(/\\n$/, '')
const stripeKey = (process.env.STRIPE_SECRET_KEY ?? '').trim()
if (!url || !key) { console.error('missing Supabase env'); process.exit(1) }
if (!stripeKey) { console.error('missing STRIPE_SECRET_KEY: cannot verify, refusing to guess'); process.exit(1) }

const admin = createClient(url, key, { auth: { persistSession: false } })
const stripe = async (path) => {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, { headers: { Authorization: `Bearer ${stripeKey}` } })
  const json = await res.json()
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${json.error?.message ?? ''}`)
  return json
}

const mask = (e) => String(e ?? '').replace(/^(.{3}).*(@.*)$/, '$1***$2')
const ACTIVE = new Set(['active', 'trialing', 'past_due'])

const { data: profiles, error } = await admin
  .from('profiles')
  .select('id, email, family_name, subscription_type, apple_original_transaction_id, google_purchase_token')
  // 'lifetime' is not a value the subscription_type enum accepts, so asking for
  // it errors the whole query. See the note in the header about that.
  .eq('subscription_type', 'premium')
if (error) { console.error(error.message); process.exit(1) }

const rows = []
for (const p of profiles) {
  let verdict, detail
  if (COMPED.has((p.email ?? '').toLowerCase())) {
    verdict = 'comped'; detail = 'on the allow-list'
  } else if (p.apple_original_transaction_id) {
    verdict = 'keep'; detail = 'Apple transaction on file'
  } else if (p.google_purchase_token) {
    verdict = 'keep'; detail = 'Play purchase token on file'
  } else {
    const customers = await stripe(`customers?email=${encodeURIComponent(p.email ?? '')}&limit=5`)
    if (!customers.data.length) {
      verdict = 'UNBACKED'; detail = 'no Stripe customer, no Apple, no Play'
    } else {
      const states = []
      for (const c of customers.data) {
        const subs = await stripe(`subscriptions?customer=${c.id}&status=all&limit=10`)
        states.push(...subs.data.map((s) => s.status))
      }
      const live = states.filter((s) => ACTIVE.has(s))
      if (live.length) { verdict = 'keep'; detail = `Stripe ${live.join(', ')}` }
      else { verdict = 'UNBACKED'; detail = `Stripe has only ${states.join(', ') || 'no subscriptions'}` }
    }
  }
  rows.push({ ...p, verdict, detail })
}

for (const r of rows) {
  const tag = r.verdict === 'UNBACKED' ? 'UNBACKED' : r.verdict === 'comped' ? 'comped  ' : 'keep    '
  console.log(`${tag} ${mask(r.email).padEnd(26)} ${String(r.subscription_type).padEnd(8)} ${r.detail}  (${r.family_name})`)
}

const unbacked = rows.filter((r) => r.verdict === 'UNBACKED')
console.log(`\n${rows.length} premium | keep ${rows.filter((r) => r.verdict === 'keep').length} | comped ${rows.filter((r) => r.verdict === 'comped').length} | unbacked ${unbacked.length}`)

if (!unbacked.length) process.exit(0)
if (!apply) {
  console.log('\nDRY RUN. Nothing changed. Re-run with --apply to set the unbacked accounts to free.')
  process.exit(0)
}
for (const r of unbacked) {
  const { error: e } = await admin.from('profiles').update({ subscription_type: 'free' }).eq('id', r.id)
  console.log(e ? `  FAILED ${mask(r.email)}: ${e.message}` : `  downgraded ${mask(r.email)} -> free`)
}
