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

## v1.1: Google Play Billing (build during the closed-test window)

Mirror the Apple design so there is one architecture, not two.

Console (Ben):
1. Monetize > Subscriptions: create `chorestar_premium_monthly` and
   `chorestar_premium_yearly`, one base plan each (monthly / yearly,
   auto-renewing). Prices: US $4.99 / $49.99, then the same PPP table as
   Apple (LATAM, India, tier-2 from `apply-latam-prices.mjs`).
2. Monetize > Monetization setup > Real-time developer notifications:
   create a Google Cloud Pub/Sub topic, grant
   `google-play-developer-notifications@system.gserviceaccount.com`
   publish rights, add a push subscription to
   `https://chorestar.app/api/google/notifications`. Use "Send test
   notification" the way we used Apple's.
3. Setup > API access: a service account with "View financial data" and
   "Manage orders and subscriptions", JSON key -> Vercel env
   `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` (name only here; the value never
   enters the repo).
4. Setup > License testing: add Ben's Google account so purchases are free
   and renew every 5 minutes.

Server (mirrors `app/api/apple/notifications/route.ts`):
- Migration 022: `profiles.google_purchase_token text`, unique partial
  index; `google_notifications` log table (same shape as
  `apple_notifications`: notification_type, subtype, product_id,
  purchase_token, user_id, action, created_at).
- `/api/google/notifications`: Pub/Sub push (JSON, base64 `message.data`),
  verify the push token or OIDC audience, decode
  `subscriptionNotification`, call
  `purchases.subscriptionsv2.get(packageName, token)` with the service
  account (google-auth-library + fetch; not the full googleapis package),
  map `obfuscatedExternalAccountId` (= profile UUID, set at purchase time)
  or the stored token to a profile, then: ACTIVE/RENEWED/RECOVERED ->
  premium; EXPIRED/REVOKED -> free (never downgrade lifetime or an active
  Stripe/Apple sub). Log every message.
- Billing tab: when billed through Google, show "Manage in Google Play"
  (`https://play.google.com/store/account/subscriptions?sku=<id>&package=com.chorestar.app`),
  the way Apple-billed users get the manage sheet.

Client (the shell):
- Plugin: `cordova-plugin-purchase` (Play Billing Library 7, works under
  Capacitor, free) is the default choice; RevenueCat's Capacitor SDK is the
  faster alternative if we want receipts handled for us across all three
  rails (free under $2.5k MRR). Decision pending.
- Web side: `useAndroidShell()` currently hides purchase surfaces. With
  billing, the shell instead renders Play plans (prices from the plugin,
  never hard-coded), and `purchase()` passes the profile UUID as
  `obfuscatedExternalAccountId`.
- Testing needs the app on a Play testing track with license testers, so
  none of this can be verified before the first upload. That is why it is
  v1.1: build it while the 14-day closed test runs.

## Before anyone relies on the web rail

The Stripe path has never seen a real charge. One live test purchase of
Premium Monthly by Ben, refunded in the Stripe dashboard, proves
Checkout -> webhook -> premium end to end. Ten minutes, and it settles a
question every Android user implicitly depends on.
