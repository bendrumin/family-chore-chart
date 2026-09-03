#!/usr/bin/env node
// Minimal App Store Connect API helper for ChoreStar ship scripts.
// Recreated from the asc-submission-state memory note (the scratchpad
// original vanished between sessions); now lives in the repo on purpose.
// Auth: ASC API key. ES256 JWT minted locally with node crypto
// (dsaEncoding ieee-p1363 gives the raw r||s signature JWT wants).
import { createSign, createPrivateKey } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';

const APP_ID = '6761279049';
const KEY_ID = process.env.ASC_KEY_ID || 'P8NYU5K555';
const ISSUER = process.env.ASC_ISSUER_ID || '69a6de6f-7e14-47e3-e053-5b8c7c11a4d1';
const KEY_PATH =
  process.env.ASC_KEY_PATH || `${homedir()}/.appstoreconnect/private_keys/AuthKey_${KEY_ID}.p8`;

const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
function token() {
  const input = `${b64u({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' })}.${b64u({
    iss: ISSUER,
    aud: 'appstoreconnect-v1',
    exp: Math.floor(Date.now() / 1000) + 1140,
  })}`;
  const key = createPrivateKey(readFileSync(KEY_PATH));
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
  if (!res.ok)
    throw new Error(`${method} ${path} -> ${res.status}\n${JSON.stringify(json.errors ?? json, null, 2)}`);
  return json;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The App Store SERVER API (api.storekit.itunes.apple.com — transactions,
// server notifications) takes the same key as ASC but its JWT also needs the
// bundle id as `bid`.
const BUNDLE_ID = 'com.chorestar.ChoreStar';
function serverToken() {
  const now = Math.floor(Date.now() / 1000);
  const input = `${b64u({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' })}.${b64u({
    iss: ISSUER,
    iat: now - 30,
    exp: now + 1140,
    aud: 'appstoreconnect-v1',
    bid: BUNDLE_ID,
  })}`;
  const key = createPrivateKey(readFileSync(KEY_PATH));
  const sig = createSign('sha256').update(input).sign({ key, dsaEncoding: 'ieee-p1363' });
  return `${input}.${sig.toString('base64url')}`;
}

async function serverApi(method, path, body) {
  const res = await fetch(`https://api.storekit.itunes.apple.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${serverToken()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok)
    throw new Error(`${method} ${path} -> ${res.status}\n${JSON.stringify(json, null, 2)}`);
  return json;
}

async function findVersion(v) {
  const j = await api(
    'GET',
    `/v1/apps/${APP_ID}/appStoreVersions?filter[versionString]=${v}&filter[platform]=IOS&limit=1`
  );
  return j.data[0] ?? null;
}

async function findBuild(v, b) {
  const j = await api(
    'GET',
    `/v1/builds?filter[app]=${APP_ID}&filter[preReleaseVersion.version]=${v}&filter[version]=${b}&limit=1`
  );
  return j.data[0] ?? null;
}

const [cmd, ...args] = process.argv.slice(2);
const out = (x) => console.log(typeof x === 'string' ? x : JSON.stringify(x, null, 2));

switch (cmd) {
  case 'builds': {
    const j = await api(
      'GET',
      `/v1/builds?filter[app]=${APP_ID}&sort=-uploadedDate&limit=5&fields[builds]=version,processingState,uploadedDate`
    );
    out(j.data.map((d) => ({ id: d.id, ...d.attributes })));
    break;
  }
  case 'status': {
    const v = await findVersion(args[0] ?? '2.0');
    if (!v) { out(`no appStoreVersion ${args[0] ?? '2.0'}`); break; }
    out({ id: v.id, state: v.attributes.appVersionState ?? v.attributes.appStoreState, created: v.attributes.createdDate });
    break;
  }
  case 'ensure-version': {
    const vs = args[0];
    let v = await findVersion(vs);
    if (!v) {
      const j = await api('POST', '/v1/appStoreVersions', {
        data: {
          type: 'appStoreVersions',
          attributes: { platform: 'IOS', versionString: vs },
          relationships: { app: { data: { type: 'apps', id: APP_ID } } },
        },
      });
      v = j.data;
      out(`created appStoreVersion ${vs}: ${v.id}`);
    } else out(`appStoreVersion ${vs} exists: ${v.id}`);
    break;
  }
  case 'wait-build': {
    const [vs, b] = args;
    for (;;) {
      const build = await findBuild(vs, b);
      const state = build?.attributes.processingState;
      out(`${new Date().toTimeString().slice(0, 8)} build ${vs} (${b}): ${state ?? 'not visible yet'}`);
      if (state === 'VALID') break;
      if (state === 'FAILED' || state === 'INVALID')
        throw new Error(`build processing ended ${state} (check App Store Connect email for ITMS codes)`);
      await sleep(30000);
    }
    break;
  }
  case 'attach-build': {
    const [vs, b] = args;
    const v = await findVersion(vs);
    const build = await findBuild(vs, b);
    if (!v || !build) throw new Error(`version or build missing (version=${!!v} build=${!!build})`);
    await api('PATCH', `/v1/appStoreVersions/${v.id}/relationships/build`, {
      data: { type: 'builds', id: build.id },
    });
    out(`attached build ${b} (${build.id}) to ${vs} (${v.id})`);
    break;
  }
  case 'phased': {
    const v = await findVersion(args[0]);
    try {
      await api('POST', '/v1/appStoreVersionPhasedReleases', {
        data: {
          type: 'appStoreVersionPhasedReleases',
          attributes: { phasedReleaseState: 'INACTIVE' },
          relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: v.id } } },
        },
      });
      out('phased release created (INACTIVE until the version ships)');
    } catch (e) {
      out(`phased release skipped: ${e.message.split('\n')[0]}`);
    }
    break;
  }
  case 'submit-version': {
    const v = await findVersion(args[0]);
    if (!v) throw new Error(`no appStoreVersion ${args[0]}`);
    const sub = await api('POST', '/v1/reviewSubmissions', {
      data: {
        type: 'reviewSubmissions',
        attributes: { platform: 'IOS' },
        relationships: { app: { data: { type: 'apps', id: APP_ID } } },
      },
    });
    await api('POST', '/v1/reviewSubmissionItems', {
      data: {
        type: 'reviewSubmissionItems',
        relationships: {
          reviewSubmission: { data: { type: 'reviewSubmissions', id: sub.data.id } },
          appStoreVersion: { data: { type: 'appStoreVersions', id: v.id } },
        },
      },
    });
    await api('PATCH', `/v1/reviewSubmissions/${sub.data.id}`, {
      data: { type: 'reviewSubmissions', id: sub.data.id, attributes: { submitted: true } },
    });
    out(`SUBMITTED for review: version ${args[0]}, reviewSubmission ${sub.data.id}`);
    break;
  }
  case 'set-whatsnew': {
    // set-whatsnew <version> <file> — writes the file's text as the version's
    // en-US "What's New". PATCHing the loc directly avoids fastlane deliver,
    // whose metadata overwrite re-uploads duplicate screenshots (the 1.5/2.0
    // gotcha). A fresh version usually inherits an en-US loc; create if not.
    const [vs, file] = args;
    const v = await findVersion(vs);
    if (!v) throw new Error(`no appStoreVersion ${vs}`);
    const text = readFileSync(file, 'utf8').trim();
    const locs = await api('GET', `/v1/appStoreVersions/${v.id}/appStoreVersionLocalizations?limit=10`);
    const loc = locs.data.find((l) => l.attributes.locale === 'en-US');
    if (!loc) {
      const j = await api('POST', '/v1/appStoreVersionLocalizations', {
        data: {
          type: 'appStoreVersionLocalizations',
          attributes: { locale: 'en-US', whatsNew: text },
          relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: v.id } } },
        },
      });
      out(`created en-US loc ${j.data.id} with whatsNew (${text.length} chars)`);
    } else {
      await api('PATCH', `/v1/appStoreVersionLocalizations/${loc.id}`, {
        data: { type: 'appStoreVersionLocalizations', id: loc.id, attributes: { whatsNew: text } },
      });
      out(`whatsNew set on en-US loc ${loc.id} (${text.length} chars)`);
    }
    break;
  }
  case 'test-notification': {
    // Asks Apple to POST a TEST notification to the server URL configured in
    // ASC (App Information > App Store Server Notifications). Verify receipt
    // with test-notification-status <token> and the apple_notifications table.
    const j = await serverApi('POST', '/inApps/v1/notifications/test');
    out(j);
    break;
  }
  case 'test-notification-status': {
    const j = await serverApi('GET', `/inApps/v1/notifications/test/${args[0]}`);
    out({
      sendAttempts: j.sendAttempts,
      firstSendAttemptResult: j.firstSendAttemptResult,
    });
    break;
  }
  case 'push-locales': {
    // Usage: push-locales <versionString> <locale...>   e.g. push-locales 2.1 es-MX pt-BR ar-SA
    // Creates/updates App Store metadata for the given locales from
    // fastlane/metadata/<locale>/ WITHOUT touching screenshots (never re-run
    // `deliver metadata` against a live listing: it duplicates screenshot
    // sets). Locales without screenshots fall back to the primary locale's.
    // description/keywords/promotional_text/release_notes go on the version;
    // name/subtitle/privacy_url live on the appInfo, which is only writable
    // while an editable (pre-submission) appInfo exists.
    const [vs, ...locales] = args;
    if (!vs || locales.length === 0) throw new Error('usage: push-locales <version> <locale...>');
    const metaDir = new URL('../fastlane/metadata/', import.meta.url);
    const read = (loc, f) => {
      try { return readFileSync(new URL(`${loc}/${f}`, metaDir), 'utf8').trim() || undefined; }
      catch { return undefined; }
    };
    const v = await findVersion(vs);
    if (!v) throw new Error(`no appStoreVersion ${vs} — run ensure-version first`);
    const existing = await api('GET', `/v1/appStoreVersions/${v.id}/appStoreVersionLocalizations?limit=50`);
    const byLocale = Object.fromEntries(existing.data.map((l) => [l.attributes.locale, l.id]));
    const infos = await api('GET', `/v1/apps/${APP_ID}/appInfos?limit=5`);
    const editable = infos.data.find((i) => {
      const s = i.attributes.appStoreState ?? i.attributes.state;
      return ['PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED'].includes(s);
    });
    for (const loc of locales) {
      const vAttrs = {
        description: read(loc, 'description.txt'),
        keywords: read(loc, 'keywords.txt'),
        promotionalText: read(loc, 'promotional_text.txt'),
        whatsNew: read(loc, 'release_notes.txt'),
        supportUrl: read(loc, 'support_url.txt'),
        marketingUrl: read(loc, 'marketing_url.txt'),
      };
      if (byLocale[loc]) {
        await api('PATCH', `/v1/appStoreVersionLocalizations/${byLocale[loc]}`, {
          data: { type: 'appStoreVersionLocalizations', id: byLocale[loc], attributes: vAttrs },
        });
        out(`${loc}: version metadata updated`);
      } else {
        await api('POST', '/v1/appStoreVersionLocalizations', {
          data: {
            type: 'appStoreVersionLocalizations',
            attributes: { locale: loc, ...vAttrs },
            relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: v.id } } },
          },
        });
        out(`${loc}: version metadata created`);
      }
      const iAttrs = {
        name: read(loc, 'name.txt'),
        subtitle: read(loc, 'subtitle.txt'),
        privacyPolicyUrl: read(loc, 'privacy_url.txt'),
      };
      if (!editable) {
        out(`${loc}: no editable appInfo — name/subtitle skipped, re-run at the next editable window`);
        continue;
      }
      // Creating the version localization above auto-creates the app-info
      // localization for a brand-new locale, so decide POST vs PATCH against
      // a FRESH read, never a snapshot taken before the version POSTs.
      const cur = await api(
        'GET',
        `/v1/appInfos/${editable.id}/appInfoLocalizations?filter[locale]=${loc}&limit=1`
      );
      const curId = cur.data[0]?.id;
      if (curId) {
        await api('PATCH', `/v1/appInfoLocalizations/${curId}`, {
          data: { type: 'appInfoLocalizations', id: curId, attributes: iAttrs },
        });
        out(`${loc}: app info (name/subtitle) updated`);
      } else {
        await api('POST', '/v1/appInfoLocalizations', {
          data: {
            type: 'appInfoLocalizations',
            attributes: { locale: loc, ...iAttrs },
            relationships: { appInfo: { data: { type: 'appInfos', id: editable.id } } },
          },
        });
        out(`${loc}: app info (name/subtitle) created`);
      }
    }
    break;
  }
  case 'raw': {
    out(await api('GET', args[0]));
    break;
  }
  case 'rawx': {
    const [method, path, body] = args;
    out(await api(method.toUpperCase(), path, body ? JSON.parse(body) : undefined));
    break;
  }
  default:
    out(`usage: asc.mjs builds | status <v> | ensure-version <v> | wait-build <v> <b> | attach-build <v> <b> | phased <v> | submit-version <v> | set-whatsnew <v> <file> | push-locales <v> <locale...> | test-notification | test-notification-status <token> | raw <path> | rawx <method> <path> [json]`);
}
