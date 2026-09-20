# ChoreStar Android shell

`ChoreStar-Android/` is a Capacitor 8 shell that loads the live web app
(`https://chorestar.app/login`) in a WebView. Everything a user sees is the
Next.js app; the shell adds the pieces a WebView cannot get on its own. This
page lists those pieces, how the web app detects the shell, and how to check
each one on a real phone. Store and billing work live in
[PLAY-LISTING.md](PLAY-LISTING.md) and [PLAY-BILLING.md](PLAY-BILLING.md).

## How the web app knows it is in the shell

The WebView user agent ends in `ChoreStarAndroid`
(`capacitor.config.ts` `android.appendUserAgent`) and Capacitor injects
`window.Capacitor`. `isAndroidShell()` / `useAndroidShell()` in
`chorestar-nextjs/lib/utils/platform.ts` check both. The shell is
consumption-only until Play Billing is live, so every purchase surface hides
behind that flag (see PLAY-BILLING.md).

## What the shell adds

| Piece | Where | Behaviour |
|---|---|---|
| System back button | `components/analytics/android-back-button.tsx` | Dialog open: closes it. Root screen (`/dashboard`, `/kid/:id`, `/kid-login`, `/login`) or no history: minimizes the app, never exits. Otherwise history back. |
| App Links | `AndroidManifest.xml` intent filter + `public/.well-known/assetlinks.json` + `components/analytics/android-app-links.tsx` | `chorestar.app` links for the app's own routes open in the app: `/auth/callback` (sign-in emails), `/reset-password`, `/family/accept/*` (co-parent invites), `/kid-login*`, `/kid/*`, `/dashboard*`, `/login`. Marketing pages stay in the browser on purpose (pricing copy). The web bridge follows `appUrlOpen` (warm) and the launch URL (cold, once per URL), same origin only. |
| Offline page | `capacitor.config.ts` `server.errorPath` + `www/offline.html` | When the remote app fails to load (no network, DNS, 5xx) the WebView shows a branded page with Try again; it also retries on the `online` event and every 8 seconds. |
| Haptics | `lib/utils/platform.ts` `hapticTap()` via `lib/utils/sound.ts` | Chore and routine step completions vibrate 12 ms, celebrations a short double pulse, on any Android phone, even with sound muted. Needs `android.permission.VIBRATE` (declared). |
| Screen wake lock | `lib/hooks/use-wake-lock.ts` in the routine player | The screen stays on through a routine (timers) until the celebration. Web API, so it also works in Chrome and Safari 16.4+. |
| Opaque surfaces on phones | `app/globals.css` (`max-width: 639px`) | Dialogs and the shell tab bar are solid: `backdrop-filter` on a full-screen fixed layer corrupts Android WebView compositor tiles. |
| Settings dialog sizing | `.dialog-content-settings.dialog-shell` | Room above (48px) and above the tab bar (48px); the tab strip scrolls itself to the tab the dialog opened on, and that tab takes focus. |
| Keyboard | `MainActivity.java` | WebView subtree opts out of autofill so the IME opens for email fields (tradeoff: password managers cannot fill in-app). |

## App Links: certificates

`assetlinks.json` must list the SHA-256 of the certificate that signed the
installed build, or Android silently falls back to the browser.

- Upload key (sideloaded release builds, `scripts/release-aab.sh`): already
  listed. Read it from a built bundle with
  `keytool -printcert -jarfile android/app/build/outputs/bundle/release/app-release.aab`.
- Play App Signing key (every install from Google Play): **add after the first
  upload.** Play Console > Test and release > App integrity > App signing key
  certificate > SHA-256. Keep the upload key line as well. Redeploy the web
  app; Android re-verifies on install and about once a day.
- Debug builds are signed with the machine's debug key and never verify. To
  exercise the flow on a debug build, opt the app in by hand:
  `adb shell pm set-app-links-user-selection --user 0 --package com.chorestar.app true chorestar.app`.

Check state: `adb shell pm get-app-links com.chorestar.app`. Force a
re-check: `adb shell pm verify-app-links --re-verify com.chorestar.app`.

Sign-in emails link to the Supabase auth host first and redirect to
`/auth/callback`; Chrome hands a verified App Link over on that redirect,
other browsers may not. Password reset and invite emails link to
`chorestar.app` directly.

## Checking on a phone

USB debugging on, `adb devices` shows `device`. The WebView is inspectable
over Chrome DevTools Protocol:

```bash
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
ADB=$ANDROID_HOME/platform-tools/adb
PID=$($ADB shell pidof com.chorestar.app)
$ADB forward tcp:9222 localabstract:webview_devtools_remote_$PID
curl -s localhost:9222/json   # webSocketDebuggerUrl for Runtime.evaluate, Page.captureScreenshot
```

- Back button: open Settings, `adb shell input keyevent KEYCODE_BACK`: the
  dialog closes and the URL is unchanged. On the dashboard, BACK minimizes
  (`adb shell pidof com.chorestar.app` still returns a pid).
- App Links: `adb shell am start -a android.intent.action.VIEW -d "https://chorestar.app/kid-login"`
  lands in `com.chorestar.app/.MainActivity` and the WebView URL is
  `/kid-login`. Test cold (app force-stopped) and warm (app on the dashboard).
- Offline page: `adb shell cmd connectivity airplane-mode enable`, force-stop
  and relaunch, `adb exec-out screencap -p > offline.png`, then
  `airplane-mode disable` and confirm the app comes back on its own.
- Haptics: `adb shell dumpsys vibrator_manager | grep -A3 "Previous vibrations"`
  after checking off a chore lists a fresh entry from the app.

## Verified on hardware

Galaxy S25 Ultra (SM-S938U1, Android 16), 2026-09-20, debug build, live web
app:

- Back button closes an open dialog (URL unchanged) and minimizes on the
  dashboard (process stays alive; relaunch resumes the page).
- Settings dialog: opaque on the phone, 48px above and 48px above the tab
  bar, and Appearance, Billing and Family each land fully visible in the
  tab strip when opened directly; focus lands on the opened tab.
- Shell tab bar background is solid white (`rgb(255, 255, 255)`).
- Offline page: airplane mode plus relaunch shows `https://localhost/offline.html`;
  airplane mode off brings the dashboard back within 15 seconds unaided.
- App Links: `am start -a VIEW -d https://chorestar.app/kid-login` opens
  `.MainActivity` on `/kid-login` from a cold start and from the dashboard
  (user selection enabled by hand; the debug certificate cannot verify).
- Vibration: `navigator.vibrate(12)` returns false before a gesture and true
  after a trusted click; `dumpsys vibrator_manager` logs the effect.
- Layout sweep (parent dashboard, all Settings tabs, kid login and kid
  dashboard): no horizontal overflow, no tap targets under 44px, no console
  errors.

## Building

```bash
cd ChoreStar-Android
npx cap sync android                          # copies www/, writes assets/capacitor.config.json
export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
(cd android && ./gradlew assembleDebug -q)    # debug APK for a phone
scripts/release-aab.sh                        # signed release bundle for Play
```

Manifest and `MainActivity.java` are edited in `android/` directly;
`cap sync` never rewrites them.
