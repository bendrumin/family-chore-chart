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

const targets = [
  { env: 'STRIPE_PRICE_MONTHLY', name: 'monthly', mxn: 6900, brl: 1490 },
  { env: 'STRIPE_PRICE_ANNUAL', name: 'annual', mxn: 69900, brl: 14990 },
];
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

const fmt = (opts = {}) =>
  Object.entries(opts)
    .map(([cur, o]) => `${cur}=${(o.unit_amount / 100).toFixed(2)}`)
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
    console.log(`  would add: mxn=${(t.mxn / 100).toFixed(2)}  brl=${(t.brl / 100).toFixed(2)}`);
    continue;
  }
  await stripe('POST', `/v1/prices/${id}`, {
    'currency_options[mxn][unit_amount]': String(t.mxn),
    'currency_options[brl][unit_amount]': String(t.brl),
  });
  const after = await stripe('GET', `/v1/prices/${id}?expand[]=currency_options`);
  const ok =
    after.currency === before.currency &&
    after.unit_amount === before.unit_amount &&
    after.currency_options?.mxn?.unit_amount === t.mxn &&
    after.currency_options?.brl?.unit_amount === t.brl;
  console.log(`  -> ${ok ? 'APPLIED' : 'WROTE, BUT VERIFY FAILED — check the dashboard'}: ${fmt(after.currency_options)}`);
}
if (!apply) console.log('\nDry run only. Re-run with "apply" to write.');
