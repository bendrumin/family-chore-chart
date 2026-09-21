#!/usr/bin/env node
// Upload an Android App Bundle to a Play track, the way ChoreStar-iOS/scripts/
// ship-b35.sh does for Apple. One edit per run: insert, upload, set the track's
// release, commit.
//
//   GOOGLE_PLAY_SERVICE_ACCOUNT_FILE=~/Downloads/key.json \
//   node scripts/play-release.mjs internal ../ChoreStar-Android-Native/app/build/outputs/bundle/release/app-release.aab
//
//   ... internal <aab> --status=completed   # roll it out to that track's testers
//   ... tracks                             # just show the tracks and releases
//
// Defaults to a draft release: the bundle lands on the track and nothing is
// handed to testers until the release is rolled out. Release notes come from
// ChoreStar-Android-Native/fastlane/metadata/<lang>/release_notes.txt when
// present, and are only sent for languages the listing already has.
import crypto from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename } from 'node:path';

const PKG = process.env.GOOGLE_PLAY_PACKAGE_NAME || 'com.chorestar.family';
const V3 = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PKG}`;
const UPLOAD = `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${PKG}`;

function serviceAccount() {
  // Where the setup notes put the Play key, so plain commands work with no env var.
  const fallback = `${homedir()}/.chorestar-android/play-key.json`;
  const file = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_FILE || (existsSync(fallback) ? fallback : null);
  const raw = file ? readFileSync(file.replace(/^~/, homedir()), 'utf8') : process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error(`no Play key: put it at ${fallback}, or set GOOGLE_PLAY_SERVICE_ACCOUNT_FILE / GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`);
  const sa = JSON.parse(raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'));
  if (!sa.client_email || !sa.private_key) throw new Error('key file lacks client_email or private_key');
  return sa;
}
const b64u = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
let cached = null;
async function accessToken() {
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;
  const sa = serviceAccount();
  const now = Math.floor(Date.now() / 1000);
  const uri = sa.token_uri || 'https://oauth2.googleapis.com/token';
  const input = `${b64u({ alg: 'RS256', typ: 'JWT' })}.${b64u({
    iss: sa.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher', aud: uri, iat: now, exp: now + 3600,
  })}`;
  const assertion = `${input}.${crypto.sign('RSA-SHA256', Buffer.from(input), sa.private_key).toString('base64url')}`;
  const res = await fetch(uri, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  if (!res.ok) throw new Error(`token exchange failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  cached = { token: json.access_token, expires: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}
async function api(method, path, body, query = {}) {
  const url = new URL(path.startsWith('http') ? path : `${V3}${path}`);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  const res = await fetch(url, {
    method, headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`${method} ${url.pathname} -> ${res.status}\n${JSON.stringify(json.error ?? json, null, 2)}`);
  return json;
}

// fastlane supply's layout, so `supply` and this script read the same files.
const META = new URL('../../ChoreStar-Android-Native/fastlane/metadata/android/', import.meta.url);
const read = (rel) => {
  try { return readFileSync(new URL(rel, META), 'utf8').trim() || null; } catch { return null; }
};

function releaseNotes(available, versionCode) {
  const notes = [];
  for (const lang of available) {
    const text = read(`${lang}/changelogs/${versionCode}.txt`);
    if (text) notes.push({ language: lang, text: text.slice(0, 500) });
  }
  return notes;
}

async function showTracks() {
  const edit = await api('POST', '/edits');
  const tracks = await api('GET', `/edits/${edit.id}/tracks`);
  for (const t of tracks.tracks ?? []) {
    const rels = (t.releases ?? []).map((r) => `${r.status} ${JSON.stringify(r.versionCodes ?? [])}${r.name ? ` "${r.name}"` : ''}`);
    console.log(`${t.track.padEnd(12)} ${rels.length ? rels.join(', ') : '(no releases)'}`);
  }
  const bundles = await api('GET', `/edits/${edit.id}/bundles`);
  console.log(`bundles uploaded: ${(bundles.bundles ?? []).map((b) => b.versionCode).join(', ') || 'none'}`);
  await api('DELETE', `/edits/${edit.id}`);
}

async function upload(track, aabPath, status) {
  const size = statSync(aabPath).size;
  const edit = await api('POST', '/edits');
  console.log(`edit ${edit.id}`);
  const res = await fetch(`${UPLOAD}/edits/${edit.id}/bundles?uploadType=media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/octet-stream', 'Content-Length': String(size) },
    body: readFileSync(aabPath),
  });
  const text = await res.text();
  if (!res.ok) {
    await api('DELETE', `/edits/${edit.id}`).catch(() => {});
    throw new Error(`bundle upload -> ${res.status}\n${text.slice(0, 900)}`);
  }
  const bundle = JSON.parse(text);
  console.log(`uploaded ${basename(aabPath)} (${(size / 1e6).toFixed(1)} MB) as versionCode ${bundle.versionCode}`);

  const listings = await api('GET', `/edits/${edit.id}/listings`);
  const langs = new Set((listings.listings ?? []).map((l) => l.language));
  const notes = releaseNotes(langs, bundle.versionCode);
  console.log(`release notes for: ${notes.map((n) => n.language).join(', ') || '(none; listing languages are ' + [...langs].join(', ') + ')'}`);

  await api('PUT', `/edits/${edit.id}/tracks/${track}`, {
    track,
    releases: [{ name: String(bundle.versionCode), versionCodes: [String(bundle.versionCode)], status, releaseNotes: notes }],
  });
  const done = await api('POST', `/edits/${edit.id}:commit`);
  console.log(`committed edit ${done.id}: versionCode ${bundle.versionCode} is a ${status} release on ${track}`);
}

/** Push the store listing text and contact details from the metadata files. */
async function pushListing() {
  const edit = await api('POST', '/edits');
  const existing = await api('GET', `/edits/${edit.id}/listings`);
  const byLang = Object.fromEntries((existing.listings ?? []).map((x) => [x.language, x]));
  // Every language with metadata files, so a new locale is created rather than skipped.
  const langs = readdirSync(META).filter((d) => { try { return statSync(new URL(`${d}/`, META)).isDirectory(); } catch { return false; } });
  for (const lang of langs) {
    const l = byLang[lang] ?? {};
    const title = read(`${lang}/title.txt`);
    const short = read(`${lang}/short_description.txt`);
    const full = read(`${lang}/full_description.txt`);
    if (!title && !short && !full) { console.log(`${lang}: no metadata files, skipped`); continue; }
    await api('PUT', `/edits/${edit.id}/listings/${lang}`, {
      language: lang,
      title: title ?? l.title,
      shortDescription: short ?? l.shortDescription,
      fullDescription: full ?? l.fullDescription,
    });
    console.log(`${lang}: title ${title?.length ?? 0}, short ${short?.length ?? 0}, full ${full?.length ?? 0} chars`);
  }
  await api('PUT', `/edits/${edit.id}/details`, {
    defaultLanguage: 'en-US',
    contactEmail: 'hi@chorestar.app',
    contactWebsite: 'https://chorestar.app',
  });
  console.log('details: contact email and website set');
  const done = await api('POST', `/edits/${edit.id}:commit`);
  console.log(`committed edit ${done.id}`);
}

/** Upload the feature graphic and phone screenshots from docs/assets/play. */
async function pushImages() {
  const assets = new URL('../../docs/assets/play/', import.meta.url);
  const plan = [['featureGraphic', ['feature-graphic-1024x500.png']],
    ['phoneScreenshots', ['phone-01.png', 'phone-02.png', 'phone-03.png', 'phone-04.png', 'phone-05.png', 'phone-06.png']]];
  const edit = await api('POST', '/edits');
  for (const [type, files] of plan) {
    const present = files.filter((f) => { try { statSync(new URL(f, assets)); return true; } catch { return false; } });
    if (present.length === 0) { console.log(`${type}: no files found, skipped`); continue; }
    if (type === 'phoneScreenshots') {
      await api('DELETE', `/edits/${edit.id}/listings/en-US/${type}`).catch(() => {});
    }
    for (const f of present) {
      const bytes = readFileSync(new URL(f, assets));
      const res = await fetch(`${UPLOAD}/edits/${edit.id}/listings/en-US/${type}?uploadType=media`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'image/png', 'Content-Length': String(bytes.length) },
        body: bytes,
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`${type} ${f} -> ${res.status}\n${text.slice(0, 500)}`);
      console.log(`${type}: uploaded ${f} (${(bytes.length / 1e3).toFixed(0)} kB)`);
    }
  }
  const done = await api('POST', `/edits/${edit.id}:commit`);
  console.log(`committed edit ${done.id}`);
}

/** Flip an existing draft release on a track to rolled out, without re-uploading. */
async function rollout(track, versionCode) {
  const edit = await api('POST', '/edits');
  const tracks = await api('GET', `/edits/${edit.id}/tracks`);
  const t = (tracks.tracks ?? []).find((x) => x.track === track);
  const release = (t?.releases ?? []).find((r) => !versionCode || (r.versionCodes ?? []).includes(String(versionCode)));
  if (!release) {
    await api('DELETE', `/edits/${edit.id}`).catch(() => {});
    throw new Error(`no release on ${track}${versionCode ? ` for versionCode ${versionCode}` : ''}`);
  }
  if (release.status === 'completed') {
    console.log(`${track}: versionCode ${release.versionCodes} is already rolled out`);
    await api('DELETE', `/edits/${edit.id}`);
    return;
  }
  await api('PUT', `/edits/${edit.id}/tracks/${track}`, { track, releases: [{ ...release, status: 'completed' }] });
  const done = await api('POST', `/edits/${edit.id}:commit`);
  console.log(`committed edit ${done.id}: versionCode ${release.versionCodes} rolled out on ${track}`);
}

const [arg1, arg2, ...rest] = process.argv.slice(2);
const status = (rest.find((a) => a.startsWith('--status=')) ?? '--status=draft').split('=')[1];
try {
  if (!arg1 || arg1 === 'tracks') await showTracks();
  else if (arg1 === 'listing') await pushListing();
  else if (arg1 === 'images') await pushImages();
  else if (arg1 === 'rollout') await rollout(arg2 || 'internal', rest[0]);
  else if (arg2) await upload(arg1, arg2.replace(/^~/, homedir()), status);
  else {
    console.log('usage: play-release.mjs [tracks | listing | images | rollout <track> [versionCode] | <track> <aab> [--status=draft|completed]]');
    process.exit(1);
  }
} catch (err) {
  console.error(String(err.message ?? err));
  process.exit(1);
}
