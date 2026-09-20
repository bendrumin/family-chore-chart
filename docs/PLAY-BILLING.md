# Payments on Android

State on 2026-09-20. The three platforms bill three ways:

| Platform | Rail | Server truth | Status |
|---|---|---|---|
| iOS | StoreKit 2 | App Store Server Notifications V2 -> `/api/apple/notifications` | Proven live twice (Aug 27, Sep 17) |
| Web | Stripe Checkout | `/api/stripe/webhook` | Configured and code-reviewed; **never processed a real purchase** (zero completed live sessions ever). Lifetime bug fixed 2026-09-19 |
| Android (shell) | none | inherits the profile's tier from the web app | Consumption-only: no purchase surfaces render in the shell, gates state the limit with no CTA. Audited 2026-09-20 |

## v1: ship consumption-only

Legal under Play's "reader app" rule: digital content bought elsewhere may
be used in the app as long as the app never leads the user to another
payment method. So the shell shows no prices, no upgrade buttons, and no
"buy on our website." A premium family (Stripe or Apple) is premium in the
shell automatically, because the shell is the web app.

Cost: a new Android family that hits a gate sees a dead end. Fees: none.
Review: simplest possible.

## Google Play Billing: built 2026-09-20, waiting on the Console

Decision: ship v1 WITH billing. Everything that does not need Play Console
access exists in the repo now; the rest is Ben's clicks plus one on-device
test once the app is on a testing track.

### What is built

- `lib/google/play-billing.ts` (pure, tested): product ids
  `chorestar_premium_monthly` / `chorestar_premium_yearly`, RTDN type names,
  subscriptionState -> tier (ACTIVE/CANCELED/GRACE keep premium; EXPIRED/
  ON_HOLD/PAUSED downgrade; PENDING no-op), Pub/Sub push decoding.
- `lib/google/play-api.ts`: service-account JWT -> access token (no SDK),
  `purchases.subscriptionsv2.get`, server-side acknowledge.
- `POST /api/google/notifications?token=…`: Pub/Sub push handler. Verifies
  the shared token, re-reads the subscription from Google (never trusts the
  notification type alone), maps token -> profile (stored token, then the
  obfuscated account id = profile UUID), sets the tier with the same
  lifetime/active-Stripe downgrade guard as Apple, logs everything to
  `google_notifications`. Test-purchase notifications are logged, not
  honored, unless `GOOGLE_PLAY_HONOR_TEST_PURCHASES=1` (set it during the
  closed test, unset it for launch).
- `POST /api/google/verify`: the shell calls it right after a purchase;
  it verifies with Google, links the token to the signed-in profile, flips
  premium immediately, and acknowledges.
- `database-migrations/022_google_play_billing.sql` (Ben applies).
- Web bridge `lib/utils/play-billing-client.ts` over `cordova-plugin-purchase`
  (installed in ChoreStar-Android): registers the two subscriptions, sets the
  profile id as the account identifier, verifies every approved transaction
  through `/api/google/verify` before finishing it, exposes plans with Play's
  localized prices, buy, and restore.
- Billing tab: inside the shell, shows Play plans (prices from Play, never
  hard-coded) and "Manage in Google Play" for Google-billed families. The
  gates and cap prompts open the Billing tab in the shell only when the
  plugin is present; without it they stay statement-only, so a build without
  the plugin remains consumption-only compliant.

### Verified on hardware (2026-09-20, Galaxy S25 Ultra, Android 16)

Sideloaded debug build: the plugin is injected into the remote page
(`window.CdvPurchase` present, 13.18.0), `store.initialize` connects to
Play services in about four seconds with no errors, and the product list is
empty, which is the correct result until the subscriptions exist in the
Console. The Billing tab renders the premium state correctly for a
non-Google-billed account. What remains is the license-tester purchase.

### Ben's Console steps (in order)

1. Monetize > Subscriptions: create `chorestar_premium_monthly` (base plan
   `monthly`, auto-renew, 1 month) and `chorestar_premium_yearly` (base plan
   `yearly`, 1 year). US $4.99 / $49.99; then the PPP table from
   `apply-latam-prices.mjs` (MX, BR, IN, tier-2).
2. Google Cloud: enable the Google Play Android Developer API on a project;
   create a Pub/Sub topic; grant
   `google-play-developer-notifications@system.gserviceaccount.com` the
   Pub/Sub Publisher role on it; create a PUSH subscription to
   `https://chorestar.app/api/google/notifications?token=<random>`.
3. Play Console > Monetize > Monetization setup: set the topic, click
   "Send test notification"; expect a `TEST -> test-logged` row in
   `google_notifications`.
4. Play Console > Setup > API access: link the Cloud project, create a
   service account with "View financial data, orders, and cancellation
   survey responses" + "Manage orders and subscriptions", download its JSON
   key.
5. Vercel env (production): `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`,
   `GOOGLE_PUBSUB_PUSH_TOKEN` (the `<random>` from step 2),
   `GOOGLE_PLAY_HONOR_TEST_PURCHASES=1` during testing. Redeploy from the
   repo root.
6. Supabase SQL editor: run migration 022.
7. Setup > License testing: add your Google account. Install the closed-test
   build, buy Premium (free for license testers, renews every 5 minutes),
   confirm the profile flips and a `SUBSCRIPTION_PURCHASED` row appears, then
   cancel and watch `SUBSCRIPTION_EXPIRED -> free` arrive.

### Fees and policy

Play takes 15% (the 15% tier applies automatically under $1M/year). Because
the shell sells through Play, it may also show prices and upgrade buttons in
the shell; the consumption-only restrictions no longer apply once the
plugin is present.

