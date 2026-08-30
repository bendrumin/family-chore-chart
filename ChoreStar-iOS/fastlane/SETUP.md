# fastlane setup — ChoreStar App Store listing

> Note: `fastlane/README.md` is **auto-generated and overwritten** every time
> fastlane runs, so the real documentation lives here in `SETUP.md`.

These lanes manage the App Store **listing** (metadata text + screenshots).
They never upload a binary — archive that from Xcode as usual.

## Why this exists

`fastlane/metadata/*.txt` used to be a hand-maintained mirror that was never
connected to Apple: editing it changed nothing on the live listing, and the two
copies drifted. That drift is how `ChoreStar: Kids Chore Chart` stayed live long
enough to get 1.3 rejected under the Kids-category guideline. These lanes make
the repo the source of truth — but only after you reconcile it once (below).

## One-time setup

1. **fastlane is already installed** via Homebrew (2.237.0). It was installed
   that way on purpose: the system Ruby here is 2.6.10, which modern fastlane
   will not run on, so `gem install fastlane` fails.
   ```bash
   fastlane --version   # verify
   ```

2. **Create an App Store Connect API key** — this avoids Apple ID + 2FA prompts.
   In App Store Connect: **Users and Access → Integrations → App Store Connect
   API → +**, give it the **App Manager** role, then download the `.p8`.
   *Apple lets you download it exactly once.* Store it here:
   ```bash
   mkdir -p ~/.appstoreconnect/private_keys
   mv ~/Downloads/AuthKey_XXXXXXXXXX.p8 ~/.appstoreconnect/private_keys/
   ```
   Never commit the `.p8` — `.gitignore` already excludes it, and it is a
   credential for your whole developer account.

3. **Export the three values** (add to `~/.zshrc` to make them permanent):
   ```bash
   export ASC_KEY_ID=XXXXXXXXXX          # shown next to the key in ASC
   export ASC_ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx   # above the key list
   export ASC_KEY_PATH=~/.appstoreconnect/private_keys/AuthKey_XXXXXXXXXX.p8
   ```
   Any lane that talks to Apple fails with a message listing these if they are
   missing, so there is no way to half-configure it by accident.

## First run — reconcile before you overwrite

Do this **before** your first upload. It replaces the local `.txt` files with
Apple's live values so you can see exactly what differs:

```bash
cd ChoreStar-iOS
fastlane ios pull      # downloads live metadata + screenshots
git diff               # review every difference deliberately
```

Re-apply any local wording you actually want (the 1.4 release notes and the
`ChoreStar: Family Chore Chart` name), commit, then upload.

## Everyday use

```bash
fastlane ios check              # scan metadata for common rejection reasons
fastlane ios stage_screenshots  # appstore-screenshots/ → fastlane/screenshots/en-US/
fastlane ios metadata           # upload text + staged screenshots (preview first)
```

Useful options:

| Command | Effect |
|---|---|
| `fastlane ios metadata skip_screenshots:true` | Text only — fastest, lowest risk |
| `fastlane ios metadata force:true` | Skip the confirmation preview |
| `fastlane ios metadata overwrite:true` | **Replaces every live screenshot** |

## Screenshots (capture)

`fastlane screenshots` captures RAW shots for every device in `Snapfile` by
running `ChoreStarUITests/ScreenshotTests` (fastlane snapshot). Output lands in
`appstore-screenshots/raw/en-US/`, named `<device>-<NN-name>.png` in listing
order. The status bar is overridden (9:41, full battery); framing and captions
stay a separate pass (see `appstore-screenshots/captions.md`).

- Needs `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer` on this Mac.
- The tests sign in as **The Star Family** (`bsiegel13+uitest-shots@gmail.com`),
  a dedicated, seeded screenshot account: Maya has a streak, a half-full goal,
  and a pending store request; Leo has a tick in the Needs-your-OK tray. Do not
  "clean up" that data — the shots depend on it. Override the credentials with
  `CHORESTAR_SHOTS_EMAIL` / `CHORESTAR_SHOTS_PASSWORD` if it is ever recreated.
- Kid-mode shots use the DEBUG `-chorestar-kid Maya` launch argument (no PIN),
  so screenshots only work with Debug builds — which is what snapshot builds.
- After capturing: frame/caption the picks, drop them into
  `appstore-screenshots/{iphone-6.9-1320x2868,ipad-13}/`, then
  `fastlane stage_screenshots` and `fastlane metadata` as before.

## Gotchas

- **`overwrite:true` deletes screenshots for device families you did not stage.**
  Only `iphone-6.9-1320x2868` is staged by `stage_screenshots`; the `ipad-13`
  set is from the 1.3 design and is deliberately excluded. Recapture iPad before
  any overwrite run, or you will drop the live iPad screenshots.
- **Screenshot device is detected from pixel dimensions**, not filenames, so the
  sizes must match Apple's exactly: 6.9" iPhone is `1320x2868`, 13" iPad is
  `2064x2752`. Filenames only control display order.
- **In-App Purchases are out of scope.** `deliver` cannot create or submit IAP
  products — `com.chorestar.premium.yearly` has to be created and submitted in
  App Store Connect by hand, including its required App Review screenshot
  (there is one at `appstore-screenshots/iap-review/paywall.png`).
- **The app name also lives in ASC's App Information tab.** Until a successful
  `fastlane ios metadata` run, that field is the only thing the store reads.
- **Staged screenshots are gitignored** (`fastlane/screenshots/`) because they
  are copies; `appstore-screenshots/` remains the committed source of truth.
