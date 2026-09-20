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
- [ ] Ads: none. In-app purchases: none in this version
- [ ] Closed testing track first (required for new personal accounts;
      sensible for everyone), then production

## Signing

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
| Financial info | No | | Allowance amounts are numbers the parent types; no payment data in the Android app |
| App activity > App interactions | Yes | Analytics, app functionality | Chore completions, routine runs; Google Analytics on the web pages |
| App info and performance > Crash logs | No | | (no crash SDK in the shell) |
| Device or other IDs | No | | |
| Location, Contacts, Messages, Health, Calendar, Files, Audio, Web browsing | No | | |

All data is processed by the developer (Supabase hosted database, US);
no ad SDKs. Not a "Designed for Families" app.

## Content rating (IARC questionnaire)

Category: **Utility, productivity, communication, or other**. Violence,
sexual content, language, controlled substances, gambling: **No** to all.
User interaction: users can communicate only within their own family
(co-parent sharing, kid names); no public sharing; **no** user-generated
content visible to others. Shares location: No. Digital purchases: **No**
(none in the Android app). Expected rating: Everyone.

## Graphics (ready in docs/assets/play/)

- `feature-graphic-1024x500.png`: brand gradient, the star mark, the tagline,
  three chips, and a kid-dashboard card. Rendered from HTML (Playwright).
- `phone-01.png` to `phone-04.png` (1080x2338, 9:19.5): kid login code entry,
  PIN pad, Emma's kid dashboard (goal card, streak, wallet, badges), chore
  list. Captured from the live site at phone width on the demo family; the
  Android app is this exact UI in a shell. Suggested order: 03, 04, 01, 02.
- App icon 512x512: export from the existing icon set (ChoreStar-Android
  already ships the adaptive icon).
