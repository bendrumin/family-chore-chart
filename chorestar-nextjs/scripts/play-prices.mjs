#!/usr/bin/env node
// Google Play subscription pricing from the command line, the Play-side twin of
// ChoreStar-iOS/scripts/apply-latam-prices.mjs (Apple) and
// scripts/stripe-latam-prices.mjs (Stripe).
//
//   node --env-file=.env.local scripts/play-prices.mjs show
//   node --env-file=.env.local scripts/play-prices.mjs convert 4.99
//   node --env-file=.env.local scripts/play-prices.mjs plan            # dry run
//   node --env-file=.env.local scripts/play-prices.mjs apply           # write
//   node --env-file=.env.local scripts/play-prices.mjs apply TIER2     # subset
//   node --env-file=.env.local scripts/play-prices.mjs apply MX
//
// Reads GOOGLE_PLAY_SERVICE_ACCOUNT_JSON (raw JSON or base64) and
// GOOGLE_PLAY_PACKAGE_NAME the same way lib/google/play-api.ts does, so run it
// with node's --env-file and the key is never printed or copied anywhere.
//
// The service account needs "Manage store presence" (or a role including
// price edits) granted to it in the Play Console under Users and permissions.
//
// Prices of an EXISTING base plan are set by patching the subscription with
// updateMask=basePlans plus regionsVersion.version; Google rejects a regional
// write without that version. Changing a price does NOT move existing
// subscribers: that is a separate basePlans.batchMigratePrices call, which
// this script deliberately does not make.
import crypto from 'node:crypto';

const PKG = process.env.GOOGLE_PLAY_PACKAGE_NAME || 'com.chorestar.app';
const BASE = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PKG}`;
// The published region catalogue a regional write is validated against.
const REGIONS_VERSION = process.env.PLAY_REGIONS_VERSION || '2022/02';
const MONTHLY = 'chorestar_premium_monthly';
const YEARLY = 'chorestar_premium_yearly';

function serviceAccount() {
  const raw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is not set (run with node --env-file=.env.local)');
  const text = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  const sa = JSON.parse(text);
  if (!sa.client_email || !sa.private_key) throw new Error('service account JSON lacks client_email or private_key');
  return sa;
}

const b64u = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
let cachedToken = null;

async function accessToken() {
  if (cachedToken && cachedToken.expires > Date.now() + 60_000) return cachedToken.token;
  const sa = serviceAccount();
  const now = Math.floor(Date.now() / 1000);
  const tokenUri = sa.token_uri || 'https://oauth2.googleapis.com/token';
  const input = `${b64u({ alg: 'RS256', typ: 'JWT' })}.${b64u({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: tokenUri,
    iat: now,
    exp: now + 3600,
  })}`;
  const assertion = `${input}.${crypto.sign('RSA-SHA256', Buffer.from(input), sa.private_key).toString('base64url')}`;
  const res = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  if (!res.ok) throw new Error(`token exchange failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  cachedToken = { token: json.access_token, expires: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

async function api(method, path, body, query = {}) {
  const url = new URL(path.startsWith('http') ? path : `${BASE}${path}`);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`${method} ${url.pathname} -> ${res.status}\n${JSON.stringify(json.error ?? json, null, 2)}`);
  return json;
}

// ── Money helpers: Play carries units + nanos, never a float ────────────────
const toMoney = (currencyCode, amount) => {
  const units = Math.floor(amount);
  const nanos = Math.round((amount - units) * 1e9);
  return { currencyCode, units: String(units), nanos };
};
const fromMoney = (m) => (m ? Number(m.units ?? 0) + Number(m.nanos ?? 0) / 1e9 : null);
const fmt = (m) => (m ? `${fromMoney(m).toFixed(2)} ${m.currencyCode}` : '-');

/**
 * The same purchasing-power prices Apple and Stripe already use, as
 * (Play region code, currency, monthly, yearly). Apple's territories are
 * ISO-3, Play's regions ISO-2, so the codes differ from the Apple script's.
 */
const PPP = [
  { region: 'MX', currency: 'MXN', monthly: 69, yearly: 699 },
  { region: 'BR', currency: 'BRL', monthly: 14.9, yearly: 149.9 },
  { region: 'IN', currency: 'INR', monthly: 99, yearly: 999 },
  { region: 'CL', currency: 'CLP', monthly: 1990, yearly: 19900, tier2: true },
  { region: 'CO', currency: 'COP', monthly: 9900, yearly: 99900, tier2: true },
  { region: 'AR', currency: 'USD', monthly: 1.99, yearly: 19.99, tier2: true },
  { region: 'TR', currency: 'TRY', monthly: 79.99, yearly: 799.99, tier2: true },
  { region: 'EG', currency: 'EGP', monthly: 99.99, yearly: 999.99, tier2: true },
  { region: 'ID', currency: 'IDR', monthly: 29000, yearly: 299000, tier2: true },
  { region: 'PH', currency: 'PHP', monthly: 99, yearly: 999, tier2: true },
  { region: 'VN', currency: 'VND', monthly: 49000, yearly: 499000, tier2: true },
  { region: 'PK', currency: 'PKR', monthly: 400, yearly: 3900, tier2: true },
  { region: 'NG', currency: 'NGN', monthly: 1900, yearly: 19900, tier2: true },
];

function selection(filter) {
  if (!filter) return PPP;
  if (filter.toUpperCase() === 'TIER2') return PPP.filter((p) => p.tier2);
  if (filter.toUpperCase() === 'ALL') return PPP;
  return PPP.filter((p) => p.region === filter.toUpperCase());
}

const getSub = (productId) => api('GET', `/subscriptions/${productId}`);

async function show() {
  const list = await api('GET', '/subscriptions', undefined, { pageSize: '50' });
  const subs = list.subscriptions ?? [];
  if (subs.length === 0) {
    console.log(`no subscriptions on ${PKG} yet`);
    return;
  }
  for (const sub of subs) {
    console.log(`\n${sub.productId}  (${sub.listings?.[0]?.title ?? 'no listing'})`);
    for (const bp of sub.basePlans ?? []) {
      const period = bp.autoRenewingBasePlanType?.billingPeriodDuration ?? bp.prepaidBasePlanType?.billingPeriodDuration ?? '?';
      console.log(`  base plan ${bp.basePlanId}  ${period}  state=${bp.state}  regions=${(bp.regionalConfigs ?? []).length}`);
      for (const rc of bp.regionalConfigs ?? []) {
        const mine = PPP.find((p) => p.region === rc.regionCode);
        const want = mine ? (period === 'P1Y' ? mine.yearly : mine.monthly) : null;
        const now = fromMoney(rc.price);
        const flag = want != null && now != null && Math.abs(now - want) > 0.005 ? '  <- differs from our PPP target' : '';
        if (mine || rc.regionCode === 'US') console.log(`    ${rc.regionCode}  ${fmt(rc.price)}${flag}`);
      }
    }
    for (const off of sub.offers ?? []) console.log(`  offer ${off.offerId} state=${off.state}`);
  }
}

/** Google's own suggested local prices for a base USD amount (the Console's auto-convert). */
async function convert(usd) {
  const out = await api('POST', `${BASE}/pricing:convertRegionPrices`, { price: toMoney('USD', Number(usd)) });
  const rows = Object.entries(out.convertedRegionPrices ?? {});
  console.log(`Google's suggestions for ${Number(usd).toFixed(2)} USD (${rows.length} regions)`);
  for (const { 0: region, 1: v } of rows) {
    const mine = PPP.find((p) => p.region === region);
    console.log(`  ${region}  ${fmt(v.price)}${mine ? `   our target ${mine.monthly} ${mine.currency}` : ''}`);
  }
}

async function planOrApply(write, filter) {
  const targets = selection(filter);
  if (targets.length === 0) throw new Error(`nothing matches filter "${filter}"`);
  for (const productId of [MONTHLY, YEARLY]) {
    const sub = await getSub(productId);
    const basePlans = structuredClone(sub.basePlans ?? []);
    if (basePlans.length === 0) {
      console.log(`${productId}: no base plans, skipping`);
      continue;
    }
    let touched = 0;
    for (const bp of basePlans) {
      const period = bp.autoRenewingBasePlanType?.billingPeriodDuration ?? '';
      const yearly = period === 'P1Y' || productId === YEARLY;
      bp.regionalConfigs = bp.regionalConfigs ?? [];
      for (const t of targets) {
        const amount = yearly ? t.yearly : t.monthly;
        const want = toMoney(t.currency, amount);
        const existing = bp.regionalConfigs.find((rc) => rc.regionCode === t.region);
        const before = existing ? fmt(existing.price) : '(not offered)';
        if (existing && existing.price?.currencyCode === want.currencyCode && fromMoney(existing.price) === amount) {
          console.log(`${productId} ${bp.basePlanId} ${t.region}: already ${before}`);
          continue;
        }
        console.log(`${productId} ${bp.basePlanId} ${t.region}: ${before} -> ${fmt(want)}`);
        if (existing) existing.price = want;
        else bp.regionalConfigs.push({ regionCode: t.region, newSubscriberAvailability: true, price: want });
        touched += 1;
      }
    }
    if (!write || touched === 0) continue;
    await api('PATCH', `/subscriptions/${productId}`, { packageName: PKG, productId, basePlans }, {
      updateMask: 'basePlans',
      'regionsVersion.version': REGIONS_VERSION,
      latencyTolerance: 'PRODUCT_UPDATE_LATENCY_TOLERANCE_LATENCY_SENSITIVE',
    });
    console.log(`${productId}: wrote ${touched} regional price${touched === 1 ? '' : 's'}`);
  }
  if (!write) console.log('\ndry run: nothing written. Re-run with "apply" to write.');
}

const [cmd, arg] = process.argv.slice(2);
try {
  if (cmd === 'show') await show();
  else if (cmd === 'convert') await convert(arg ?? '4.99');
  else if (cmd === 'apply') await planOrApply(true, arg);
  else if (cmd === 'plan' || cmd === undefined) await planOrApply(false, arg);
  else {
    console.log('usage: play-prices.mjs [show | convert <usd> | plan [filter] | apply [filter]]');
    process.exit(1);
  }
} catch (err) {
  console.error(String(err.message ?? err));
  process.exit(1);
}
