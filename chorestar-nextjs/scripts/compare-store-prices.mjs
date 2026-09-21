#!/usr/bin/env node
// Do our Google Play prices agree with our App Store prices?
//
//   GOOGLE_PLAY_SERVICE_ACCOUNT_FILE=~/Downloads/key.json node scripts/compare-store-prices.mjs
//   ... --all      # every mapped market, not just the disagreements
//
// Apple's territories are ISO-3, Play's regions ISO-2, and neither exposes a
// mapping, so the table below covers the markets we actually care about: the
// thirteen purchasing-power markets plus the largest storefronts. Anything
// outside it was auto-converted from the same 4.99 / 49.99 USD base on both
// stores. Reads the ASC key from ~/.appstoreconnect like the iOS scripts.
import crypto from 'node:crypto';
import { createSign, createPrivateKey } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';

const PKG = process.env.GOOGLE_PLAY_PACKAGE_NAME || 'com.chorestar.family';
const APPLE = { monthly: '6794079692', yearly: '6800721055' };
const PLAY = { monthly: 'chorestar_premium_monthly', yearly: 'chorestar_premium_yearly' };

const MARKETS = {
  // the purchasing-power set we price by hand
  MEX: 'MX', BRA: 'BR', IND: 'IN', CHL: 'CL', COL: 'CO', ARG: 'AR', TUR: 'TR',
  EGY: 'EG', IDN: 'ID', PHL: 'PH', VNM: 'VN', PAK: 'PK', NGA: 'NG',
  // and the big storefronts, to catch conversion drift
  USA: 'US', CAN: 'CA', GBR: 'GB', IRL: 'IE', DEU: 'DE', FRA: 'FR', ESP: 'ES',
  ITA: 'IT', NLD: 'NL', BEL: 'BE', AUT: 'AT', CHE: 'CH', SWE: 'SE', NOR: 'NO',
  DNK: 'DK', FIN: 'FI', POL: 'PL', CZE: 'CZ', HUN: 'HU', ROU: 'RO', GRC: 'GR',
  PRT: 'PT', ISR: 'IL', SAU: 'SA', ARE: 'AE', ZAF: 'ZA', KEN: 'KE', MAR: 'MA',
  BGD: 'BD', LKA: 'LK', JPN: 'JP', KOR: 'KR', TWN: 'TW', HKG: 'HK', SGP: 'SG',
  MYS: 'MY', THA: 'TH', AUS: 'AU', NZL: 'NZ', PER: 'PE', URY: 'UY', ECU: 'EC',
  CRI: 'CR', PAN: 'PA', GTM: 'GT', DOM: 'DO',
};

// ── Apple ───────────────────────────────────────────────────────────────────
const KEY_ID = process.env.ASC_KEY_ID || 'P8NYU5K555';
const ISSUER = process.env.ASC_ISSUER_ID || '69a6de6f-7e14-47e3-e053-5b8c7c11a4d1';
const b64u = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
function ascToken() {
  const input = `${b64u({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' })}.${b64u({ iss: ISSUER, aud: 'appstoreconnect-v1', exp: Math.floor(Date.now() / 1000) + 1140 })}`;
  const key = createPrivateKey(readFileSync(`${homedir()}/.appstoreconnect/private_keys/AuthKey_${KEY_ID}.p8`));
  return `${input}.${createSign('sha256').update(input).sign({ key, dsaEncoding: 'ieee-p1363' }).toString('base64url')}`;
}
async function applePrices(subId) {
  const res = await fetch(`https://api.appstoreconnect.apple.com/v1/subscriptions/${subId}/prices?include=subscriptionPricePoint,territory&limit=200`,
    { headers: { Authorization: `Bearer ${ascToken()}` } });
  if (!res.ok) throw new Error(`ASC ${subId} -> ${res.status} ${await res.text()}`);
  const json = await res.json();
  const points = Object.fromEntries(json.included.filter((i) => i.type === 'subscriptionPricePoints').map((i) => [i.id, i.attributes]));
  const currencies = Object.fromEntries(json.included.filter((i) => i.type === 'territories').map((i) => [i.id, i.attributes.currency]));
  const out = {};
  for (const row of json.data) {
    const t = row.relationships?.territory?.data?.id;
    const p = row.relationships?.subscriptionPricePoint?.data?.id;
    if (!t || !points[p]) continue;
    out[t] = { amount: Number(points[p].customerPrice), currency: currencies[t] };
  }
  return out;
}

// ── Play ────────────────────────────────────────────────────────────────────
function serviceAccount() {
  const file = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_FILE;
  const raw = file ? readFileSync(file.replace(/^~/, homedir()), 'utf8') : process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('set GOOGLE_PLAY_SERVICE_ACCOUNT_FILE or GOOGLE_PLAY_SERVICE_ACCOUNT_JSON');
  return JSON.parse(raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'));
}
let playTok = null;
async function playToken() {
  if (playTok && playTok.expires > Date.now() + 60_000) return playTok.token;
  const sa = serviceAccount();
  const now = Math.floor(Date.now() / 1000);
  const uri = sa.token_uri || 'https://oauth2.googleapis.com/token';
  const input = `${b64u({ alg: 'RS256', typ: 'JWT' })}.${b64u({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher', aud: uri, iat: now, exp: now + 3600 })}`;
  const assertion = `${input}.${crypto.sign('RSA-SHA256', Buffer.from(input), sa.private_key).toString('base64url')}`;
  const res = await fetch(uri, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }) });
  const json = await res.json();
  playTok = { token: json.access_token, expires: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}
async function playPrices(productId) {
  const res = await fetch(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PKG}/subscriptions/${productId}`,
    { headers: { Authorization: `Bearer ${await playToken()}` } });
  if (!res.ok) throw new Error(`Play ${productId} -> ${res.status} ${await res.text()}`);
  const sub = await res.json();
  const out = {};
  for (const bp of sub.basePlans ?? []) {
    for (const rc of bp.regionalConfigs ?? []) {
      out[rc.regionCode] = { amount: Number(rc.price.units ?? 0) + Number(rc.price.nanos ?? 0) / 1e9, currency: rc.price.currencyCode };
    }
  }
  return out;
}

/** Patch Play to Apple's amount wherever the currency agrees. */
async function alignToApple(period, changes) {
  const productId = PLAY[period];
  const res = await fetch(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PKG}/subscriptions/${productId}`,
    { headers: { Authorization: `Bearer ${await playToken()}` } });
  const sub = await res.json();
  const basePlans = structuredClone(sub.basePlans ?? []);
  let touched = 0;
  for (const bp of basePlans) {
    for (const rc of bp.regionalConfigs ?? []) {
      const want = changes.get(rc.regionCode);
      if (!want) continue;
      const units = Math.floor(want);
      rc.price = { currencyCode: rc.price.currencyCode, units: String(units), nanos: Math.round((want - units) * 1e9) };
      touched += 1;
    }
  }
  if (touched === 0) return;
  const url = new URL(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PKG}/subscriptions/${productId}`);
  url.searchParams.set('updateMask', 'basePlans');
  url.searchParams.set('regionsVersion.version', process.env.PLAY_REGIONS_VERSION || '2022/02');
  const patch = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${await playToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ packageName: PKG, productId, basePlans }),
  });
  if (!patch.ok) throw new Error(`PATCH ${productId} -> ${patch.status}\n${(await patch.text()).slice(0, 600)}`);
  console.log(`  wrote ${touched} price${touched === 1 ? '' : 's'} to ${productId}`);
}

const showAll = process.argv.includes('--all');
const doApply = process.argv.includes('--apply');
for (const period of ['monthly', 'yearly']) {
  const [apple, play] = await Promise.all([applePrices(APPLE[period]), playPrices(PLAY[period])]);
  const rows = [];
  for (const [iso3, iso2] of Object.entries(MARKETS)) {
    const a = apple[iso3], p = play[iso2];
    if (!a && !p) continue;
    let verdict;
    if (!a) verdict = 'App Store does not sell here';
    else if (!p) verdict = 'Play does not sell here';
    else if (a.currency !== p.currency) verdict = `currency differs (${a.currency} vs ${p.currency})`;
    else {
      const diff = p.amount === 0 ? 1 : Math.abs(a.amount - p.amount) / a.amount;
      verdict = diff < 0.005 ? 'match' : `${((p.amount / a.amount - 1) * 100).toFixed(0)}% ${p.amount > a.amount ? 'higher' : 'lower'} on Play`;
    }
    rows.push({ market: `${iso3}/${iso2}`, apple: a ? `${a.amount} ${a.currency}` : '-', play: p ? `${p.amount} ${p.currency}` : '-', verdict });
  }
  const bad = rows.filter((r) => r.verdict !== 'match');
  console.log(`\n${period.toUpperCase()}  ${rows.length} markets compared, ${rows.length - bad.length} match, ${bad.length} differ`);
  for (const r of (showAll ? rows : bad)) {
    console.log(`  ${r.market.padEnd(8)} Apple ${r.apple.padEnd(16)} Play ${r.play.padEnd(16)} ${r.verdict}`);
  }
  // Alignable = same currency on both stores, amounts apart. Currency
  // mismatches (Apple sells in USD, Play in the local currency) are left alone.
  const changes = new Map();
  for (const [iso3, iso2] of Object.entries(MARKETS)) {
    const a = apple[iso3], p = play[iso2];
    if (!a || !p || a.currency !== p.currency) continue;
    if (Math.abs(a.amount - p.amount) / a.amount < 0.005) continue;
    changes.set(iso2, a.amount);
  }
  console.log(`  alignable to Apple: ${changes.size} market${changes.size === 1 ? '' : 's'}${doApply ? '' : ' (pass --apply to write)'}`);
  if (doApply && changes.size) await alignToApple(period, changes);
}
