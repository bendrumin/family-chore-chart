#!/usr/bin/env node
// Apply PPP price points for ChoreStar subscriptions in Mexico and Brazil.
//
//   node apply-latam-prices.mjs         # dry run: resolve + print the 4 targets
//   node apply-latam-prices.mjs apply   # create the subscriptionPrices in ASC
//
// Verified 2026-09-03: all four price points exist (dry run below), and there
// are no existing subscribers in MEX/BRA, so nothing is grandfathered.
//   monthly MEX 69.0 (proceeds 41.64)   monthly BRA 14.9 (proceeds 9.11)
//   yearly  MEX 699.0 (proceeds 421.81) yearly  BRA 149.9 (proceeds 91.68)
// An APPROVED subscription rejects a price with no startDate (409 "Initial
// price cannot be created again") — live subs only take SCHEDULED changes.
// Apple also enforces a minimum lead time on ITS clock, not ours (a local
// "tomorrow" can be rejected with "must be on or after <date>"), so the
// script tries tomorrow and, when Apple's 409 names the earliest legal date,
// retries with exactly that date.
import { createSign, createPrivateKey } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';

const KEY_ID = 'P8NYU5K555';
const ISSUER = '69a6de6f-7e14-47e3-e053-5b8c7c11a4d1';
const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
function token() {
  const input = `${b64u({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' })}.${b64u({
    iss: ISSUER, aud: 'appstoreconnect-v1', exp: Math.floor(Date.now() / 1000) + 1140,
  })}`;
  const key = createPrivateKey(readFileSync(`${homedir()}/.appstoreconnect/private_keys/AuthKey_${KEY_ID}.p8`));
  const sig = createSign('sha256').update(input).sign({ key, dsaEncoding: 'ieee-p1363' });
  return `${input}.${sig.toString('base64url')}`;
}
async function api(method, path, body) {
  const res = await fetch(`https://api.appstoreconnect.apple.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}\n${JSON.stringify(json.errors ?? json)}`);
  return json;
}

const MONTHLY = '6794079692'; // Premium Monthly
const YEARLY = '6800721055';  // ChoreStar Premium Yearly
const changes = [
  { sub: MONTHLY, name: 'monthly', territory: 'MEX', price: 69.0 },
  { sub: MONTHLY, name: 'monthly', territory: 'BRA', price: 14.9 },
  { sub: YEARLY, name: 'yearly', territory: 'MEX', price: 699.0 },
  { sub: YEARLY, name: 'yearly', territory: 'BRA', price: 149.9 },
];

const apply = process.argv[2] === 'apply';
let startDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
if (apply) console.log(`scheduling price changes for ${startDate} (or Apple's earliest legal date)`);

function post(sub, pointId, date) {
  return api('POST', '/v1/subscriptionPrices', {
    data: {
      type: 'subscriptionPrices',
      attributes: { startDate: date },
      relationships: {
        subscription: { data: { type: 'subscriptions', id: sub } },
        subscriptionPricePoint: { data: { type: 'subscriptionPricePoints', id: pointId } },
      },
    },
  });
}

for (const c of changes) {
  const pts = await api('GET',
    `/v1/subscriptions/${c.sub}/pricePoints?filter[territory]=${c.territory}&limit=8000&fields[subscriptionPricePoints]=customerPrice,proceeds`);
  const hit = pts.data.find((p) => parseFloat(p.attributes.customerPrice) === c.price);
  if (!hit) { console.log(`${c.name} ${c.territory} ${c.price}: NOT FOUND`); continue; }
  console.log(`${c.name} ${c.territory}: pricePoint ${hit.id} customer=${hit.attributes.customerPrice} proceeds=${hit.attributes.proceeds}`);
  if (!apply) continue;
  try {
    const res = await post(c.sub, hit.id, startDate);
    console.log(`  -> SCHEDULED subscriptionPrice ${res.data.id} for ${startDate}`);
  } catch (e) {
    const earliest = e.message.match(/must be on or after (\d{4}-\d{2}-\d{2})/)?.[1];
    if (!earliest) {
      console.log(`  -> FAILED: ${e.message.split('\n')[1] ?? e.message}`);
      continue;
    }
    startDate = earliest; // later changes go straight to the accepted date
    try {
      const res = await post(c.sub, hit.id, earliest);
      console.log(`  -> SCHEDULED subscriptionPrice ${res.data.id} for ${earliest} (Apple's earliest)`);
    } catch (e2) {
      console.log(`  -> FAILED on retry with ${earliest}: ${e2.message.split('\n')[1] ?? e2.message}`);
    }
  }
}

// Show what ASC now reports for the touched territories.
for (const sub of [MONTHLY, YEARLY]) {
  const j = await api('GET',
    `/v1/subscriptions/${sub}/prices?include=subscriptionPricePoint,territory&filter[territory]=MEX,BRA&limit=50`);
  const pts = Object.fromEntries((j.included ?? []).filter((i) => i.type === 'subscriptionPricePoints').map((i) => [i.id, i.attributes]));
  for (const p of j.data) {
    const t = p.relationships.territory.data.id;
    const pp = pts[p.relationships.subscriptionPricePoint.data.id] ?? {};
    console.log(`${sub === MONTHLY ? 'monthly' : 'yearly'} ${t}: ${pp.customerPrice} (startDate=${p.attributes?.startDate ?? 'immediate'})`);
  }
}
