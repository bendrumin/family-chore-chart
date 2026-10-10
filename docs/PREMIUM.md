# Premium: what is promised vs what is gated

Audited 2026-09-19, the week the second paying subscriber arrived. Every
surface that describes Premium was compared against the code that enforces
it, on both platforms. Keep this table true when either side changes.

| Promise | Web gate | iOS gate | Status |
|---|---|---|---|
| Unlimited children (free: 3) | add-child-modal, `getChildLimit` | `childLimit` | gated both |
| Unlimited chores (free: 20, family-wide) | add-chore-modal, `getChoreLimit` | `choreLimit` | gated both (web since 2026-09-16) |
| Unlimited reward store items (free: 3) | rewards tab + DB trigger (024) | `rewardItemLimit` + DB trigger (024) | gated both, enforced in the database |
| Unlimited goals (free: 1 active per child) | `/api/kid/goals` + kid card lists every goal | server + KidGoalCardView lists every goal | gated both; works since 2026-10-09 (before, only the oldest goal ever showed) |
| Premium themes (Ocean, Sunset, Forest, Aurora, Coral, Lavender) | appearance tab, `isPremiumTheme` + `canUseFeature` | `SeasonalTheme.isPremium` + `canUse(.themes)` | gated both, grandfathered |
| Family sharing / co-parent | family tab + `POST /api/family/invite` 403 | FamilySharingView owner section | gated both, grandfathered |
| Export reports (PDF, CSV) | downloads tab | ExportView (2.3) | gated both, grandfathered |
| Advanced analytics / full insights | insights tab | Stats tab (HistoryView) | gated both, grandfathered |
| Shared chores: weekly rotation and bonus chores (new 2026-10-10) | `POST /api/chores/shared` 403 + add-chore form lock | shown to the right kid; created on the web only | gated server-side; not grandfathered (new) |
| Routine template library, 10 extra (new 2026-10-10) | routine builder crown + Billing | not on iOS yet | gated web; the original 4 stay free |
| Weekly family report email (new 2026-10-10) | Settings toggle + cron skips non-Premium | n/a (email) | gated server-side, opt-in |
| Priority email support | process, not code | | fine |

Copy that was false and is now fixed (2026-09-19): the homepage FAQ promised
a Premium trial (none exists: no Stripe `trial_period_days`, no Apple
introductory offer on either subscription); the iOS upgrade prompt listed
"Custom icons & categories" (never gated) and "Export reports" (no such
feature on iOS); the iOS paywall listed "Full insights & analytics"
(ungated). Both iOS screens now list only the gated set.

Bug fixed 2026-09-19: the Stripe webhook granted a tier only for
`mode=subscription`, so a Lifetime checkout ($149.99, one-time) would have
charged and granted nothing. `tierForCheckout()` in
`lib/utils/subscription.ts` is the tested decision now.

## Billing plumbing state

- Apple: proven live twice (2026-08-27 pre-token, healed; 2026-09-17 clean
  `SUBSCRIBED` -> premium with zero manual steps).
- Stripe: live key, webhook enabled for checkout.session.completed,
  customer.subscription.updated/deleted, invoice.payment_failed; prices
  live ($4.99 mo, $49.99 yr, $149.99 lifetime); all five env vars present
  in Vercel production. Never exercised: zero completed live checkouts
  ever (five abandoned sessions, last 2026-02-01). Code-reviewed, not
  battle-tested. A $0.50 self-purchase and refund would settle it.

## Decision (2026-09-19): gate to match the promise, grandfather everyone before

Rule, identical on both platforms (`canUseFeature` in
lib/utils/subscription.ts; `Entitlements.canUse` in Logic/Entitlements.swift):
a gated feature is available when the account is premium, **or** when the
account was created before `2026-09-19T00:00:00Z`. Every family that
existed before the cutoff keeps sharing, export, analytics, and the six
premium themes on the free plan. Every account created after it sees
Premium as advertised. Gates:

- Web: appearance tab locks the six themes (lock badge, click opens
  Billing); family tab hides Manage Sharing behind the gate and
  `POST /api/family/invite` returns 403; downloads tab disables PDF/CSV
  export (printable charts stay free); insights tab shows the gate instead
  of the dashboard. Android shell states the limit with no purchase CTA.
- iOS (rides 2.2.3): theme picker uses the same rule (existing free iOS
  families gain the six themes); Family Sharing's owner section and the
  Stats tab show `PremiumFeatureGate`, which opens the paywall.
- Co-parents inherit the owner's entitlement (web resolves the owner's
  profile via `family_settings.user_id`).

## Security: who can change a family's plan (2026-10-09)

Found: the base `"Users can update own profile"` policy covers every column,
so any signed-in user could PATCH their own `subscription_type` to premium or
lifetime with just their access token (confirmed live with a same-value write
on the throwaway Star Family). The free caps were app-side only.

Fixed by `database-migrations/024_lock_billing_and_enforce_limits.sql`:
- `subscription_type`, `apple_original_transaction_id` and
  `google_purchase_token` change only from the server (service_role: Stripe,
  Apple and Google webhooks, `/api/google/verify`, `/api/apple/verify`) or the
  SQL editor. App sessions' attempts keep the old value silently, so iOS builds
  up to 2.4 (which write 'premium' after a purchase) still show the upgrade
  locally while Apple's notification sets the real value server-side.
- 3 children / 20 active chores (family-wide) / 3 active store items are
  enforced in the database for app sessions, counted exactly as the apps count.
  Families already over a cap keep what they have and can't add more.
- Tested in embedded Postgres (22 cases: app vs server vs SQL editor, caps,
  archive/restore, premium lifting caps, re-running the migration).

iOS (next build after 2.4) confirms purchases through `POST /api/apple/verify`
with StoreKit 2's signed transaction instead of writing the profile. The server
checks Apple's signature and that `appAccountToken` is this account, which also
ends "one Apple ID upgrades every ChoreStar account signed in on the phone".
Sandbox purchases unlock the session but are never saved
(`lib/apple/entitlement.ts`, tested).

## Promise fixes (2026-10-09)

Second audit, after goals/store, Google Play billing and Sign in with Apple
shipped. Fixed:
- Goals: Premium's "unlimited goals" now shows every goal to the kid (web and
  iOS); `/api/kid/wallet` returns `goals`, keeping `goal` for iOS <= 2.4.
- Co-parents inherit the owner's plan on iOS (was ignored) and on the web
  Billing tab and child cap; a co-parent's new child is saved to the family.
- Manage Subscription goes to the App Store / Google Play for those payers.
- Copy lists exactly the gated set everywhere (web pricing card, billing tab,
  iOS paywall + upgrade prompt, now localized); the pricing card no longer
  sells free features; the blog no longer mentions a lifetime plan.
- Upgrade dead ends: store cap buttons (web, iOS), logged-in home upgrade
  link opens Billing (`/dashboard?settings=billing`).
- iOS Restore Purchases reports its result; What's New moves to 2.5.

Still open:
- Native Android: no grandfathering (pre-cutoff families lose themes and
  sharing there); Play listing says Premium is managed at chorestar.app and
  the paywall's no-plans state links out to the web (Play policy risk).
- Cross-store downgrades: a cancellation on one rail (Stripe, Apple, Google)
  can drop a family still paying on another.
- Stripe portal picks the first customer for an email; checkout makes a new
  customer each attempt. The web Stripe path has still never completed live.
- Comps ("comp 3 months" in the routine-feedback email) have no expiry.
