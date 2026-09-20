<!-- Extracted from an iOS code survey on 2026-09-20; the source of truth is the Swift code it cites. -->

# ChoreStar iOS — KID MODE / ROUTINES / ACHIEVEMENTS functional spec

Base path (all refs relative to it): `/Users/bensiegel/family-chore-chart/ChoreStar-iOS/ChoreStar/`
Web API base: `https://chorestar.app` — `SupabaseManager.appBaseURL`, `Managers/SupabaseManager.swift:126`.

---

## 0. Two distinct "kid" sessions (important for the port)

| | **Standalone kid session** | **Kid mode on a parent device** |
|---|---|---|
| Entry | `KidLoginView` (family code + PIN) | `ChildAuthView` (tap name + PIN), from Home toolbar |
| Credential | `kidToken` (Bearer) from `/api/child-pin/verify` | parent Supabase JWT |
| Flag | `kidModeSession != nil` → `isStandaloneKidSession` (`SupabaseManager.swift:98,102`) | `isChildSession == true`, `kidModeSession == nil` |
| Data path | `/api/kid/*` + `/api/routines*` with Bearer kid token | direct Supabase (PostgREST) through RLS |
| Both | set `isChildSession = true` and `currentChild`, so `ContentView` renders `ChildMainView` (`ContentView.swift:26-27`) |

---

## 1. KID LOGIN

### 1a. `Views/KidLoginView.swift` (standalone, 2 steps)

Presented from `AuthView` — button copy **"I'm a Kid!"**, icon `figure.child.circle.fill`, a11y id `auth.kidLoginButton` (`AuthView.swift:153-175`). Sheet on compact width, `fullScreenCover` on regular width (iPad; the sheet clipped the Go! button) (`AuthView.swift:48-59`).

Background: `LinearGradient(choreStarPrimary .25, choreStarSecondary .25, choreStarSuccess .25)` topLeading→bottomTrailing, full-bleed (`KidLoginView.swift:35-44`). Content max width 480.

**Prefill / initial step** (`:24-31`): family code = `SupabaseManager.shared.kidLoginCode` ?? `UserDefaults["last_family_code"]` ?? "". Starts at `.pin` if non-empty, else `.familyCode`.

**Header** (`:86-104`): "⭐" at 64pt; title **"Kid Login"** (36pt scaled, bold, rounded); subtitle **"Ask a parent for your family code"** (step 1) / **"Enter your secret PIN"** (step 2).

**Step 1 — family code card** (`:106-146`): TextField placeholder **"Family code"**, 28pt bold monospaced, centered, no autocaps/autocorrect, ASCII keyboard. Sanitizer on every change: `lowercased()`, keep letters+digits only, `prefix(12)`; clears error. Button **"Next"** + `arrow.right.circle.fill`, gradient fill, disabled & 50% opacity while empty.

**Step 2 — PIN card** (`:148-242`):
- Family-code pill (tappable → back to step 1, clears PIN): `house.fill` + code in monospaced bold + `pencil`.
- PIN dots: `max(4, enteredPin.count)` circles, 16pt, filled `choreStarPrimary`, spring animated.
- Keypad: 3 rows of 1-9, then row = `arrow.left.circle.fill` (back to family code, clear PIN) / `0` / `delete.left.fill` (backspace). `NumberButton` = 65pt circle, card background (`ChildAuthView.swift:271-298`).
- `addDigit` (`:244-256`): guard `count < 6 && !isVerifying`; `UIImpactFeedbackGenerator(.light)`; auto-submits at exactly **6** digits.
- **"Go!"** button (checkmark or spinner) appears only at `count >= 4`.

**Verify** (`:258-280`) → `manager.kidLogin(familyCode:pin:)`.
- Error: message shown in red-on-`red.opacity(0.1)` rounded box, PIN cleared, `UINotificationFeedbackGenerator(.error)`.
- Success: persist `UserDefaults["last_family_code"]`, `SoundManager.play(.cheer)`, dismiss.

Footer: **"Back to Parent Login"** + `arrow.left.circle`, `choreStarLink`.

### 1b. PIN verify API — exact contract

`SupabaseManager.verifyPinViaAPI` (`SupabaseManager.swift:330-359`):
```
POST https://chorestar.app/api/child-pin/verify
Content-Type: application/json
{ "familyCode": "<lowercased code>", "pin": "<4-6 digits>" }
```
Response `PinVerifyResponse` (`:305-323`): `{ success: Bool?, child: { id, name, avatar_color?, avatar_url?, avatar_file?, avatar_signed_url? }?, kidToken: String?, error: String? }`.
Error mapping:
- non-HTTP → "Couldn't reach ChoreStar. Check your connection."
- **429** → "Too many tries. Please wait a few minutes and try again."
- status != 200 or `success != true` → `decoded.error` ?? "Incorrect PIN. Try again!"
- throw → "Couldn't reach ChoreStar. Check your connection."

Note: the API matches the PIN against **every child in the family**; the child identity comes back in the response (no name picker in standalone login).

### 1c. Session creation, storage, expiry

`kidLogin` (`:490-532`): builds `KidModeSession` (`Models/Models.swift:158-191`): `childId, childName, avatarColor, avatarUrl, avatarFile, avatarSignedUrl, kidToken, familyCode, expiresAt`.
- **expiresAt = now + 8 hours** (`8 * 60 * 60`, `:511`).
- JSON-encoded into `UserDefaults` key **`"kid_mode_session"`** (`:124, :514-516`).
- Sets `kidModeSession`, `currentChild = session.asChild`, `isChildSession = true`.
- Then, in order: `loadKidModeTheme()`, `loadKidModeRoutines()`, `loadKidModeChores()`, `loadKidModeStats()`, `loadWallet(childId)` (`:525-529`).

`restoreKidModeSession()` (`:535-559`), called first thing in `checkChildSession()` (`:232-236`): decode; if `expiresAt <= now` → delete key, return false; else restore + same 5 loads.

`asChild` builds a minimal `Child` (age 0, random userId, `avatarUrl = avatarSignedUrl ?? avatarUrl`, `avatarPhotoPath = nil`).

### 1d. Parent-device kid login — `Views/ChildAuthView.swift`

Entry: Home toolbar button **"Kid Mode"**, `figure.child.circle.fill`, shown only when some child has a PIN; opens sheet (`DashboardView.swift:352-365`).

Gradient: `choreStarSuccess .3 → choreStarSecondary .3 → choreStarPrimary .3` (note: reverse hue order vs KidLoginView).
Header: `figure.child` 70pt gradient-filled; **"Kids Login"** 36pt; **"Tap your name to continue"**.
Grid of children where `manager.childHasPin(id)` (from `child_pins`), adaptive 150-220pt; each is avatar circle (gradient of `avatarColor` → 70% opacity) with initials + name (`ChildSelectButton :232-269`). Footer **"Parent Login"**.
After selecting: 80pt avatar + name, **"Enter Your PIN"**, identical dot/keypad/auto-submit-at-6/Go! behaviour; back arrow deselects the child.
`authenticateChild(childId:pin:)` (`SupabaseManager.swift:268-303`): requires `kidLoginCode` else → **"Kid login isn't set up yet. Open Settings on chorestar.app to get your family code."**; calls the same verify endpoint; **rejects if the matched child id ≠ the tapped child** → "Incorrect PIN. Try again!"; on success stores `UserDefaults["child_session_id"]` and `["child_session_token"]` (= kidToken ?? random UUID) and sets `currentChild` / `isChildSession`. No sound played here.

### 1e. PIN storage (parent side, for reference)

Table **`child_pins`**: `child_id, pin_hash, pin_salt, failed_attempts, locked_until`. Upsert on conflict `child_id`. Hash = SHA256(`pin + salt`) hex; salt = 32 random bytes hex. PIN must be 4-6 digits, digits only (`:363-413`). `loadChildPins()` selects `child_id` for the family's children (`:435-465`). Family code fetched via `GET /api/kid-login-code` (Bearer parent), also readable from `profiles.kid_login_code` (`:4043-4123`).

### 1f. Sign-out

`signOutChild()` (`:467-484`): removes `child_session_id`, `child_session_token`, `kid_mode_session`; clears `isChildSession`, `currentChild`, `childSession`, `kidModeSession`; and **if no parent is authenticated** also clears `routines` and `completedRoutineIds`. Button: header icon `rectangle.portrait.and.arrow.right` in a white-20% rounded square, a11y label "Sign out" (`ChildMainView.swift:106-116`). No confirmation dialog.

---

## 2. KID DASHBOARD — `Views/ChildMainView.swift`

If `currentChild == nil` → plain text **"No child selected"** (`:347`).

### Theme / background
- Screen wash: `LinearGradient(themeManager.primaryColor .14, secondaryColor .05, choreStarBackground)`, top→bottom, full-bleed (`:63-72`).
- Header block background: `themeManager.gradient` + `ThemeParticleOverlay(glyph:, particleCount: 14, opacity: 0.45)` when the active seasonal theme has a glyph; shadow `accentColor .25, r14, y6` (`:207-218`). `ThemeManager` is observed directly (not via environment) so a standalone kid launch can't crash.

### Sections, in order

**A. Header (on gradient, white type)** (`:77-218`)
1. `Hi, {name}! 👋` — 32pt bold rounded, white.
2. Subtitle, one of three (`:88-100`):
   - vacation today → **"No chores today. Enjoy your break! 🌴"**
   - `!isPerChoreRewardMode && familySettings != nil` → **"Finish ALL your chores to earn {money(dailyRewardCents/100)} today! 🌟"**
   - else (incl. all standalone kid sessions, where `familySettings` is nil) → **"Let's get some chores done!"**
3. Sign-out button (right).
4. **StatBubble row** (4, `onGradient: true` = white 92% card, black .85/.6 ink, 2pt tinted border) (`:122-154`, `StatBubble :411-449`):
   - `checkmark.circle.fill` / completed count / **"Done"** / `choreStarSuccess`
   - `clock.fill` / pending count / **"To Do"** / `choreStarWarning`
   - `star.fill` / `formatMoney(totalEarnings)` / **"Earned"** / `choreStarAccent`
   - `flame.fill` / streak / **"Streak"** / `.orange`
   - Streak source (`:16-22`): standalone → `kidStats?.streak`; parent device → `manager.currentStreak(for:)` (cross-week, schedule- and vacation-aware; the weekly-stats streak was wrong on Sundays).
5. **Badge cabinet button** (white 18% rounded 16) (`:159-204`): `🏆` + **"{earned} of {total} badges"**; second line **"Next: {icon} {name}"** (the unearned badge with the highest progress) or **"You earned them all!"**; chevron. a11y: "{n} of {m} badges earned. Open badges." Opens `AchievementsView(child:)` in a `NavigationStack` sheet with a **"Done"** confirmation-action button.

**B. Scroll body**
1. `KidVacationCard` (only when `isOnVacationToday`) (`:226-233`, struct `:355-409`): 🏖️ 54pt; **"You're on vacation!"** 26pt bold rounded; subtitle **"No chores until {day}."** plus, when streak > 0, **" Your {n}-day streak is safe and waiting for you. 🔥"**. `{day}` = wide weekday name if resume ≤ 6 days out, else "Month Day". `vacationResumeDate` = day after the window's last day.
2. `KidGoalCardView` (`:639-770`) — see §2 Goals below.
3. **Routines** — header **"My Routines"** (title2 bold) shown only if the child has ≥1 active routine; list of `KidRoutineCard` (`:240-261`). Each card gets a `scrollTransition` (opacity 1→0.5, scale 1→0.94).
4. **Pending chores** — header **"Your Chores"**; `BigChoreCard` per chore, same scrollTransition (`:264-283`).
5. **Completed chores** — header **"Completed! 🎉"** in `choreStarSuccess`; `BigChoreCard` per chore (`:286-300`).
6. `KidStoreSection` (`:303`) — see §2 Store below.
7. Empty state when no chores due **and** not on vacation (`:305-321`): `party.popper.fill` 60pt gradient, **"No Chores Yet!"**, **"Check back later"**.

Chore lists come from `manager.dueChores(for:)` — **only chores due today** by `days_of_week`, and **empty on a vacation day** (`SupabaseManager.swift:3324-3328`).

### Ticking — `BigChoreCard` (`:451-627`)

Layout: `ChoreIconChip` (60pt, tinted `chore.color ?? child.avatarColor`) when icon present; name (title3 bold; strikethrough + secondary color when done); description (2 lines); right-hand 40pt circle whose stroke is success / warning / 30%-secondary, containing `checkmark` (done), `clock.fill` (pending), or `camera.fill` (photo chore, untouched).

Tap (`:469-481`): `UIImpactFeedbackGenerator(.heavy)`; if not completed, not pending, and `chore.requiresPhoto` → open camera (`CameraPicker`, rear, no editing) and return; otherwise `await manager.toggleChoreCompletion(chore)`. **No sound on a normal tick** (haptic only).

Sub-rows:
- pending → `hourglass` + **"Waiting for a grown-up"** (bold, `choreStarWarning`)
- not completed + requiresPhoto → `camera.fill` + **"Take a photo to check it off"**
- `proofError` text in `choreStarDanger`
- reward chip **"Earn {money(chore.reward)}"** with `star.fill`, **only in per-chore reward mode** (`:568`) — deliberately hidden on the flat daily rate.

Card styling: gradient card→`success .08` when done; radius 20; border 2pt success .4 / chore color .2; scale 0.98 + spring when done.

Photo proof (`:610-625`): `manager.submitChoreProof(chore:image:)`; on success `SoundManager.play(.success)`.

### `require_approval` behaviour

- `kidTickNeedsApproval(chore)` = `chore.requiresPhoto || familySettings?.requireApproval == true` (`SupabaseManager.swift:2576-2578`).
- **Standalone path** (`toggleChoreViaKidAPI :928-1006`): optimistic tick, then `POST /api/kid/chores/toggle`. If the response body is `{ "status": "pending" }` the tick is **moved out of** `weekCompletions`/`choreCompletions` and **into** `pendingCompletions` → card shows the clock + "Waiting for a grown-up" and earns nothing. Failures revert the optimistic flip. Afterwards `loadKidModeStats()` runs in the background.
- **Parent-device kid path** (`toggleChoreCompletion :2584-2765`): writes `chore_completions` directly; when `isChildSession && kidTickNeedsApproval` it sets `status = "pending"` on the inserted row and returns early — **no achievement check, no parent push**. A parent tapping an already-pending chore **approves** it (`approveCompletion(id:)`); a kid tapping one **deletes** the pending row (un-tick) (`:2604-2620`).
- Photo proof always lands as pending (`submitChoreProof` appends to `pendingCompletions`, `:1549-1552`).
- Pending completions are excluded everywhere from earnings, streaks and achievement history (`status != "pending"` filters at `:801`, `:901`, `:3954`).

### Celebrations on the kid dashboard

- **Perfect Day overlay** (`:331-345`): fires when `pendingChores.count` goes `1 → 0` and the day had chores. `PerfectDayOverlay` (`Theme/DesignSystem.swift:405-470`): black 35% scrim (tap to dismiss), 🌟 84pt with spring scale+rotate, **"Perfect Day!"** (36pt heavy), **"Every chore for today is done."**, a `ShareLink` **"Share this win"** (message: "Perfect day! Every chore in our house got done today, thanks to ChoreStar. Free on the App Store."). On appear: `Haptics.success()` + `SoundManager.play(.cheer)`; **auto-dismiss after 6s** unless the share button was tapped. The rating prompt is parent-side only, never in kid mode.
- **Confetti**: NOT on the kid dashboard. Only `RoutineCelebrationView` (themed palette) and the parent `DashboardView`/`WeekCalendarView` `.confetti(isPresented:)`.
- Sounds in kid mode: `.cheer` on kid-login success and Perfect Day; `.success` on photo-proof success, goal saved, goal reached (once per goal, keyed `UserDefaults["goalCelebrated:<goalId>"]`), and store request sent; `.success` on every routine step; `.cheer` on routine celebration.

### Goals card (`KidGoalCardView :639-770`)

With a goal: emoji (default 🎯), label **"SAVING FOR"**, title, pencil button (a11y "Change goal"); progress capsule (theme gradient, or `choreStarWarningGradient` when reached; min width 14 when >0%); `{progress} of {target}` + right side **"You did it! 🎉"** / **"{remaining} to go"**; when reached, a warning-tinted note **"Ask a grown-up to pay it out and pick your next goal!"**. Without a goal: `target` tile + **"What are you saving for?"** / **"You have {balance}. Pick a goal and watch the bar fill up."**. Footer **"🏆 1 goal reached"** / **"🏆 {n} goals reached"**. Reloads wallet via `.task(id: manager.weekCompletions.count)`.

`GoalEditorSheet` (`:773-935`): emoji grid `🧱 🎮 🧸 📚 ⚽ 🎨 🚲 🎧 👟 🐶 🎁 💰` (default 🧱); sections **"Pick a picture"**, **"What is it?"** (placeholder "A Lego set, a scooter, a book..."), **"How much?"** with presets 500/1000/2000/5000 cents and a custom decimal field ("or type an amount", clamped to 50 000 cents); buttons **"Remove goal"**, **"Start saving!"** / **"Save changes"** (disabled when title blank or cents < 100); titles **"Pick a goal"** / **"Change your goal"**, **"Cancel"**.

### Reward store (`KidStoreSection :938-1055`)

Header `Label("Reward Store", systemImage: "bag.fill")` + **"{balance} to spend"**. 2-column grid; each item: emoji (default 🎁, desaturated when unaffordable), title, price, then either `Label("Asked!", systemImage: "clock.fill")` + **"Never mind"**, or **"Get it!"** button, or **"{shortBy} more"**. Confirm alert: title `"{emoji} {title}"`, message **"Spend {price} of your {balance}? A grown-up will say yes or no."**, buttons **"Yes, please!"** / **"Not now"**. On success: `.success` sound + `Haptics.success()` + notice **"Asked! A grown-up will say yes or no to {title}."**

---

## 3. ROUTINES

### 3a. Data model — `Models/Routine.swift`

**Table `routines`** (`RoutineRow :156-167`, create at `:4560-4586`):
`id uuid, child_id uuid, name text, type text, icon text?, color text?, reward_cents int?, is_active bool?, created_at, updated_at`.
Decode defaults: `icon → "list.bullet"`, `color → "#6366f1"`, `reward_cents → 7`, `is_active → true` (`:36-39`).

**Table `routine_steps`** (`RoutineStepRow :169-178`):
`id uuid, routine_id uuid, title text, description text?, icon text?, order_index int?, duration_seconds int?, created_at`.
Defaults: `icon → "circle"`, `order_index → 0`, duration nullable. Ordering: `.order("order_index", ascending: true)` (`:4482`); on write `order_index` = array index (`:4602`).

**Table `routine_completions`** (`RoutineCompletionRow :180-190`):
`id, routine_id, child_id, completed_at, duration_seconds, steps_completed, steps_total, points_earned, date (yyyy-MM-dd)`. **Unique index on (routine_id, child_id, date)** — Postgres `23505` is caught and treated as "already done today" (`:4773-4780`).

**`RoutineType`** (`:192-233`) — 4 cases, each with display name, emoji, SF Symbol, default hex:

| raw | display | emoji | systemImage | defaultColor |
|---|---|---|---|---|
| `morning` | Morning | 🌅 | `sunrise.fill` | `#f59e0b` |
| `bedtime` | Bedtime | 🌙 | `moon.stars.fill` | `#8b5cf6` |
| `afterschool` | After School | 🎒 | `backpack.fill` | `#10b981` |
| `custom` | Custom | ⭐ | `star.fill` | `#6366f1` |

**Localization of template strings** (`:292-320`): template-created routines store **English** names/step titles as data. `RoutineTemplate.localizedName()` / `localizedStepTitle()` localize only titles in the known set at display time; anything a parent typed renders verbatim. The step-title set is the union of iOS templates and the **web** template titles (`:305-310`): "Wake Up", "Make Bed", "Wash Face", "Put On Shoes", "Put Away Toys", "Take Bath", "Put On Pajamas", "Read Bedtime Story", "Hugs & Kisses", "Lights Out", "Put Away Backpack", "Play Outside", "Brush Hair".

### 3b. Parent list — `Views/RoutinesListView.swift`

Lives in the Chores tab's segmented picker as the **Routines** segment (`ChoresView.swift:180-182`).
- Horizontal filter chips: **All / Morning / Bedtime / After School / Custom** (selected = `choreStarFill` pill, white text) (`:10-70`).
- Grouped by child (only children with matching routines): avatar circle + initials, child name, count chip. Adaptive grid 330-560pt (`:77-140`).
- `RoutineCardView` per routine; `contextMenu` **Edit** (`pencil`) / **Delete** (`trash`, destructive → `manager.deleteRoutine`).
- FAB bottom-trailing, 56pt `choreStarFill` circle with `plus`, opening a Menu: **"Build Your Own"** (`square.and.pencil`) and **"Starter Routines"** (`sparkles`).
- Empty state (`:186-231`): `repeat.circle.fill` 60pt; **"No routines yet"**; **"Create a morning or bedtime routine\nthat your kids can run on their own."**; primary button **"Try a Starter Routine"** (`sparkles`); secondary link **"Build Your Own"** (`plus.circle.fill`).

### 3c. Cards — `Views/RoutineCardView.swift`

**`RoutineCardView` (parent, :3-118)**: 52pt rounded-14 tile of `color.opacity(0.15)` with `AdaptiveIcon(icon, fallback: type symbol, iconSize: 28)`; localized name (headline bold); `Label(typeDisplayName, type symbol)` · **"{n} steps"**; right side `star.fill` + `formatMoney(rewardCents/100)` and the child's name. Below a divider, a horizontal strip of the **first 5** steps as numbered chips, then **"+{n} more"**. Radius 16, 1pt border of `color .2`.

**`KidRoutineCard` (:120-205)**: 60pt icon tile (iconSize 32); localized name (title3 bold); **"{n} steps · {typeDisplayName}"**; right side is either `play.circle.fill` 40pt in the routine color, or (done today) `checkmark.circle.fill` 36pt + **"Done!"** in success green. When not done, a reward chip **"Earn {money}"**. Done state: 0.75 opacity, success border, **`.disabled(true)`** — the primary replay guard. `isDoneToday` = `manager.completedRoutineIds.contains(routine.id)`.

`Color.fromHex` helper at `:207-218` (strips `#`, scans 24-bit RGB).

### 3d. Builder — `Views/RoutineBuilderView.swift`

`Form` in a `NavigationStack`. Title **"New Routine"** / **"Edit Routine"**; toolbar **"Cancel"** and **"Create"** / **"Save"** (bold), disabled while `isSaving || name.isEmpty || selectedChildId == nil || steps.isEmpty` (`:60-72`).

Sections:
1. **"Quick Start Templates"** — only when creating (`:99-128`). Adaptive grid 150-260 of the 4 `RoutineTemplate`s; tapping applies name, type, icon, `type.defaultColor` and replaces steps (`applyTemplate :286-300`).
2. **"Routine Details"** (`:132-207`):
   - TextField **"Routine Name"**
   - Picker **"Assign To"** (children)
   - Picker **"Type"** (4 `RoutineType` with symbol labels). **onChange resets `selectedColor = type.defaultColor` and `selectedIcon = type.systemImage`** (`:148-151`).
   - **"Icon"** grid, 8 columns, 24 SF Symbols (`:28-35`): `sunrise.fill, moon.stars.fill, backpack.fill, star.fill, hands.sparkles.fill, fork.knife, book.fill, figure.walk, mouth.fill, tshirt.fill, shower.fill, bed.double.fill, gamecontroller.fill, music.note, paintbrush.fill, pencil, trash.fill, leaf.fill, heart.fill, bolt.fill, clock.fill, bell.fill, house.fill, car.fill`. Selected = white glyph on `choreStarFill`.
   - **"Color"** row, 8 hexes (`:37-40`): `#f59e0b, #8b5cf6, #10b981, #6366f1, #ef4444, #ec4899, #14b8a6, #f97316`. Selected = 3pt white ring.
   - Stepper **"Reward: {cents}¢ (${dollars})"**, range **1…100 cents**, default **7**.
3. **"Steps ({count})"** (`:212-282`): empty state `list.number` + **"Add at least one step"**. Each row = numbered circle in the routine color, editable **"Step title"** TextField, the step's icon via `AdaptiveIcon`, **"{n} min"** when duration > 0, and a `Stepper` **0…60 minutes** (0 ⇒ nil, no timer). Rows support `.onDelete` and `.onMove` (reorder). **"Add Step"** appends `EditableStep(title: "", icon: "📝", durationMinutes: nil)` — note the default new-step icon is the emoji 📝, while template steps carry their own emoji and the DB default is `"circle"`.

Save (`:302-352`): drops steps with an empty title; if none remain → error **"Add at least one step with a title."**; converts minutes → `durationSeconds = minutes * 60`; calls `createRoutine` / `updateRoutine`; failure → **"Failed to save: {error}"**.

**Duration is stored in seconds but edited in whole minutes** — a template's 30s "Wash Hands" becomes `0 min` (nil) if the routine is opened in the builder and saved (`:87`, `:314`).

### 3e. Routines CRUD (parent, direct Supabase)

- `loadRoutines()` (`SupabaseManager.swift:4455-4551`): `routines` where `child_id in (...)` **and `is_active = true`**, ordered `created_at desc`, limit 100; then `routine_steps` for those ids ordered by `order_index asc`; then `routine_completions.select("routine_id")` for those ids where `date == today (yyyy-MM-dd)` → `completedRoutineIds`.
- `createRoutine(...)` (`:4553-4619`): client-generated `id`; insert into `routines` (`id, child_id, name, type, icon, color, reward_cents, is_active: true`); bulk insert steps (`routine_id, title, icon, order_index: index, duration_seconds`); then `loadRoutines()`.
- `updateRoutine(...)` (`:4621-4693`): update `routines` set `name, child_id, type, icon, color, reward_cents, updated_at (ISO8601)` where `id`; **delete all `routine_steps` for the routine and re-insert** (step ids are not preserved); reload.
- `deleteRoutine(...)` (`:4695-4719`): delete steps, then the routine (hard delete, not `is_active = false`); reload.

### 3f. Kid-mode routines over the API

- `loadKidModeRoutines()` (`:1008-1070`): `GET /api/routines?childId=<lowercased uuid>` with `Authorization: Bearer <kidToken>`. Response is an **array** of routine rows that embed `routine_steps: [...]` and a server-computed **`completedToday: Bool`** → seeds `completedRoutineIds` (`:1058`). Same field defaults as the DB decode.
- `completeRoutineViaAPI` (`:1073-1104`):
```
POST https://chorestar.app/api/routines/<routineId lowercased>/complete
Authorization: Bearer <kidToken>
Content-Type: application/json
{ "childId": "<uuid lowercased>", "stepsCompleted": n, "stepsTotal": m, "durationSeconds": s }
```
Any non-2xx → user-facing **"Couldn't save your routine. Check your connection."**

### 3g. Player — `Views/RoutinePlayerView.swift`

Presented as `fullScreenCover(item: $activeRoutine)` from the kid dashboard (`ChildMainView.swift:328-330`).

- Background: `LinearGradient(routineColor .1 → choreStarBackground)` top→bottom.
- Header card (`:80-138`): `xmark.circle.fill` close (dismiss — **abandoning mid-routine saves nothing**), localized routine name, **"Step {i+1}/{total}"**; progress dots (current one 12pt, others 8pt); a 6pt progress bar where `progress = currentStepIndex / steps.count` (so it reads 0% on step 1 and never reaches 100% before the celebration).
- Step content (`:142-176`): 120pt circle of `routineColor .15` with `AdaptiveIcon(step.icon, fallback: "checkmark.circle.fill", iconSize: 56)`; localized step title 28pt bold rounded; optional description; timer.
- Timer (`:180-208, :259-275`): only when `durationSeconds > 0`. `Timer.scheduledTimer(1s, repeats)` counts down; 80pt ring trimmed to `1 - remaining/total`, `mm:ss` monospaced label, caption **"Time remaining"** → **"Time's up!"** at 0. The timer is **purely advisory**: it never auto-advances, never blocks, and hitting 0 changes nothing but the label. Invalidated on step change and `onDisappear`.
- Action button (`:212-233`): single full-width button in the routine color — **"Done!"**, or **"All Done!"** with `checkmark.circle.fill` on the last step. **There is no Skip, no Back, and no per-step un-do.**
- `completeStep()` (`:237-257`): heavy haptic + `SoundManager.play(.success)`; invalidate timer; if not last → `currentStepIndex += 1` (spring), restart timer, `RoutineActivityController.update(stepIndex:step:)`; else → `RoutineActivityController.end()` and `showCelebration = true`.
- `onAppear`: `startTime = Date()`, start the timer, and `RoutineActivityController.start(routine:childName:)` with the child name resolved from `children` → `currentChild` → `"Kid"`.

**`Managers/RoutineActivityController.swift` (summary)**: `@MainActor` singleton wrapping ActivityKit for a Live Activity (Dynamic Island + lock screen). No-op below iOS 16.2 or when activities are disabled. `start` ends any existing activity first, then requests one with `RoutineActivityAttributes(routineName, childName, totalSteps, accentHex: ThemeManager.shared.accentHex)` and a `ContentState(stepIndex, stepTitle, stepEndDate = now + durationSeconds)`. `update` pushes the same state shape for a new step. `end` dismisses immediately. All failures are swallowed. **Android equivalent: an ongoing notification with step progress + chronometer.**

### 3h. Celebration — `Views/RoutineCelebrationView.swift`

Replaces the player content inline (`RoutinePlayerView.swift:32-38`), passing `stepsCompleted = routine.steps.count` and `durationSeconds = now - startTime`.

- Background: `LinearGradient(theme.primary .12, theme.secondary .10)`; `ConfettiView(palette: [theme.primary, theme.secondary, theme.accent, .choreStarAccent, .white])`.
- `star.fill` 80pt with accent→primary gradient, spring in (delay 0.2).
- **"Routine Complete!"** 32pt bold rounded, then one random encouraging line (`:22-32`): **"Amazing job! You're a superstar!"**, **"Way to go! Keep up the great work!"**, **"Fantastic! You crushed it!"**, **"Incredible! You're on fire!"**, **"Awesome! Your parents will be so proud!"**, **"You did it! High five!"** (delay 0.4).
- Three stat cards (delay 0.6): `checkmark.circle.fill` **"{done}/{total}"** / **"Steps"**; `clock.fill` **"{m}m {s}s"** or **"{s}s"** / **"Time"**; `star.fill` **"{money(points/100)}"** / **"Earned"**.
- Button **"Back to Home"** with `house.fill` on the theme gradient (delay 0.8) → `dismiss()`.
- `onAppear` (`:129-152`): `SoundManager.play(.cheer)`; **double-write guard `@State private var saved`** — `completeRoutine(...)` is called exactly once per view instance; failure sets `manager.debugLastError = "Failed to save routine completion: …"` and shows nothing to the kid.

### 3i. Routine completion & points

`completeRoutine(routineId:childId:stepsCompleted:stepsTotal:durationSeconds:)` (`:4721-4787`):
- **Points rule: `pointsEarned = (stepsCompleted == stepsTotal) ? routine.rewardCents : 0`** — all-or-nothing. (`RoutineCelebrationView` computes the same for display at `:18-20`.) In practice the player only reaches the celebration after every step, so it is always the full reward.
- Standalone kid → `completeRoutineViaAPI`, then insert the id into `completedRoutineIds`.
- Parent device → insert into `routine_completions` with `date = today (yyyy-MM-dd)`; on `PostgrestError.code == "23505"` (unique index) it swallows the error and still marks it done locally. Then `completedRoutineIds.insert(routineId)`.

Replay guards, three layers: `KidRoutineCard.disabled(isDoneToday)`, the `saved` flag in the celebration view, and the DB unique index on `(routine_id, child_id, date)`.

### 3j. Starter routines

**`RoutineTemplate.all`** (`Models/Routine.swift:235-290`) — 4 templates, all created with **`rewardCents: 7`** and `color = type.defaultColor` (`StarterRoutinesView.swift:186-194`):

| Template | type | icon | Steps (title, icon, duration) |
|---|---|---|---|
| **Morning Routine** | morning | 🌟 | Wake Up & Stretch 🌟 60s · Brush Teeth 🪥 120s · Get Dressed 👕 180s · Eat Breakfast 🍽️ 600s · Pack Backpack 🎒 120s |
| **Bedtime Routine** | bedtime | 🌙 | Take a Bath/Shower 🚿 600s · Brush Teeth 🪥 120s · Put on Pajamas 👕 120s · Read a Book 📖 600s · Lights Out 💡 (no timer) |
| **After School Routine** | afterschool | 🎒 | Unpack Backpack 🎒 120s · Have a Snack 🥨 300s · Do Homework 📚 1800s · Free Time 🎮 (no timer) |
| **Quick Hygiene** | custom | 🧼 | Wash Hands 🧼 30s · Brush Teeth 🪥 120s · Comb Hair 💇 60s |

**`Views/StarterRoutinesView.swift`**: NavigationStack titled **"Starter Routines"**, toolbar **"Done"**, grouped background.
- No children → `figure.2.and.child.holdinghands` + **"Add a child first"** + **"Routines belong to a kid. Add one on the Family tab, then come back here."**
- Child picker: header **"Who are these for?"**, horizontal capsules (avatar dot + name; selected = `choreStarFill`/white). Switching child clears the `added` set.
- Each template card: icon tile, name, **"{n} steps · {typeDisplayName}"**, an **"Add"** → **"Added"** pill (checkmark, green tint; disabled once added or while saving, spinner while saving), then the full numbered step list with per-step icon and a right-aligned duration rendered **"{n} min"** when ≥ 60s else **"{n} sec"**.
- Success: `UINotificationFeedbackGenerator(.success)`. Failure: **"Couldn't add {template}: {error}"**. The `added` set is per-visit only (no dedupe against existing routines).

---

## 4. ACHIEVEMENTS

### 4a. Badge catalogue — `Models/Achievements.swift:93-148`

`id` doubles as `badge_type`. Mirrors web `lib/constants/achievements.ts`.

| # | id | name | description (user-facing) | icon | rarity | requirement |
|---|---|---|---|---|---|---|
| 1 | `first_steps` | First Steps | Complete your first chore | 👶 | common | `.firstChore` (1 completion) |
| 2 | `week_warrior` | Week Warrior | Complete all chores for a full week | ⚔️ | rare | `.weekComplete` |
| 3 | `streak_master` | Streak Master | Maintain a 10-day streak | 🔥 | epic | `.streak(days: 10)` |
| 4 | `perfect_week` | Perfect Week | Complete every single chore for a week | ⭐ | legendary | `.weekComplete` (same rule as #2 — both unlock together) |
| 5 | `family_helper` | Family Helper | Complete 50 household chores | 🏠 | rare | `.categoryCount(.household, 50)` |
| 6 | `little_scholar` | Little Scholar | Complete 25 learning activities | 📚 | rare | `.categoryCount(.learning, 25)` |
| 7 | `creative_artist` | Creative Artist | Complete 20 creative activities | 🎨 | rare | `.categoryCount(.creative, 20)` |
| 8 | `young_athlete` | Young Athlete | Complete 30 physical activities | 🏃 | rare | `.categoryCount(.physical, 30)` |
| 9 | `chore_champion` | Chore Champion | Complete 100 total chores | 🏆 | epic | `.totalCount(100)` |
| 10 | `super_star` | Super Star | Complete 250 total chores | 🌟 | legendary | `.totalCount(250)` |

**Rarity** (`:6-51`): `common` gray / `rare` blue / `epic` purple / `legendary` yellow→orange gradient; labels **"Common" / "Rare" / "Epic" / "Legendary"**; sortOrder 0/1/2/3.

**Category matching** (`AchievementCategory.matches`, `:63-82`) — lowercased `chore.category` against:
- household: `household, household_chores, bedroom, kitchen, bathroom, general, outdoor, pets`
- learning: `learning, learning_education, homework, reading`
- creative: `creative, creative_time`
- physical: `physical, physical_activity, games_play`

### 4b. Evaluation — `AchievementEngine.progress` (`:171-236`)

Inputs: child's chores, `allTimeCompletions` (pending excluded), persisted `earnedBadges`, `isVacationDay` closure. Per definition it computes `(current, required)`:
- `.firstChore` → `(min(count,1), 1)`
- `.totalCount(n)` → `(count, n)`
- `.weekComplete` → group completions by `weekStart`; a week qualifies when its distinct `dayOfWeek` count ≥ `max(1, ChoreSchedule.dueDayCount(childChores))` — i.e. a weekdays-only list needs 5 days, not 7. Result `(hasFullWeek ? 1 : 0, 1)`.
- `.streak(d)` → `(currentStreak(completions, isVacationDay:), d)`
- `.categoryCount(c, n)` → completions whose chore matches the category.

`earned = persistedBadgeExists || ratio >= 1.0` — **so the UI shows a badge as earned before it is ever written to the DB**. Sort: earned first, then progress desc, then rarity asc (`:231-235`).

`currentStreak` (`:244-270`): counts back from today over at most 400 days; a **vacation day is skipped** (run carries); an incomplete **today** doesn't break the run (only `i > 0` breaks).

### 4c. Table & awarding

**Table `achievement_badges`**: `id uuid, child_id uuid, badge_type text, badge_name text, badge_description text, badge_icon text, earned_at timestamptz` (`Models/Models.swift:193-210`, `AchievementBadgeRow`).

**Awarding is client-side, not server-side** (`SupabaseManager.checkAndAwardAchievements :3986-4035`):
1. Compute `achievementProgress(for: childId)`.
2. Take `earned && !alreadyPersisted(badgeType)`.
3. For each, INSERT into `achievement_badges` with `child_id, badge_type: definition.id, badge_name, badge_description, badge_icon` (server fills `id` and `earned_at`). Per-row errors are swallowed into `debugLastError`.
4. `loadAchievements()`, then return the newly persisted rows for the celebration UI.

**Called from exactly one place**: the parent-path `toggleChoreCompletion` when the tick is for **today** and **not** pending (`:2730-2734`). Consequences to replicate or deliberately fix in the port:
- A **standalone kid session never awards badges** — `toggleChoreViaKidAPI` returns `[]` and no insert happens. The kid still *sees* progress/earned states because the engine's `ratio >= 1.0` branch runs client-side; persistence only happens later when a parent ticks something. (`/api/kid/stats` returns `earnedBadges`, so the server may also award — the iOS client does not.)
- Approval-mode / photo ticks return early and never award.
- Returned `[Achievement]` surfaces as the parent Home alert **"Achievement unlocked"** with body `"{badgeIcon} {badgeName}\n{badgeDescription}"` and an **"OK"** button (`DashboardView.swift:394-400`).

**Loading**: parent → `loadAchievements()` selects `achievement_badges` where `child_id in (...)` ordered `earned_at desc` (`:3879-3919`); history → `loadAllTimeCompletions()` selects `chore_completions(chore_id, week_start, day_of_week, status)`, limit 10000, dropping `status == "pending"`, reconstructing the date as `week_start + day_of_week` (`:3923-3972`). Standalone kid → `loadKidModeStats()` fills both `allTimeCompletions` and `achievements` from `/api/kid/stats` so the same engine works unchanged (`:774-830`).

### 4d. Screen — `Views/AchievementsView.swift`

Shown to **both** audiences:
- **Parent**: `ChildDetailView.swift:109` — a `NavigationLink` wrapping the **"Badges"** `StatCard` (`trophy.fill`, value = count of persisted badges, `choreStarWarning`).
- **Kid**: the badge-cabinet button on the kid dashboard, presented as a sheet with a "Done" button (`ChildMainView.swift:159-204`). Identical content for both.

Layout: `trophy.fill` 48pt accent; **"{child}'s Achievements"** (display 28 bold); **"{earned} of 10 badges earned"**; adaptive grid 260-400 of `AchievementProgressCard`; nav title **"Achievements"** (inline).

`AchievementProgressCard` (`:52-143`): 64pt circle filled with the rarity gradient when earned, else `choreStarBackground`; the emoji at 32pt, **opacity 0.4 + saturation 0 when locked**. Name (headline bold, 1 line) + rarity pill (caption2 bold white on the rarity gradient); description (caption, 2 lines). Earned → `checkmark.circle.fill` + **"Earned {medium date}"** (or just **"Earned"** when no date) in success green. Locked → a 6pt rarity-gradient capsule progress bar (min width 4) + caption2 **"{current}/{required}"**. Card radius 16, 1.5pt rarity border at 45% when earned, opacity 0.92 when locked.

---

## 5. Supporting pieces the port needs

**`Managers/SoundManager.swift`** — 4 cues, **synthesized at launch** (no audio assets): 16-bit mono 44.1 kHz WAV rendered into `AVAudioPlayer`s, audio session `.ambient` (mixes with other audio), toggle persisted at `UserDefaults["soundEnabled"]` (default true).

| cue | timbre | played when |
|---|---|---|
| `.pop` | single C5 pluck, 0.16s | UI taps: Settings row `SettingsView.swift:658`, child added `ChildrenView.swift:56` |
| `.success` | C6→E6 chime | every routine step (`RoutinePlayerView.swift:240`); photo proof accepted (`ChildMainView.swift:617`); goal saved (`:907`); goal reached, once per goal (`:760`); store request sent (`:1043`); parent chore ticks (`WeekCalendarView.swift:482,609,837`, `ChoresView.swift:459,645`, `DashboardView.swift:549`) |
| `.coin` | G6 + G5 sparkle | **defined but never played** |
| `.cheer` | C5-E5-G5-C6 arpeggio + E6/G6 sparkle | kid login success (`KidLoginView.swift:274`); routine celebration (`RoutineCelebrationView.swift:132`); Perfect Day overlay (`DesignSystem.swift:462`); Settings sound test (`SettingsView.swift:135`) |

A plain kid chore tick plays **no sound** — heavy haptic only.

**`Views/ConfettiView.swift`** — 60 pieces, shapes circle/square/triangle/star, size 8-16pt, all spawned at `width/2 ± 50`, `y = -20`; each animates with `easeOut`, delay 0-0.3s, duration 1.5-2.5s, horizontal drift ±100, rotation +360…720°, fading to 0. Default palette `[choreStarPrimary, choreStarSuccess, choreStarAccent, .pink, .yellow, .purple, .cyan]`; kid routine celebration passes the theme palette. `.confetti(isPresented:)` modifier auto-dismisses after 2.5s. `allowsHitTesting(false)`.

**`AdaptiveIcon`** (`Theme/DesignSystem.swift:221-252`) — the icon-rendering rule used everywhere in routines: if `iconSize` is set and the string maps to a bundled OpenMoji asset (`Assets.xcassets/ChoreIcons/<codepoint>`), render that template image tinted; else if the first scalar is a non-ASCII emoji, render the emoji as text; else if it is a valid SF Symbol name, render that tinted; else the fallback symbol. **Android port: icon strings are a mix of emoji and SF Symbol names**, so you need an SF-Symbol→drawable map plus the OpenMoji asset set.

**Kid API surface (complete list)**

| Endpoint | Method | Auth | Payload / query | Used by |
|---|---|---|---|---|
| `/api/child-pin/verify` | POST | none | `{familyCode, pin}` | `verifyPinViaAPI :331` |
| `/api/kid-login-code` | GET | parent Bearer | — | `:4049` |
| `/api/kid/child` | GET | kid Bearer | — → `{theme}` | `loadKidModeTheme :572` |
| `/api/kid/stats` | GET | kid Bearer | `?weekStart=&dayOfWeek=` | `loadKidModeStats :777` |
| `/api/kid/chores` | GET | kid Bearer | `?weekStart=` → `{chores, completions}` | `loadKidModeChores :859` |
| `/api/kid/chores/toggle` | POST | kid Bearer | `{choreId, dayOfWeek, weekStart, completed}` → `{status}` | `:943` |
| `/api/kid/chores/proof` | POST | kid **or** parent Bearer | multipart: `choreId, dayOfWeek, weekStart, file(proof.jpg)` | `submitChoreProof :1510` |
| `/api/kid/wallet` | GET | kid, or parent + `?childId=` | — | `loadWallet :1616` |
| `/api/kid/goals` | POST / PATCH | same | `{title, targetCents, emoji?}` / `{goalId, title, targetCents, emoji?}` or `{goalId, action:"archive"}` | `:1651, :1662, :1672` |
| `/api/kid/store/redeem` | POST | same | `{itemId}` or `{redemptionId, action:"cancel"}` | `:1680, :1690` |
| `/api/routines` | GET | kid Bearer | `?childId=` → `[{…, routine_steps[], completedToday}]` | `loadKidModeRoutines :1011` |
| `/api/routines/{id}/complete` | POST | kid Bearer | `{childId, stepsCompleted, stepsTotal, durationSeconds}` | `:1078` |
| `/api/chores/pending` | GET | parent Bearer | parent approval tray + redemptions | `PendingApproval/PendingRedemption :637-712` |

`kidAPI(path:method:childId:body:)` (`:1585-1612`) is the shared helper: kid token when present, otherwise the parent JWT **plus `childId`** added as a query item (GET) or into the JSON body (non-GET). All UUIDs are sent **lowercased**.

**Week convention**: `SupabaseManager.kidWeekStartString()` (`:836-844`) computes the family's local **Sunday** explicitly (`weekday - 1` days back) rather than via `.yearForWeekOfYear`, which follows device locale and lands on Monday in much of the world. `dayOfWeek` is 0-indexed from Sunday. (Note `toggleChoreCompletion`'s parent path at `:2627` still uses `yearForWeekOfYear` — a pre-existing inconsistency worth not replicating.)

## 6. Gotchas worth carrying into the Android port
1. **Standalone kid sessions never persist achievement badges** (§4c) — the UI computes "earned" locally while the DB row only appears after a parent tick.
2. `week_warrior` and `perfect_week` share `.weekComplete`, so they always unlock simultaneously despite different copy and rarity.
3. The player's progress bar uses `index / count`, so it shows 0% on step 1 and never 100%.
4. Step durations round-trip through whole minutes in the builder, silently destroying sub-minute template timers (30s "Wash Hands" → none).
5. `updateRoutine` deletes and re-inserts all steps, so step ids are not stable across edits.
6. `familySettings` is nil in standalone kid sessions → the flat-rate banner and `requireApproval` are unknown client-side; the server decides approval and reports it via the toggle response's `status` field.
7. Kid session expiry is **8 hours**, checked only at restore time — an open app is never kicked out mid-session.
