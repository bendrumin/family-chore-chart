# Sign in with Apple: one-time setup

The console and dashboard steps that have to happen before the code can work.
No secret values appear here, only names and where they go.

| Thing | Value |
|---|---|
| Team ID | `5ANRA6JZC2` |
| iOS app bundle ID | `com.chorestar.ChoreStar` |
| Supabase project | `kyzgmhcismrnjlnddyyl` |
| Supabase callback URL | `https://kyzgmhcismrnjlnddyyl.supabase.co/auth/v1/callback` |
| Email sender | `noreply@chorestar.app` (Resend) |

## 1. Turn on the capability for the app (iOS, native sign-in)

Apple Developer → Certificates, Identifiers & Profiles → **Identifiers** →
`com.chorestar.ChoreStar` → tick **Sign in with Apple** → leave it as
"Enable as a primary App ID" → Save.

Xcode picks up the capability once the entitlement is added in code; the
provisioning profile regenerates automatically with automatic signing.

## 2. Create a Services ID (web sign-in)

The web flow needs its own identifier, separate from the app's bundle ID.

Identifiers → **+** → **Services IDs** →

- Description: `ChoreStar Web`
- Identifier: `com.chorestar.web` (any reverse-DNS string not already used; this becomes the web client ID)

Save, open it, tick **Sign in with Apple** → **Configure**:

- Primary App ID: `com.chorestar.ChoreStar`
- Domains: `kyzgmhcismrnjlnddyyl.supabase.co`
- Return URLs: `https://kyzgmhcismrnjlnddyyl.supabase.co/auth/v1/callback`

Apple redirects to Supabase, not to chorestar.app; Supabase then sends the
user on to `/auth/callback` on our site.

## 3. Create a Sign in with Apple key

Keys → **+** → name it `ChoreStar Sign in with Apple` → tick **Sign in with
Apple** → Configure → Primary App ID `com.chorestar.ChoreStar` → Register.

**Download the `.p8` now; Apple only lets you download it once.** Note the
**Key ID**. Keep the file with the other keys, e.g.
`~/.appstoreconnect/private_keys/AuthKey_<KEYID>.p8`, and add it to the
`new-machine.sh` bundle list if it lives somewhere new. Never commit it.

This is a different key from the App Store Connect API key (`P8NYU5K555`).
That one can't sign Apple sign-in secrets.

## 4. Enable Apple in Supabase

Supabase dashboard → Authentication → **Sign In / Providers** → **Apple** → enable.

- **Client IDs:** `com.chorestar.web,com.chorestar.ChoreStar`. The web
  Services ID *and* the iOS bundle ID, comma-separated. Native sign-in tokens
  carry the bundle ID as their audience and are rejected if it isn't listed.
- **Secret Key (for OAuth):** not the `.p8` itself but a short JWT signed
  with it. Mint it locally, which puts it on the clipboard:
  `node scripts/apple-client-secret.mjs ~/.appstoreconnect/private_keys/AuthKey_<KEYID>.p8`.
  Only the web flow uses it; native iOS sign-in works without it.

> **The secret expires after at most 6 months.** When it lapses, web
> "Sign in with Apple" fails while iOS keeps working, so the break is easy to
> miss. The script prints the expiry date; rerun it before then and paste the
> new value. Put a reminder in the calendar the day you create it.

Then Authentication → **URL Configuration** → Redirect URLs, make sure these
are allowed:

- `https://chorestar.app/auth/callback`
- `http://localhost:3000/auth/callback`
- the Vercel preview pattern, e.g. `https://*-ben-siegels-projects-81682bcc.vercel.app/auth/callback`, so preview deploys can be tested

## 5. Let email reach "Hide My Email" users

Users who hide their email get an `@privaterelay.appleid.com` address. Apple
silently drops mail to it unless the sender is registered.

Certificates, Identifiers & Profiles → **Services** → **Sign in with Apple for
Email Communication** → Configure → add the domain `chorestar.app` and the
address `noreply@chorestar.app`. The domain must pass SPF, which it should
already do for Resend. If Supabase sends its auth emails (password reset)
from a different address, register that one too.

## 6. Let the server revoke tokens on account deletion

App Review requires that deleting an account also revokes Sign in with Apple
(guideline 5.1.1(v)). The server does it with the same key from step 3:

1. Run `database-migrations/023_apple_sign_in_tokens.sql` in the Supabase SQL
   Editor.
2. Add two environment variables in Vercel (Production and Preview):
   - `APPLE_SIGNIN_KEY_ID`: the key ID from step 3
   - `APPLE_SIGNIN_PRIVATE_KEY`: the `.p8` contents. From the repo root:
     `vercel env add APPLE_SIGNIN_PRIVATE_KEY production < ~/.appstoreconnect/private_keys/AuthKey_<KEYID>.p8`
     (and again with `preview`)

Without them, sign-in still works, but no token is kept and deletion can't
revoke. The server logs `APPLE_SIGNIN_KEY_ID / APPLE_SIGNIN_PRIVATE_KEY not set`
when that happens.

## How the code fits together

- **Web:** `components/auth/apple-sign-in-button.tsx` → Supabase OAuth →
  `/auth/callback`, which creates the family and keeps Apple's refresh token
  when Supabase passes one through.
- **iOS:** `SignInWithAppleSection` in `AuthView.swift` → `signInWithIdToken` →
  `POST /api/auth/ensure-profile` with the one-time authorization code, which
  the server swaps for a refresh token (`lib/apple/sign-in.ts`).
- **New families** with a guessed name get asked for a real one: the web
  `NameFamilyDialog` and iOS `NameFamilySheet`.
- **Deletion:** `/api/account/delete` revokes before the cascade.
