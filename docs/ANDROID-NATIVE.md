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

Phase 1, first build: sign in / create family / forgot password, five tabs,
Home (greeting, today's progress, per-child rows, needs-your-OK count), Chores
(grouped by child, tick today), Family (children, kid login code), Stats
(week per child), Settings (account, rewards, sign out).

Then, in order: add/edit child (colour, photo, PIN); add/edit chore (days,
reward, icon, category, photo proof); week board with any-day ticking and
bulk catch-up; approvals (approve/reject, proof photo); vacation mode;
reward settings and currency; theme (light/dark/seasonal/accent); kid mode
(family code + PIN login, kid dashboard, wallet, goals, store, achievements);
routines (list, builder with steps/timers/reorder, starter templates, player
with celebration); achievements and history; family sharing (invite code,
members); account (change password, delete); what's new; paywall and Play
Billing; notifications (local reminders now, FCM once a Firebase project
exists); App Links, shortcuts, themed icon, per-app language; home screen
widget.

## Verifying on a phone

The Galaxy S25 Ultra is on USB (`R5CXC3EYFXJ`) and, after `adb tcpip 5555`
once, on Wi-Fi at `192.168.4.70:5555`. Compose has no DevTools; use
`adb exec-out screencap -p` for pixels and `adb shell uiautomator dump` for
the on-screen text and bounds. `adb shell cmd locale set-app-locales
com.chorestar.app --locales es` flips the app's language without touching
the phone's.
