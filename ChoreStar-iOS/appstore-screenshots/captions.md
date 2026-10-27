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
| 8 | 08-fair-shares.png | Fair Shares for Siblings | Chores take turns, or race for a bonus |

### 2.6 set (current listing order)

| # | File | Headline | Subtitle |
|---|------|----------|----------|
| 1 | 01-home.png | Make Chores Fun | Turn chores into a game kids love |
| 2 | 02-kid-dashboard.png | Kids Save For Goals | Watch the bar fill toward the prize |
| 3 | 03-kid-pet.png | A Pet That Grows | Every chore helps their pet level up |
| 4 | 04-kid-jars.png | Spend, Save, Give | Money habits, one jar at a time |
| 5 | 05-team-challenge.png | Siblings Team Up | Work together for pizza night |
| 6 | 06-routines.png | Mornings Run Themselves | Step-by-step routines with timers |
| 7 | 07-chores.png | Chores On Their Days | Trash on Tuesdays, piano Mon & Wed |
| 8 | 08-fair-shares.png | Fair Shares for Siblings | Chores take turns, or race for a bonus |
| 9 | 09-kid-store.png | Spend In Your Store | Screen time & movie night, you price it |
| 10 | 10-family.png | One App, Whole Crew | Every kid gets an avatar and a PIN |

Watch Streaks Grow (07-stats) left the listing for the three Premium shots;
it is in git history. Pets, jars and challenge are Premium features shown on
The Star Family, which the seed script now makes Premium with Mochi the
kitty, 60/30/10 jars and a Pizza night challenge. Captures:
ScreenshotTests test09-11 (`bringToTop` drags a card to just under kid
mode's pinned header). The seed turns the family's seasonal theme off and
the tests pass `-seasonalTheme none`, so no October pumpkins in a March
listing. If the status bar override misses on a run (dotted signal, black
battery), paste the top 170 px from a good capture of the same device.
Framing: duplicate-free path is to swap images into the 2.2 AppScreens
project (its per-shot settings ARE the recipe below) and export.

2.5 swapped Kids Sign In Solo (08-kid-login) for Fair Shares: the kid-login
shot repeated the kid-dashboard story. Capture with `-chorestar-sharechore`
(DEBUG): it opens Add Chore scrolled to the sharing section; raw captures in
`raw-shared/`.

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

Earlier kid-login shots showed the staged family code `star2026`
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

Framed Duo set (`iphone-duo-2853x2007/`, same frame recipe, flattened: the
Duo spec allows no alpha): 01 Make Chores Fun · 02 Kids Save For Goals ·
03 Chores On Their Days / "Recycling on Tuesdays, plants Mon, Wed & Fri" ·
04 One App, Whole Crew · 05 Watch Streaks Grow.

Uploaded with `scripts/asc.mjs asset-place <v> APP_SCREENSHOT IPHONE_DUO_PROFILE …`
(fastlane deliver has no Duo display type; the Asset Library API does).

## Product page header + search results (2.4)

`product-page/header-5244x2950.png` (source `header.html`, rendered at 1x in
headless Chromium) fills both PRODUCT_PAGE_HEADER_ASSET and
APP_STORE_SEARCH_RESULTS_ASSET: both accept 5244x2950 PNG.

## Custom product page: "Made for iPhone Duo" (2026-10-08)

ppid 45786466-6537-4c29-abe5-c7e8cfd86356, templated from 2.4 (iPhone, iPad,
header, search asset copied). Duo row: open kid dashboard, then the Book set
(`iphone-duo-book-2853x2007/`: Nothing On The Fold · Kid Mode, Two Pages ·
Every Kid At A Glance · The Whole Crew, Side By Side), then the open set.
Book shots need build 39+ (half-open Home/Chores/Family landed after b38).
