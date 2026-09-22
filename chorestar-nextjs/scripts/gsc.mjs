#!/usr/bin/env node
// Google Search Console, from the command line. Answers "did Google actually
// see it?" without opening the UI, and re-submits the sitemap after a deploy
// that adds pages (Google re-downloads it on its own schedule otherwise, which
// ran three days behind when this was written).
//
//   node scripts/gsc.mjs sites                    # properties this key can see
//   node scripts/gsc.mjs sitemaps                 # submitted sitemaps + errors
//   node scripts/gsc.mjs submit-sitemap           # ask Google to re-read it
//   node scripts/gsc.mjs inspect [url]            # index status of one page
//   node scripts/gsc.mjs queries [days] [page]    # top queries, whole site or one page
//
// Auth is the Play service account (~/.chorestar-android/play-key.json), which
// is a Full user on the property. Note what the API cannot do: "Request
// Indexing" is UI-only, and the separate Indexing API is restricted to job
// postings and livestreams, so a brand new page still wants that one manual
// click. IndexNow (scripts/indexnow.mjs) covers Bing and friends.
import crypto from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';

const SITE = 'sc-domain:chorestar.app';
const BASE = 'https://chorestar.app';

function serviceAccount() {
  const fallback = `${homedir()}/.chorestar-android/play-key.json`;
  const file = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_FILE || (existsSync(fallback) ? fallback : null);
  const raw = file ? readFileSync(file.replace(/^~/, homedir()), 'utf8') : process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error(`no key: put it at ${fallback}, or set GOOGLE_PLAY_SERVICE_ACCOUNT_FILE`);
  return JSON.parse(raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'));
}

const b64u = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');

async function accessToken() {
  const sa = serviceAccount();
  const uri = sa.token_uri || 'https://oauth2.googleapis.com/token';
  const now = Math.floor(Date.now() / 1000);
  const input = `${b64u({ alg: 'RS256', typ: 'JWT' })}.${b64u({
    iss: sa.client_email, scope: 'https://www.googleapis.com/auth/webmasters', aud: uri, iat: now, exp: now + 3600,
  })}`;
  const assertion = `${input}.${crypto.sign('RSA-SHA256', Buffer.from(input), sa.private_key).toString('base64url')}`;
  const res = await fetch(uri, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  if (!res.ok) throw new Error(`token exchange failed: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

async function call(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${url.split('?')[0]} -> ${res.status}\n${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : {};
}

const wm = (path) => `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}${path}`;
const full = (u) => (u?.startsWith('http') ? u : `${BASE}${u || '/'}`);

async function sites() {
  const { siteEntry = [] } = await call('GET', 'https://www.googleapis.com/webmasters/v3/sites');
  if (!siteEntry.length) {
    console.log('no properties: add the service account as a Full user in Search Console > Settings > Users and permissions');
    return;
  }
  for (const s of siteEntry) console.log(`${s.siteUrl}  (${s.permissionLevel})`);
}

async function sitemaps() {
  const { sitemap = [] } = await call('GET', wm('/sitemaps'));
  for (const s of sitemap) {
    const urls = s.contents?.[0]?.submitted ?? '?';
    console.log(`${s.path}`);
    console.log(`  submitted ${s.lastSubmitted ?? '-'} | last downloaded by Google ${s.lastDownloaded ?? 'never'}`);
    console.log(`  ${urls} urls | errors ${s.errors} | warnings ${s.warnings}${s.isPending ? ' | pending' : ''}`);
  }
  // The API's per-sitemap "indexed" count has been frozen at 0 for years; the
  // Index Coverage report is the real answer, so it is not printed here.
}

async function submitSitemap() {
  const url = `${BASE}/sitemap.xml`;
  await call('PUT', wm(`/sitemaps/${encodeURIComponent(url)}`));
  console.log(`submitted ${url}`);
}

async function inspect(target) {
  const url = full(target || '/android-beta');
  const { inspectionResult } = await call('POST', 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
    inspectionUrl: url, siteUrl: SITE,
  });
  const i = inspectionResult?.indexStatusResult ?? {};
  console.log(`url:          ${url}`);
  console.log(`verdict:      ${i.verdict ?? '-'}`);
  console.log(`coverage:     ${i.coverageState ?? '-'}`);
  console.log(`robots:       ${i.robotsTxtState ?? '-'}`);
  console.log(`indexing:     ${i.indexingState ?? '-'}`);
  console.log(`last crawl:   ${i.lastCrawlTime ?? 'never crawled'}`);
  console.log(`canonical:    ${i.googleCanonical ?? '-'}`);
  if (inspectionResult?.mobileUsabilityResult?.verdict) console.log(`mobile:       ${inspectionResult.mobileUsabilityResult.verdict}`);
}

async function queries(days = '28', page) {
  const end = new Date();
  const start = new Date(end.getTime() - Number(days) * 86400000);
  const body = {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    dimensions: ['query'],
    rowLimit: 15,
  };
  if (page) body.dimensionFilterGroups = [{ filters: [{ dimension: 'page', operator: 'equals', expression: full(page) }] }];
  const { rows = [] } = await call('POST', wm('/searchAnalytics/query'), body);
  console.log(`last ${days} days${page ? ` for ${full(page)}` : ''}: ${rows.length} queries`);
  for (const r of rows) {
    console.log(`  ${String(r.clicks).padStart(4)} clicks  ${String(r.impressions).padStart(5)} impr  pos ${r.position.toFixed(1).padStart(5)}  ${r.keys[0]}`);
  }
}

/**
 * Inspects every URL in the live sitemap and reports the ones Google has not
 * indexed, which is the list worth spending manual "Request indexing" clicks
 * on. Serial with a small pause: the inspection quota is 2000/day and 600/min,
 * and a burst gets throttled rather than answered.
 */
async function audit() {
  const xml = await (await fetch(`${BASE}/sitemap.xml`)).text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  console.log(`inspecting ${urls.length} urls from the sitemap\n`);
  const bad = [];
  for (const url of urls) {
    let i = {};
    try {
      const { inspectionResult } = await call('POST', 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
        inspectionUrl: url, siteUrl: SITE,
      });
      i = inspectionResult?.indexStatusResult ?? {};
    } catch (err) {
      console.log(`?? ${url}  (${err.message.split('\n')[0]})`);
      continue;
    }
    const indexed = i.verdict === 'PASS';
    const path = url.replace(BASE, '') || '/';
    console.log(`${indexed ? 'ok  ' : 'MISS'} ${path.padEnd(42)} ${i.coverageState ?? '-'}`);
    if (!indexed) bad.push({ path, coverage: i.coverageState ?? '-', crawled: i.lastCrawlTime });
    await new Promise((r) => setTimeout(r, 250));
  }
  console.log(`\n${urls.length - bad.length}/${urls.length} indexed`);
  if (bad.length) {
    console.log('\nrequest indexing for these:');
    for (const b of bad) console.log(`  ${BASE}${b.path}   (${b.coverage}${b.crawled ? `, last crawl ${b.crawled.slice(0, 10)}` : ', never crawled'})`);
  }
}

const [cmd = 'inspect', a, b] = process.argv.slice(2);
try {
  if (cmd === 'sites') await sites();
  else if (cmd === 'sitemaps') await sitemaps();
  else if (cmd === 'submit-sitemap') await submitSitemap();
  else if (cmd === 'inspect') await inspect(a);
  else if (cmd === 'queries') await queries(a, b);
  else if (cmd === 'audit') await audit();
  else {
    console.log('usage: gsc.mjs [sites | sitemaps | submit-sitemap | inspect [url] | queries [days] [page]]');
    process.exit(1);
  }
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
