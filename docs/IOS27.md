# iOS 27 adoption plan

Written 2026-09-14, the day iOS 27 shipped alongside the iPhone 18 Pro, 18
Pro Max, and iPhone Duo. Sources: the iOS 27 SDK on this machine (symbol
counts measured from swiftinterface availability annotations) and Apple/press
coverage of the release. Status today: the app runs clean on iOS 27 (verified
on the simulator runtime), and build 33 (2.2.1, live Sep 14) is our first
binary archived on the iOS 27 SDK.

## Tier 0: ship soon as 2.2.2 (compliance and trust)

1. **DeclaredAgeRange + PermissionKit adoption.** State App Store
   Accountability Acts (Texas first, effective Jan 1 2026, more states
   following) push age-range and parental-consent APIs onto exactly our
   category of app. Apple ships both frameworks in iOS 27:
   - `DeclaredAgeRange`: `AgeRangeService` answers with an age band (never a
     birth date); includes a `ParentalControls` surface.
   - `PermissionKit`: `AskCenter` / `PermissionQuestion` / `PermissionFlow`,
     plus a Significant Change API for re-requesting parental consent. This
     maps naturally onto ChoreStar's approval model.
   We have passed review through build 33 without them, so nothing is blocked
   today, but a family app with kid users should be early here, and "adopted
   Apple's new parental-consent APIs" is a parent-trust line worth having.
   Scope the exact obligations from Apple's docs before building; the
   frameworks are confirmed present in the SDK.
2. **Deprecation sweep**: one non-quiet build on the iOS 27 SDK, fix warnings.
3. **iPhone Duo QA** the moment its simulator appears in an Xcode 27.x point
   release (not in 27.0). Expectation: fold/unfold presents as size-class
   changes, which the app already handles for iPad; risk is polish, not
   breakage.

## Tier 1: the 2.3 holiday release ("built for iOS 27")

Measured iOS-27-gated API additions in the SDK, ranked by fit:

1. **FoundationModels, 241 new symbols (largest in the SDK).** New:
   `PrivateCloudComputeLanguageModel`, image attachments, `ReasoningLevel`,
   availability gating. Plan: Smart Suggestions get an on-device tier on
   iOS 27 devices (private, offline, zero API cost), falling back to the
   existing web Claude API (SupabaseManager ~line 1880) on older devices.
   Prompts, structured outputs, and evals already exist; FoundationModels'
   `Generable`/`GenerationSchema` is a structured-output system, so the port
   is natural. 1-2 days.
2. **AppIntents, 28 new symbols.** Lands on the already-planned Siri +
   interactive widgets work. Baseline the intents at iOS 17, adopt the new
   surface conditionally.
3. **SwiftUI, 124 new symbols.** Sampled as mostly document/scene plumbing;
   do a jewel hunt during 2.3 UI work rather than up front.

## Tier 2: watch or skip

- CarPlay video, Safari topics, Photos Spatial Reframing: system features,
  no ChoreStar surface.
- PaperKit (20 new symbols): a maybe-someday for kid drawings on completions.
- MetricKit (102): perf monitoring, nice-to-have, not user-facing.

## How users hear about it (the comms split)

1. **Now:** a short blog post, "ChoreStar is ready for iOS 27 and the new
   iPhones": day-one compatibility, tested on the new hardware sizes, what is
   coming at the holidays. Honest, voice-brief compliant, and it rides the
   iOS 27 news wave for search.
2. **2.2.2:** What's New names the age/parental-consent adoption in parent
   words ("built on Apple's new parental-consent system").
3. **2.3 launch:** the full "built for iOS 27" story: suggestions that run on
   your iPhone, Siri, tap-to-check widgets, seasonal icons. Blog + release
   notes + a themed share card.

Voice rules per docs/VOICE.md apply to all of it: no feature is announced
before it ships, and every claim names what the user gets.

## Two Xcodes, one ship lane

The iPhone Duo simulator lives only in the Xcode 27.1 beta (released
2026-09-18; Duo ships Oct 23 on iOS 27.1). The release Xcode 27.0 keeps
shipping the app. Rules that keep them apart:

- `/Applications/Xcode.app` = release, ships the store build. `xcode-select`
  stays pointed here and every `scripts/ship-b*.sh` pins `DEVELOPER_DIR` to
  it, so nothing about shipping changes when a beta is installed.
- `/Applications/Xcode Beta.app` = the beta (installed 2026-09-18 under that
  name; keep the space). Reach it only per shell or per process:
  `source scripts/xcode-beta.sh`, or `scripts/duo-sim.sh` which builds into
  `build/duo-dd` and never touches the release DerivedData.
- Never `xcode-select -s` the beta, never archive for the store with it
  (beta SDK builds are TestFlight-only; build 21 proved that in August),
  never install the macOS beta (the BuildMachineOSBuild re-stamp trap).
- Open the project in the beta with `open -a "Xcode Beta" ChoreStar.xcodeproj`
  and decline "Update to recommended settings." Then `git diff
  ChoreStar.xcodeproj/project.pbxproj`; a rewritten project format breaks
  the release Xcode. `duo-sim.sh` flags this automatically.
- Quit the release Simulator before launching the beta's. Two CoreSimulator
  versions at once produce "connection became invalid" errors.
- Simulator runtimes are shared system-wide; device types are not. The Duo
  device type is visible only through the beta's `simctl`.
- Grab the **27.1** beta, not 27.2: Apple shipped a 27.2 beta first, and it is
  the 27.1 line that carries the Duo SDK the October release needs.
- Stale on this Mac as of 2026-09-18: `/Applications/Xcode-27.app` is the
  superseded 27.0 beta 5, and `~/Downloads` holds the old RC and beta 5
  xips (~7 GB together). Safe to delete; nothing references them.

### First Duo run (2026-09-18, Xcode 27.1 beta 27A9269, iOS 27.1 runtime 24A94401)

- Build, install, launch: clean. The app renders correctly on the Duo's
  inner display (1398x2034 points, one physical display plus the usual
  720x480 external port). iOS puts the status bar in a vertical rail beside
  the camera cutout on the trailing edge and hands apps a trailing safe-area
  inset; ChoreStar's content centers inside the safe area and the gradient
  runs edge to edge underneath, which is the correct behavior.
- `simctl` in 27.1 has no fold/pose verbs (`ui` covers appearance, contrast,
  text size only), so fold and unfold transitions have to be exercised in
  Xcode Beta's built-in simulator UI. There is no standalone Simulator.app
  in Xcode 27.x, in either the release or the beta; `duo-sim.sh` runs
  headless and skips the GUI.
- The pbxproj guard fired on the very first run: a plain command-line
  `xcodebuild build` under the beta rewrote `project.pbxproj`
  (LastUpgradeCheck 2620 to 2710, groups converted to synced folders, an
  analyzer flag added) and both shared schemes. `git checkout --
  ChoreStar-iOS/ChoreStar.xcodeproj/` restored them. Expect this after every
  beta session; never accept "Update to recommended settings" in the beta.
