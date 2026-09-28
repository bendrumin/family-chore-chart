# Setting up ChoreStar on another machine

Everything the repo cannot carry for you: the tools, their versions, and the
seven files that are deliberately not in git. Written for future-Ben on a
fresh Mac, in the order that gets you to a running app fastest.

No secret values appear here, only names and locations.

**Shortcut:** `scripts/new-machine.sh` does most of this page. Run `export` on
the old Mac (an encrypted `.dmg` of every file below), then `import <dmg>`,
`install`, `check` and `verify` on the new one.

## 1. Copy these seven files across first

None of these are in git, and the web app, the Android build and every release
script depend on them. Move them with a password manager, an encrypted disk
image, or AirDrop. Never a plain email or a chat message.

| File | Goes to | Needed for |
|---|---|---|
| `chorestar-nextjs/.env.local` | same path in the repo | everything web, and every `node --env-file=.env.local script` |
| `chorestar-nextjs/.env.test` | same path | Playwright E2E (points at a REAL family, never seed it) |
| `ChoreStar-Android-Native/supabase.properties` | same path | Android build reads Supabase URL and anon key |
| `ChoreStar-Android-Native/app/google-services.json` | same path | Firebase Cloud Messaging; the app builds without it, push does not work |
| `ChoreStar-Android/android/keystore.properties` | same path | release signing (`storeFile` is an ABSOLUTE path, fix it up on the new machine) |
| the `.jks` that `storeFile` points at | wherever you repoint it | **the Play upload key, see the warning below** |
| `~/.chorestar-android/play-key.json` | same path in `$HOME` | Play Developer API: releases, pricing, Search Console, Pub/Sub |

Plus the App Store Connect key, which lives outside the repo:

```
~/.appstoreconnect/private_keys/AuthKey_P8NYU5K555.p8
```

> **Back up the `.jks` and its passwords somewhere you will still have in five
> years.** It is the upload key for `com.chorestar.family`. Google holds the
> app-signing key under Play App Signing, so a lost upload key is recoverable
> through Play support, but it is days of waiting rather than minutes. The
> other credentials on this page can all be regenerated in an afternoon.

## 2. Install the toolchain

```bash
brew install node openjdk@21 fastlane
brew install --cask android-commandlinetools
npm i -g vercel supabase
```

Then Xcode from the App Store, and `xcodebuild -runFirstLaunch` once.

**Version traps that cost hours if you skip them:**

- **Java 21, not the newest.** Gradle 8.14's Kotlin DSL cannot parse Java 26 and
  dies with `IllegalArgumentException: 26.0.2`. Always build Android with
  `JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home`.
- **`adb` is not on `PATH`** from the cask. It lives at
  `/opt/homebrew/share/android-commandlinetools/platform-tools/adb`.
- **Xcode:** if `xcode-select -p` points at CommandLineTools, every `xcodebuild`
  fails to load plugins. Prefix with
  `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer`. The iOS ship
  scripts already do.
- **`SUPABASE_SERVICE_KEY`, not `SUPABASE_SERVICE_ROLE_KEY`.** `.env.local` uses
  the first name. A script reading only the documented second name exits on
  "missing env" and looks broken.

## 3. Verify each half, in this order

```bash
# web
cd chorestar-nextjs && npm install && npm run test:unit && npm run build && npm run dev

# android (needs JDK 21)
cd ChoreStar-Android-Native
JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home ./gradlew :app:compileDebugKotlin

# ios (needs Xcode)
cd ChoreStar-iOS
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild \
  -project ChoreStar.xcodeproj -scheme ChoreStar \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' build
```

Then prove the credentials work, all read-only:

```bash
cd chorestar-nextjs
node scripts/play-release.mjs tracks        # Play key
node scripts/gsc.mjs sites                  # Search Console (same key)
node --env-file=.env.local scripts/audit-entitlements.mjs   # Supabase + Stripe
cd ../ChoreStar-iOS && node scripts/asc.mjs builds          # App Store Connect key
```

If all four print sensible output, the new machine can ship.

## 4. Deploying

`vercel` is linked per-directory, so run `npx vercel link` once in the repo
root. **Deploy from the repo root, never from `chorestar-nextjs/`**: deploying
the subdirectory produces a middleware 500 on every route. Pushing to `main`
auto-deploys, which is the normal path; `curl` the site afterwards rather than
trusting the dashboard.

## 5. Things that are not files

- **Play Console, App Store Connect, Supabase, Vercel, Stripe, Resend, Firebase**
  are all browser logins. Nothing to copy, but you need the passwords and the
  2FA device.
- **Search Console** access for the scripts comes from the Play service account
  `chorestar@chorestar.iam.gserviceaccount.com` being a Full user on
  `sc-domain:chorestar.app`. That is a per-property grant and survives the
  machine move.
- **Simulator and emulator state.** The iPhone 17 Pro simulator on the old
  machine keeps a signed-in demo session used by the Maestro flows; a new
  machine starts signed out, so sign in as the demo family again before
  expecting the UI tests to pass.
