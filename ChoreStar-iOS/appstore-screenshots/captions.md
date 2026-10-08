# App Store screenshot captions

One entry per screenshot, in listing order. Headline ≤ ~22 chars, subtitle
≤ ~38 chars (AppScreens card format). Every claim must match a shipping
feature — captions are App Store metadata (Guideline 2.3).

2.0 set. RAW captures come from `fastlane screenshots` (Snapfile drives
ChoreStarUITests/ScreenshotTests against The Star Family); framing/captions
are applied afterwards (AppScreens).

| # | File | Headline | Subtitle |
|---|------|----------|----------|
| 1 | 01-home.png | Make Chores Fun | Turn chores into a game kids love |
| 2 | 02-kid-dashboard.png | Kids Save For Goals | Watch the bar fill toward the prize |
| 3 | 03-kid-store.png | Spend In Your Store | Screen time & movie night, you price it |
| 4 | 04-chores.png | Chores On Their Days | Trash on Tuesdays, piano Mon & Wed |
| 5 | 05-routines.png | Mornings Run Themselves | Step-by-step routines with timers |
| 6 | 06-family.png | One App, Whole Crew | Every kid gets an avatar and a PIN |
| 7 | 07-stats.png | Watch Streaks Grow | Perfect days, badges & weekly stats |
| 8 | 08-kid-login.png | Kids Sign In Solo | No email, just a family code and PIN |

Alternates (true, swappable):
- Approve Before It Counts / Optional OK step, photo proof included
- Wears Your Colors / Seasonal themes across app and widgets
- Keep Kids Safe / No ads, no trackers, no kid data
- Share Parent Control / Invite a co-parent easily

Note: "Approve Every Task" style captions are now TRUE if approval mode is
shown, but only claim it on a screenshot where the Needs your OK tray is
visible (01-home has it).

## Frame treatment (2.0)

Applied via the AppScreens MCP bridge, replacing the old purple brand
gradient. Both device sets use the same recipe:

- Background: linear gradient, 165deg, `#eef6f6` -> `#fdf0ec` (soft teal to
  blush; matches the seasonal-theme softness without competing with the UI)
- Device: ~70% scale (72% iPad), centered, corner radius 28, soft shadow
  (`#0e3a40` at 20% opacity, blur 60, y 24)
- Text: top, headline 96 / weight 700 / `#143c40`; subtitle 46 / weight 500 /
  `#51666a`
- Output: iPhone 1320x2868 (6.9"), iPad 2064x2752 (13")

Kid-login shots show the staged family code `star2026`
(profiles.kid_login_code for The Star Family was reseeded from the
auto-generated value before capture).

## iPhone Duo set (2.4)

RAW captures in `raw-duo/`: `open-*` (flat, 2853x2007, the store set),
`folded-*` (closed, 1398x2034), `book-*` (half-open, extras for marketing:
in a flat screenshot the hinge gutter just reads as an off-center gap).
ASC's Duo slot (IPHONE_DUO_PROFILE) takes either size, portrait or landscape.

Captured with `scripts/duo-sim.sh` on Xcode 27.1 + `simctl launch` args
(`-chorestar-tab`, `-chorestar-kid Maya`), not fastlane: poses are set by hand
in the Simulator window, and each pose has its own `--display` target.

Gotchas:
- Reseed first (`chorestar-nextjs/scripts/seed-demo-family.mjs`, dates are
  relative to today). The reseed resets the demo password, which revokes the
  sim's saved session: the next launch MUST pass `-chorestar-fresh
  -chorestar-signin <email> <password>`, or DB reads still work but every
  /api call 401s and the goal, store, approvals tray and unpaid pill vanish.
- Don't combine `-chorestar-fresh` with `-chorestar-kid` (the sign-out lands
  after kid mode turns on); sign in fresh once, then launch kid mode.
- Pass `-FASTLANE_SNAPSHOT YES` so TipKit cards stay hidden.
- Kid Login is a sheet on the Duo; left out of the set.
