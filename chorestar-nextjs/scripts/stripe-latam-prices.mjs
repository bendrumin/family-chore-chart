#!/usr/bin/env node
// Add MXN/BRL currency options to the ChoreStar Stripe subscription prices,
// mirroring the Apple PPP pricing that takes effect 2026-09-05:
//   monthly  MX$69.00  (mxn 6900)   R$14.90  (brl 1490)
//   annual   MX$699.00 (mxn 69900)  R$149.90 (brl 14990)
//
// Run from chorestar-nextjs/ so --env-file resolves:
//   node --env-file=.env.local scripts/stripe-latam-prices.mjs         # dry run
//   node --env-file=.env.local scripts/stripe-latam-prices.mjs apply   # write
//
// Price IDs stay the same, so STRIPE_PRICE_* env vars and all app code are
// untouched. Checkout auto-presents the local currency when a price carries
// a matching currency option (the session passes only { price: priceId }).
// currency_options updates merge per currency key; USD is never touched.
// Existing subscriptions keep the currency they were created in.

const KEY = (process.env.STRIPE_SECRET_KEY ?? '').trim().replace(/\\n$/, '');
if (!KEY) {
  console.error('STRIPE_SECRET_KEY is not set — run with --env-file=.env.local from chorestar-nextjs/');
  process.exit(1);
}

// inr added 2026-09-06 (₹99 / ₹999, mirroring the Apple India change).
// Note: recurring card charges on Indian cards often fail regardless of
// currency (RBI auto-pay rules) — Apple is where Indian subscriptions
// actually convert; the INR option here is for display parity and the
// cards that do work.
// clp/cop added 2026-09-06 with the tier-2 Apple batch (Chile has real web
// users; Colombia rides along). CLP is ZERO-decimal in Stripe: unit_amount
// 1990 means CLP 1,990. COP is two-decimal: 990000 means COP 9,900.00.
// The other tier-2 markets (TRY, EGP, IDR, PHP, VND, PKR, NGN, ARS) stay
// Apple-only: card recurring billing there is unreliable and web traffic
// from them is negligible.
const targets = [
  { env: 'STRIPE_PRICE_MONTHLY', name: 'monthly', mxn: 6900, brl: 1490, inr: 9900, clp: 1990, cop: 990000 },
  { env: 'STRIPE_PRICE_ANNUAL', name: 'annual', mxn: 69900, brl: 14990, inr: 99900, clp: 19900, cop: 9990000 },
];
const CURRENCIES = ['mxn', 'brl', 'inr', 'clp', 'cop'];
const mask = (id) => `…${id.slice(-4)}`;

async function stripe(method, path, form) {
  const res = await fetch(`https://api.stripe.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${KEY}`,
      ...(form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: form ? new URLSearchParams(form) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${method} ${path.replace(/price_\w+/, 'price_<masked>')} -> ${res.status}: ${json.error?.message ?? 'unknown error'}`);
  return json;
}

// Stripe zero-decimal currencies store whole units in unit_amount.
const ZERO_DECIMAL = new Set(['clp', 'jpy', 'krw', 'vnd', 'pyg', 'bif', 'djf', 'gnf', 'kmf', 'mga', 'rwf', 'ugx', 'vuv', 'xaf', 'xof', 'xpf']);
const fmt = (opts = {}) =>
  Object.entries(opts)
    .map(([cur, o]) => `${cur}=${ZERO_DECIMAL.has(cur) ? o.unit_amount.toLocaleString('en-US') : (o.unit_amount / 100).toFixed(2)}`)
    .join('  ') || '(none beyond the base currency)';

const apply = process.argv[2] === 'apply';
for (const t of targets) {
  const id = (process.env[t.env] ?? '').trim();
  if (!id) {
    console.error(`${t.env} is not set — skipping ${t.name}`);
    continue;
  }
  const before = await stripe('GET', `/v1/prices/${id}?expand[]=currency_options`);
  console.log(
    `${t.name} (${t.env} ${mask(id)}): base ${before.currency} ${(before.unit_amount / 100).toFixed(2)}` +
      `  options: ${fmt(before.currency_options)}`
  );
  if (!apply) {
    console.log(`  would set: ${CURRENCIES.map((c) => `${c}=${t[c]}`).join('  ')} (raw unit_amounts)`);
    continue;
  }
  const form = {};
  for (const c of CURRENCIES) form[`currency_options[${c}][unit_amount]`] = String(t[c]);
  await stripe('POST', `/v1/prices/${id}`, form);
  const after = await stripe('GET', `/v1/prices/${id}?expand[]=currency_options`);
  const ok =
    after.currency === before.currency &&
    after.unit_amount === before.unit_amount &&
    CURRENCIES.every((c) => after.currency_options?.[c]?.unit_amount === t[c]);
  console.log(`  -> ${ok ? 'APPLIED' : 'WROTE, BUT VERIFY FAILED — check the dashboard'}: ${fmt(after.currency_options)}`);
}
if (!apply) console.log('\nDry run only. Re-run with "apply" to write.');
