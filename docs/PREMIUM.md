# Premium: what is promised vs what is gated

Audited 2026-09-19, the week the second paying subscriber arrived. Every
surface that describes Premium was compared against the code that enforces
it, on both platforms. Keep this table true when either side changes.

Last updated 2026-10-19.

| Promise | Web gate | iOS gate | Status |
|---|---|---|---|
| Unlimited children (free: 3) | add-child-modal, `getChildLimit` | `childLimit` | gated both, enforced in the database (024) |
| Unlimited chores (free: 20, family-wide) | add-chore-modal, `getChoreLimit` | `choreLimit` | gated both, enforced in the database (024) |
| Unlimited reward store items (free: 3) | rewards tab + DB trigger (024) | `rewardItemLimit` + DB trigger (024) | gated both, enforced in the database |
| Unlimited goals (free: 1 active per child) | `/api/kid/goals`; rewards tab cap shows See Premium (`limit_goals`); DB trigger 029 | server + KidGoalCardView lists every goal | gated both; parent writes are held in the database once 029 is applied |
| Premium themes (Ocean, Sunset, Forest, Aurora, Coral, Lavender) | appearance tab, `isPremiumTheme` + `canUseFeature` | `SeasonalTheme.isPremium` + `canUse(.themes)` | gated both, grandfathered |
| Family sharing / co-parent | family tab + `POST /api/family/invite` 403 (adding only: a lapsed owner still sees and removes members and can turn off the join code) | FamilySharingView owner section | gated both, grandfathered |
| Export reports (PDF, CSV) | downloads tab | ExportView (2.3) | gated both, grandfathered |
| Advanced analytics / full insights | insights tab | Stats tab (HistoryView) | gated both, grandfathered |
| Shared chores: weekly rotation and bonus chores (new 2026-10-10) | `POST /api/chores/shared` 403 + add-chore form lock; edit, archive and delete act on the whole group through `/api/chores/shared/[groupId]` (not gated, so a lapsed family can stop one) | created from the add-chore form via `POST /api/chores/shared` | gated server-side on create; not grandfathered (new) |
| Routine template library, 10 extra (new 2026-10-10) | routine builder crown + Billing | RoutineBuilderView: premium templates locked, open the paywall | gated both; the original 4 stay free |
| Weekly family report email (new 2026-10-10) | Settings toggle + cron skips non-Premium | Settings toggle (same `weekly_report_email` column) | gated server-side, opt-in; a Resend error counts as a failed send, not sent |
| Kid money management (new 2026-10-19): Spend/Save/Give jars, automatic weekly allowance, interest on Save, fines and weekly paybacks, screen-time minutes | Settings > Rewards > Money: free families see a preview, each tool opens Billing with `gate_jars` / `gate_allowance` / `gate_interest` / `gate_fines` / `gate_minutes`. `POST /api/money` answers 403 `premium_required` for switching anything on; switching off is never gated. `/api/cron/allowance` skips non-Premium families. Kid wallet sends jars/minutes/news only to Premium. DB: 030 tables are server-write-only; `enforce_premium_reward_minutes` trigger | not yet (iOS reads `/api/kid/wallet` and `/api/allowance`, which stay compatible: `owedCents` is still the total) | gated server-side; not grandfathered (new). Needs migration 030 |
| 7-day free trial on the yearly plan (new 2026-10) | Stripe `trial_period_days` via `trialDaysFor` (lib/billing/trial.ts): one trial per family across every store | Apple introductory offer on the yearly product: one per Apple ID, Apple's rule | web and iOS. A family that trialed on the web can still get Apple's trial on an Apple ID that hasn't used one; copy says so |
| Priority email support | process, not code | | fine |

Native Android (ChoreStar-Android-Native, Google Play Billing): children,
chores and store-item caps, every goal with the plan's limit, premium themes
and co-parent sharing with the same grandfathering rule, Play-only purchases
(no link out to the web). Not on native Android yet: creating shared chores,
the routine template library, the weekly report toggle, export and the
insights gate. Premium bought elsewhere still unlocks there. The Android web
shell logs paywall opens as `android`.

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
  Billing); family tab hides Manage Sharing behind the gate (since
  2026-10-19 a free owner still sees existing members with Remove and can
  turn off the join code) and `POST /api/family/invite` returns 403; downloads tab disables PDF/CSV
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

## Fixes (2026-10-19)

- Shared chores could only be edited or deleted one copy at a time on the
  web, and archiving this week's copy let the daily rotation revive the chore
  on another kid. Now group-wide (badge, edit, Stop sharing) via
  `/api/chores/shared/[groupId]`.
- Weekly report: Resend v6 returns `{ data, error }` instead of throwing, so
  failed sends were marked sent. `sendWeeklyReport` / `resendIdOrThrow`
  (lib/reports) throw on an error result; the cron route has to call
  `sendWeeklyReport` for the fix to take effect.
- Lapsed owner can remove co-parents and revoke the join code (web).
- Goals cap: See Premium button + migration 029 trigger.
- Parent tick on a bonus chore a sibling already claimed says so.
- Trial copy: one trial per family on the web; Apple's is per Apple ID.
  The free-plan comparison page no longer claims weekly reports are free
  (the in-app weekly stats are; the email is Premium).

## Kid money management (2026-10-19)

Premium, web first. Migration `database-migrations/030_money_jars_allowance.sql`
(run it before deploying the web build that uses it; every read degrades to
"no jars, no ledger" until it runs).

- Balance stays derived (`lib/utils/wallet.ts`): chore earnings + ledger
  credits (allowance, interest) - payouts - ledger debits (fines, repayments,
  donations). `owedCents` is still that total clamped at 0, so iOS and Android
  builds that read it keep working; `balanceCents` is signed.
- Jars: `money_jar_splits` is a dated history per kid. Each day's income is
  split by the version in force that day (`computeJars` in
  `lib/utils/money.ts`), so turning jars on never moves money already earned:
  it stays in Spend. Payouts without a jar (every one before 030, store
  approvals) are Spend; goal payouts with jars on are tagged `save`. Turning
  jars off sweeps Save and Give back into Spend with transfer rows.
- Store and normal payouts use Spend (`spendableCents`); goals fill from Save
  (`goalBaseCents`). With jars off both are the whole balance.
- `/api/cron/allowance` (daily, `isCronAuthorized`): per kid, on payday in the
  family timezone, interest on Save, then allowance (optionally only at a
  chore threshold over the 7 days before payday; a vacation week counts as
  met), then weekly repayments. One `money_ledger` row per kind per week
  (unique index), catch-up up to 2 days late, never a payday from before the
  feature was switched on.
- Deductions never take Spend below zero unless the parent ticks "allow"; the
  kid sees every one with its reason, and "You owe $X" when below zero.
- Minutes: `chores.reward_minutes`, `routines.reward_minutes`,
  `routine_completions.minutes_earned` (captured at completion),
  `screen_minutes_ledger` for "used". No device enforcement.

Not on iOS or native Android yet: the Money settings, the kid jars card and
minutes. Their balances stay correct (server-derived); a store request from an
older app is checked against Spend on the server.

Native Android grandfathering, the Play listing and the no-plans link-out
were fixed 2026-10-10 (ChoreStar-Android-Native 1d4bdb8).

Still open:
- Cross-store downgrades: a cancellation on one rail (Stripe, Apple, Google)
  can drop a family still paying on another.
- Stripe portal picks the first customer for an email; checkout makes a new
  customer each attempt. The web Stripe path has still never completed live.
- Comps ("comp 3 months" in the routine-feedback email) have no expiry.
