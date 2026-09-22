# Google Play listing: paste-ready answers

For the Play Console once identity verification clears (started
2026-09-19). Written to docs/VOICE.md. The Android app is the Capacitor
shell around the live site (ChoreStar-Android/), consumption-only: no
purchase surfaces render when the UA contains `ChoreStarAndroid`, and the
premium gates state the limit with no upgrade button. That is the
"reader app" model Play permits.

## Checklist (Ben, in order)

- [ ] Identity verification cleared (personal vs organization account
      matters: a NEW personal account must run a closed test with 12
      testers opted in for 14 continuous days before it can apply for
      production access; organization accounts skip that)
- [ ] Create app: name **ChoreStar**, default language English (US), App,
      Free
- [ ] Upload key + release AAB (see "Signing" below)
- [ ] Store listing (copy below) + graphics: icon 512x512, feature graphic
      1024x500, at least 2 phone screenshots (recommend 4 to 6)
- [ ] Data safety form (answers below)
- [ ] Content rating questionnaire (answers below)
- [ ] Target audience: **18 and over** (parents). Do NOT opt into "Designed
      for Families"; kids use the app under a parent's account and the
      parent is the account holder
- [ ] App access: "All functionality is available without special access"
      is FALSE for the parent dashboard (needs an account). Provide the
      demo login from fastlane/metadata/review_information plus kid code
      `demo2026`, Emma PIN `1234`
- [ ] Ads: none. In-app purchases: **yes**, two subscriptions
      (`chorestar_premium_monthly`, `chorestar_premium_yearly`) billed by
      Google Play in the native app
- [ ] Closed testing track first (required for new personal accounts;
      sensible for everyone), then production
- [ ] After the first upload: copy the **App signing key certificate**
      SHA-256 (Test and release > App integrity) into
      `chorestar-nextjs/public/.well-known/assetlinks.json` next to the
      upload-key line and redeploy the web app, or chorestar.app links will
      keep opening in the browser for Play installs (see ANDROID-SHELL.md)

## Signing

The native app (`ChoreStar-Android-Native/`) reads the shell's
`ChoreStar-Android/android/keystore.properties` too, so both build with the
same upload key; build the bundle with `./gradlew bundleRelease` there
(JDK 21, see docs/ANDROID-NATIVE.md).

Gradle reads `android/keystore.properties` (gitignored) with
`storeFile`, `storePassword`, `keyAlias`, `keyPassword`. Keep the keystore
and that file OUTSIDE the repo (e.g. `~/.chorestar-android/`). Play App
Signing holds the real signing key; ours is only the upload key, which
Google can reset if it is ever lost, so back it up but do not panic about
it. Build: `scripts/release-aab.sh` (JDK 21, see android-app memory for
the toolchain). First upload sets the app to Play App Signing; accept.

## Store listing copy

**App name (30):** ChoreStar

**Short description (80):**
Chore chart and allowance tracker. Kids sign in with a family code and PIN.

**Full description (4000):**
ChoreStar is a chore chart your kids can run themselves.

Parents set up chores with reward amounts and step-by-step routines
(morning, bedtime, after school), each step with an optional timer. Kids
sign in with a family code and a 4-digit PIN, so a seven-year-old can
check off their own day on a shared tablet with no email address and no
account of their own.

Allowance is tracked for you: a reward per chore or a flat daily rate,
with goals kids save toward and a reward store for things money cannot
buy (screen time, picking dinner). ChoreStar never moves real money and
never gives a child a debit card. You hand over the allowance however you
like.

What is included
• Chores with rewards, scheduled by day of the week
• Routines with timers and a big Done button for kids
• Kid login: family code plus PIN, no email
• Streaks, achievement badges, and confetti when the day is done
• Goals and a reward store priced by you
• Approval mode, with optional photo proof
• Vacation mode: pause everything, streaks stay safe
• Weekly stats for parents
• Kid mode in English, Spanish, Portuguese, and Arabic

The free plan covers 3 children and 20 chores, forever. Premium (unlimited
children, chores, store items, and goals, family sharing with a co-parent,
premium themes, export reports, advanced analytics) is managed at
chorestar.app.

Your family's data is never sold or shared. Privacy policy:
https://chorestar.app/privacy

Questions: hi@chorestar.app

**Category:** Parenting. **Tags:** chores, allowance, family, kids, routines.
**Contact email:** hi@chorestar.app. **Website:** https://chorestar.app.
**Privacy policy URL:** https://chorestar.app/privacy.

Localized listings: translate from
`ChoreStar-iOS/fastlane/metadata/{es-MX,pt-BR,ar-SA}/description.txt`,
which already say the same things in the voice.

## Data safety (declare exactly this)

Does the app collect or share user data: **Yes** (collect), **No**
(share with third parties for their own purposes). Data is encrypted in
transit (HTTPS to chorestar.app and Supabase). Users can request deletion:
**Yes**, in-app (Settings > Account > Delete account) and by email.

| Data type | Collected | Purpose | Notes |
|---|---|---|---|
| Personal info > Email address | Yes (required) | Account management | Parent's login |
| Personal info > Name | Yes | App functionality | Family name; children's first names entered by the parent |
| Photos and videos > Photos | Yes (optional) | App functionality | Optional child avatars, optional chore photo proof; stored in a private bucket |
| Financial info > Purchase history | Yes | App functionality | Google Play subscription purchase tokens, sent to chorestar.app to unlock Premium; Google handles the payment itself. Allowance amounts are numbers the parent types |
| App activity > App interactions | Yes | Analytics, app functionality | Chore completions, routine runs; Google Analytics on the web pages |
| App info and performance > Crash logs | No | | (no crash SDK in the shell) |
| Device or other IDs | Yes | App functionality | A Firebase Cloud Messaging token per signed-in device, so activity alerts reach the parent; removed on sign-out |
| Location, Contacts, Messages, Health, Calendar, Files, Audio, Web browsing | No | | |

All data is processed by the developer (Supabase hosted database, US);
no ad SDKs. Not a "Designed for Families" app.

## Content rating (IARC questionnaire)

Category: **Utility, productivity, communication, or other**. Violence,
sexual content, language, controlled substances, gambling: **No** to all.
User interaction: users can communicate only within their own family
(co-parent sharing, kid names); no public sharing; **no** user-generated
content visible to others. Shares location: No. Digital purchases: **Yes** (Premium subscriptions
through Google Play). Expected rating: Everyone.

## Graphics (ready in docs/assets/play/)

- `feature-graphic-1024x500.png`: brand gradient, the star mark, the tagline,
  three chips, and a kid-dashboard card. Rendered from HTML (Playwright).
- `phone-01.png` to `phone-04.png` (1080x2338, 9:19.5): kid login code entry,
  PIN pad, Emma's kid dashboard (goal card, streak, wallet, badges), chore
  list. Captured from the live site at phone width on the demo family; the
  Android app is this exact UI in a shell. Suggested order: 03, 04, 01, 02.
- App icon 512x512: export from the existing icon set (ChoreStar-Android
  already ships the adaptive icon).

## BLOCKER found 2026-09-21: `com.chorestar.app` is taken on Google Play

A live third-party app already owns that package name:

- Title **ChoreStar: Family Chores**, developer **CMCAppDev**
- Last updated **Sep 3, 2026**, carries ads and in-app purchases
- Its own site, `chorestar.cloudmigrationconsulting.net`, and support address
  `accounts@cloudmigrationconsulting.net`
- `https://play.google.com/store/apps/details?id=com.chorestar.app` returns 200
  while any made-up id returns 404, and a Play search for "chorestar" returns
  that app and nothing of ours

Package names on Google Play are globally unique and permanent, and the Console
locks a package to an app entry at the **first bundle upload**. So our first
upload of `com.chorestar.app` would be rejected, and there is no claim process
for a package name (that is separate from any trademark question about the
title, where we have no priority: see the name-competitor note).

**The applicationId has to change before the first upload.** These are free as
of the check: `com.chorestar.family`, `app.chorestar`, `app.chorestar.android`,
`com.chorestar.parent`, `com.siegelcreates.chorestar`.

What the rename touches:

1. `ChoreStar-Android-Native/app/build.gradle.kts` `applicationId` (the Kotlin
   package can stay `com.chorestar.app`; only the applicationId must move) and
   the same in `ChoreStar-Android/android/app/build.gradle` +
   `capacitor.config.ts` if the shell is ever uploaded
2. `chorestar-nextjs/public/.well-known/assetlinks.json` `package_name`, plus
   the Play app-signing SHA-256 after the first upload, then redeploy
3. A new Firebase Android app for the new package, and a fresh
   `app/google-services.json` (the current one is registered to
   `com.chorestar.app`); re-register both signing certificates
4. `GOOGLE_PLAY_PACKAGE_NAME` in Vercel, which `lib/google/play-api.ts` and
   `scripts/play-prices.mjs` both read
5. Launcher shortcut `targetPackage` attributes and the store-listing copy that
   names the package

## App content: what the API can fill, and what it cannot

The Console's App content checklist has 13 items. Only one has an API.

| Item | API | Answer |
|---|---|---|
| Set privacy policy | no | `https://chorestar.app/privacy` |
| Sign in details (app access) | no | See "App access" below |
| Ads | no | No ads, no ad SDKs |
| Content rating | no | Category Utility/productivity. No to violence, sexual content, language, controlled substances, gambling. Users communicate only inside their own family, no public sharing, no user content visible to others. No location sharing. Digital purchases: **yes** |
| Target audience | no | **18 and over**. Do NOT opt into Designed for Families: kids use the app under a parent's account |
| Data safety | **yes**, `applications.dataSafety` | Takes the Console's own CSV. Export the template from Data safety, Export to CSV, and the answers below can be filled in and posted by API |
| Government apps | no | No |
| Financial features | no | None. ChoreStar never moves real money and issues no cards; allowance is a number the parent types |
| Health | no | No |
| News | no | No |
| COVID-19 contact tracing | no | No |
| Advertising ID | no | **No, the app does not use advertising ID.** Verified in the merged release manifest and inside the bundle: `com.google.android.gms.permission.AD_ID` appears nowhere, and no ad or analytics SDK is linked |
| Store listing / graphics | yes, `edits.listings` and `edits.images` | Already pushed in en-US, es-419, pt-BR and ar |

The Data safety answers to enter are in the table further up this document.

## App signing certificate

The Play app-signing SHA-256 does not need a Console visit: it comes back from
`applications/{pkg}/generatedApks/{versionCode}` as `certificateSha256Hash`
once a bundle has been uploaded. For `com.chorestar.family` it is

```
EF:A0:9B:A6:29:07:10:08:D9:8B:45:89:3D:B8:FF:46:B2:A7:D6:F1:CC:19:93:D7:9B:38:E6:B1:4D:F7:00:C4
```

and it is already in `chorestar-nextjs/public/.well-known/assetlinks.json`
alongside the upload key, so App Links verify for Play installs.

## App access (the "Sign in details" item)

Choose **All or some functionality is restricted**, then add two instruction
entries. The parent dashboard needs an account; kid mode does not.

**Entry 1**

| Field | Value |
|---|---|
| Name | `Parent account` |
| Username | `appreview@chorestar.app` |
| Password | the value in `ChoreStar-iOS/fastlane/metadata/review_information/demo_password.txt` |
| Any other information | Sign in on the first screen to reach the parent dashboard: children, chores, routines, allowance, stats and settings. The account is on Premium so every gated feature is visible. Premium is sold as a Google Play subscription; nothing else is paywalled. |

**Entry 2**

| Field | Value |
|---|---|
| Name | `Kid mode (no account needed)` |
| Username | leave empty |
| Password | leave empty |
| Any other information | Kid mode needs no account. On the sign-in screen tap "I'm a Kid!", enter family code `demo2026`, choose Emma, then PIN `1234`. This opens the child dashboard with chores, routines, goals and the reward store. The same screens are reachable from the parent side through Kid Mode on the Home tab. |

Both entries describe the same demo family, which is the one the App Store
review team uses, so the two stores stay in step.

## Permissions the release bundle declares

Useful when a form or a reviewer asks. The merged manifest for
`com.chorestar.family` requests exactly these, and nothing else:

| Permission | Why |
|---|---|
| `android.permission.INTERNET` | Supabase and the chorestar.app API |
| `android.permission.ACCESS_NETWORK_STATE` | Firebase Messaging checks connectivity |
| `android.permission.POST_NOTIFICATIONS` | Activity alerts and the daily reminder |
| `android.permission.RECEIVE_BOOT_COMPLETED` | Re-arms the daily reminder after a restart |
| `android.permission.VIBRATE` | Haptics on a completed chore |
| `android.permission.WAKE_LOCK` | Firebase Messaging, while handling a push |
| `android.permission.FOREGROUND_SERVICE` | Firebase Messaging |
| `com.google.android.c2dm.permission.RECEIVE` | Firebase Messaging |

No advertising ID, no location, no contacts, no camera permission (photos come
back through the system picker), no ad or analytics SDK.

## Real-time developer notifications (subscription lifecycle)

Without this, Google never tells the server that a subscription renewed,
lapsed or was cancelled, so an Android subscriber keeps Premium forever.
`app/api/google/notifications/route.ts` is the receiver; it re-checks every
message against `purchases.subscriptionsv2.get` rather than trusting the
notification type.

Built 2026-09-22 with the Play service account (it turned out to hold enough
rights in GCP project `chorestar` to enable the API and create all of this):

| Piece | Value |
|---|---|
| Topic | `projects/chorestar/topics/play-rtdn` |
| Publisher granted | `google-play-developer-notifications@system.gserviceaccount.com` -> `roles/pubsub.publisher` |
| Push subscription | `projects/chorestar/subscriptions/play-rtdn-push` |
| Push endpoint | `https://chorestar.app/api/google/notifications?token=<GOOGLE_PUBSUB_PUSH_TOKEN>` |

**Ben's one step (Console only, no API for it):** Play Console > Monetize >
Monetization setup > Real-time developer notifications > paste the topic name
above, save, then press **Send test notification**. A `TEST` row should land in
`google_notifications` within seconds.

Note the handler deliberately refuses to grant Premium for licence-test
purchases in production unless `GOOGLE_PLAY_HONOR_TEST_PURCHASES=1`, so a test
subscription's renewals are logged as `test-purchase-logged` and change no
tiers. `/api/google/verify` has no such guard, so the first purchase of a
licence test does flip the buyer to Premium.
