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
  case 'raw': {
    out(await api('GET', args[0]));
    break;
  }
  default:
    out(`usage: asc.mjs builds | status <v> | ensure-version <v> | wait-build <v> <b> | attach-build <v> <b> | phased <v> | submit-version <v> | raw <path>`);
}
