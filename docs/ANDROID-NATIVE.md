# ChoreStar for Android, native

`ChoreStar-Android-Native/` is the Kotlin + Jetpack Compose app that replaces
the Capacitor shell in `ChoreStar-Android/`. Same `applicationId`
(`com.chorestar.app`), so it installs over the shell and takes its place on
Google Play. The target is feature parity with the iOS app
(`ChoreStar-iOS/`), in Android's own idiom (Material 3, not a copy of iOS
chrome). Decided 2026-09-20.

## Stack

| Piece | Choice | Why |
|---|---|---|
| UI | Jetpack Compose, Material 3, brand colours, dynamic colour off | Android's own look, one theme file |
| Data | supabase-kt 3.8 (Postgrest, Auth, Storage) over Ktor/OkHttp | Same tables and RLS as web and iOS |
| Web endpoints | Ktor client to `https://chorestar.app/api/*` | Sign-up, kid login and kid mode need the service role; iOS calls the same routes |
| Navigation | Navigation Compose, five bottom tabs | Home, Family, Chores, Stats, Settings, as on iOS |
| Build | Gradle 8.14, AGP 8.13, Kotlin 2.3, JDK 21 (targets 17) | Headless: no Android Studio on the Mac |
| Config | `supabase.properties` (gitignored), falls back to the iOS `Info.plist` | The same two public values iOS ships |

Build and install:

```
cd ChoreStar-Android-Native
JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home \
ANDROID_HOME=/opt/homebrew/share/android-commandlinetools ./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

## Rules that keep the three clients agreeing

- **Weeks are stored Sunday-first, everywhere.** `chore_completions.week_start`
  is the Sunday's date and `day_of_week` 0 is Sunday, on web, iOS and here.
  Only the *display* order follows the locale (`Dates.displayOrder()`, from
  `WeekFields.of(locale)`): Monday-first in most of Europe and Latin America,
  Saturday-first in parts of the Middle East. Never localise storage.
- **Accounts are created through `/api/auth/signup`**, never `auth.signUp`
  from the client: the `profiles` row needs the service role and there is no
  trigger.
- **A co-parent reads the owner's rows.** `family_members.family_id` is the
  owner's user id; every family query uses that "effective" id.
- **Strings come from the iOS catalog.** `res/values*/strings_shared.xml` is
  generated from `ChoreStar-iOS/ChoreStar/Localizable.xcstrings` (557 English
  strings, 157 of them translated into es, pt-BR and ar, the same scope iOS
  ships). Regenerate rather than edit. The UI never uses a catalog key
  directly: `res/values/strings.xml` gives each phrase an app-level name that
  aliases the catalog key (`@string/chores_33cec`), so an iOS translation
  flows through on its own. Where the catalog is English-only (the tab
  names, "earned today", "Perfect days" and about twenty more, all in the
  screens' `stringResource` calls), `values-es|pt-rBR|ar/strings.xml`
  overrides the alias with a translation. **iOS has the same gaps**; backfill
  them in `Localizable.xcstrings` from those three files when the iOS
  localisation pass comes round, then delete the overrides.
- **View models never hold words.** They emit `UiText` (a resource id plus
  arguments, or raw server text) and the screen resolves it with
  `stringResource`, so a message is translated for the locale in force when
  it is shown.
- **Check a language on the phone without changing the phone:**
  `adb shell cmd locale set-app-locales com.chorestar.app --user 0 --locales es`
  (an empty `--locales ""` restores the system language).
- **Public keys only.** The anon key is publishable; nothing service-role ever
  lands in this project.

## Parity checklist (iOS → Android)

Done and device-verified (2026-09-20, commits fce56e1 → phase 2e):

- Phase 1: sign in / create family (via `/api/auth/signup`) / forgot
  password, five tabs, Home, Chores, Family, Stats, Settings.
- 2a `ui/family`, `ui/chores`: add/edit child (16 colours, DiceBear robots and
  people, emoji, camera/gallery photo into `child-avatars`, kid PIN into
  `child_pins`), add/edit chore (cents with presets, locale-ordered days with
  Gulf weekends, photo proof, category enum, 167 icons, colour, notes),
  suggestions (`/api/ai/suggest-chores` then the shared local catalogue),
  child detail, free limits 3 / 20 with the upgrade prompt.
- 2b `ui/week`, `ui/home`: week board (daily list and grid, any cell any
  week, bulk catch-up), approvals tray (`/api/chores/pending`,
  `/api/chores/approve`, proof lightbox), vacation masking, Home hero,
  getting started.
- 2c `ui/settings`: theme gallery and accent (read-merge-write into
  `custom_theme`), dark mode / sound / daily reminder (device-local),
  rewards & currency, family sharing (`family_codes`), reward store
  (`reward_items`), change password, delete account, vacation window.
- 2d `ui/routines`, `ui/achievements`, `ui/stats`: routines list / builder /
  templates / player / celebration, the ten badges and engine, full stats.
- 2e `ui/kid`: standalone kid session (`/api/child-pin/verify` + `/api/kid/*`)
  and kid mode on the parent's phone (Supabase with `pending` status),
  goals, store, wallet, camera proof, Perfect Day, synthesised sounds.
- Parent allowance section (`/api/allowance`, `/api/kid/wallet`) and store
  requests in the tray (`/api/rewards/redemptions`).

Also done (later the same day): slate surface tokens (Material's baseline
containers are lavender), Chores kid switcher / Pending–Completed filter /
search, kid-mode Back and Exit, Play Billing paywall (`data/PlayBilling.kt`,
verified through `/api/google/verify`, which now takes a Bearer token),
Restore / Manage Subscription, What's New (`ui/settings/WhatsNewScreen.kt`,
port the web changelog by hand when it grows), the routine player's ongoing
notification, the Glance home-screen widget (`widget/TodayWidget.kt`, fed by
a snapshot the dashboard writes to prefs), launcher shortcuts and App Link
routing of `/kid-login` into the kid door.

Still to do:

1. **Play Console products.** The paywall shows "Plans aren't available"
   until `chorestar_premium_monthly` / `chorestar_premium_yearly` exist and
   the app is in a testing track; purchases could not be exercised here.
2. **FCM push** for activity alerts (needs a Firebase project; the local
   daily reminder already works).
3. Kid-mode routines only post the ongoing notification once notifications
   are granted; the daily-reminder toggle asks, kid mode does not yet.
4. iOS backfill: the strings only Android translated live in
   `res/values-es|pt-rBR|ar/strings.xml`.

## Verifying on a phone

The Galaxy S25 Ultra is on USB (`R5CXC3EYFXJ`) and, after `adb tcpip 5555`
once, on Wi-Fi at `192.168.4.70:5555`. Compose has no DevTools; use
`adb exec-out screencap -p` for pixels and `adb shell uiautomator dump` for
the on-screen text and bounds. `adb shell cmd locale set-app-locales
com.chorestar.app --locales es` flips the app's language without touching
the phone's.
