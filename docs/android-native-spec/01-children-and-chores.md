<!-- Extracted from an iOS code survey on 2026-09-20; the source of truth is the Swift code it cites. -->

# ChoreStar iOS — CHILD & CHORE editing spec (for Android port)

All paths relative to `/Users/bensiegel/family-chore-chart/ChoreStar-iOS/ChoreStar/`.

---

## 1. CHILD

### 1.1 Add/Edit form — `Views/AddEditChildView.swift`
One `Form` inside a `NavigationStack`. Title: `"Add Child"` (new) / `"Edit Child"` (edit), inline display mode.

**Sections, in order:**

| Section header | Contents |
|---|---|
| `"Avatar"` | 100pt circular preview + button `"Choose Avatar"` (SF symbol `photo.circle.fill`) |
| `"Child Information"` | `"Name"` label + `TextField` placeholder `"Enter name"`; `"Age"` label + `Stepper("\(age) years old", in: 1...18)` |
| `"Avatar Color"` | `LazyVGrid(adaptive minimum 60)` of 16 color swatches (50pt circles, gradient color→color@0.7, checkmark when selected) |
| `"Kid Login"` *(edit mode only)* | `Toggle("Enable Kid Login")`; when on: label `"PIN (4-6 digits)"`, `SecureField`, numberPad |
| *(unnamed)* | error text in red, `.caption`, `"Error: \(error.localizedDescription)"` |

**Fields / state (AddEditChildView.swift:9–21):**
- `name: String` — default `""` / existing name
- `age: Int` — default **5**, range 1...18
- `selectedColor: String` — default `"blue"`
- `avatarUrl: String?`, `avatarFile: String?`, `avatarPhotoPath: String?`
- `childAccessEnabled: Bool` — initialised from `SupabaseManager.shared.childHasPin(child.id)`
- `childPin: String` — `""`

**Color palette (AddEditChildView.swift:23–27), exactly 16 values in this order:**
`red, blue, green, orange, purple, pink, yellow, teal, indigo, mint, cyan, brown, coral, turquoise, rose, emerald`

Resolution (`Theme/Colors.swift` `Color.fromString`): a hex string is used directly if parseable; otherwise named lookup. System colors: red/blue/green/orange/purple/pink/yellow/teal/indigo/mint/cyan/brown/gray = SwiftUI system colors. Custom RGB (0–1 floats):
- `coral` (1.0, 0.5, 0.31) → #FF804F
- `turquoise` (0.25, 0.88, 0.82) → #40E0D1
- `rose` (1.0, 0.0, 0.5) → #FF0080
- `emerald` (0.31, 0.78, 0.47) → #4FC778
- (also available but not in the child palette: lime, magenta, lavender, peach, sky, gold, navy, maroon, olive, aqua, violet, salmon)
- **Unknown → `blue`.**

**Validation:**
- Save/Add button disabled when `name.isEmpty || isSaving`. No trimming on child name (unlike chore name).
- Age constrained by Stepper only (1…18).
- PIN field: `onChange` filters to digits and truncates to 6 → `String(newValue.filter(\.isNumber).prefix(6))`.
- PIN save rules (AddEditChildView.swift:270–279):
  - toggle ON + `childPin.count >= 4` → `setChildPin`
  - toggle ON + pin < 4 chars + no pre-existing PIN → throws `"Enter a 4-6 digit PIN to enable kid login"`
  - toggle ON + pin blank + PIN already existed → keep current PIN (no call)
  - toggle OFF + PIN existed → `removeChildPin`
- Premium gate checked **before** save on create only (see §4).

### 1.2 Avatar picker — `Views/AvatarPickerView.swift`
Sheet, title `"Choose Avatar"`, inline. Segmented row of 4 equal-width tabs (AvatarStyle raw values): `"Photo"`, `"Robots"`, `"People"`, `"Emojis"`. Default tab: **Robots**. Toolbar: `"Cancel"` (cancellationAction) and `"Select"` (confirmationAction; disabled until a seed is selected; opacity 0 on the Photo tab).

- **Robots tab** — DiceBear style `bottts`, 20 seeds:
  `Felix, Aneka, Coco, Dusty, Midnight, Patches, Boo, Simba, Lucky, Missy, Snickers, Pumpkin, Charlie, Bella, Max, Luna, Cooper, Daisy, Buddy, Sadie`
- **People tab** — DiceBear style `adventurer`, 20 seeds:
  `Emma, Liam, Olivia, Noah, Ava, Mason, Sophia, Lucas, Mia, Ethan, Isabella, James, Charlotte, Benjamin, Amelia, Elijah, Harper, William, Evelyn, Alexander`
- **Emojis tab** — 30 emoji, stored in `avatar_file`:
  `😀 😎 🤓 🥳 😇 🤩 😊 🙂 😁 😆 🤗 🥰 😍 🤪 😋 😛 🧐 🤠 👽 🤖 🎃 👻 🦄 🐶 🐱 🐼 🐨 🦁 🐯 🐸`

**On "Select"** (AvatarPickerView.swift:142–160): the internal key is `"<style>-<seed>"`. For emoji → `onSelect("", emoji)` (url empty, emoji into `avatarFile`). For DiceBear → `onSelect("https://api.dicebear.com/7.x/\(style)/png?seed=\(seed)&size=200", seed)` — i.e. **avatar_url = PNG URL, avatar_file = the seed string**.
Grid thumbnails use `&size=140`.
`String.convertDiceBearToPNG(size:)` (`Views/AvatarView.swift:3–18`) rewrites any legacy `/svg?` URL to `/png?` and appends `size=` when missing.

**Avatar render resolution order everywhere (`AvatarView.swift:88–175`):** uploaded photo (`avatar_photo_path`, signed URL) → `avatar_url` (DiceBear PNG) → `avatar_file` (emoji on a color-gradient circle) → initials on a color-gradient circle. `Child.initials` = first letter of each space-separated name component, uppercased, first 2 joined (`Models/Models.swift:30`).

### 1.3 Photo upload
`PhotoAvatarPicker` (AvatarPickerView.swift:321) — only available once the child row exists (`childId != nil`); otherwise it shows `"Save this child first, then add a photo from their edit screen."`

Flow: `"Take a Photo"` (UIImagePickerController, front camera, allowsEditing) or `"Choose from Library"` (PhotosPicker, images) → `SupabaseManager.squareAvatarImage` → `AvatarStickerEditor` (title `"Add Some Fun"`, 42 emoji/drawn props, drag/pinch/rotate, buttons `"Cancel"` / `"Use Photo"`) → composite flattened to one image → `uploadChildAvatar`.
Also `"Remove Current Photo"` (destructive) when a photo exists.
Footer copy: `"Stored privately. Only your family can see it, and you can remove it any time."` Progress labels: `"Uploading…"` / `"Removing…"`. Library decode failure: `"That image couldn't be read. Try another."`

**Image processing (`SupabaseManager.swift:1966–2006`):** center square crop (min side), EXIF-normalised by re-rendering, downscale to **512×512**, opaque, scale 1, JPEG quality **0.82**. `avatarCanvasSize == avatarPixelSize == 512`.

**Storage (`SupabaseManager.swift:1929–1955, 2017–2090`):**
- Bucket: **`child-avatars`** — private. (`private static let childAvatarBucket = "child-avatars"`, line 1934)
- Path pattern: `{owner_user_id}/{child_id}/{random_uuid}.jpg`, **all lowercased** (`avatarObjectPath`, line 1954). Owner id is `children.user_id` (family owner), not the signed-in member, else RLS rejects.
- Upload: `client.storage.from("child-avatars").upload(path, data: jpeg, options: FileOptions(contentType: "image/jpeg", upsert: true))` — SupabaseManager.swift:2056
- After upload → `updateChildAvatarPhoto(childId:photoPath:)` writes `children.avatar_photo_path = path`, **`avatar_url = null`**, `updated_at` (SupabaseManager.swift:2092–2140; filter `.eq("id", childId)`). Encoding is explicit so nils are sent as JSON null, not omitted.
- Old object then removed: `storage.from("child-avatars").remove(paths:[previousPath])`, cached signed URL invalidated.
- Display: `signedAvatarURL(for:)` — `createSignedURL(path:expiresIn: 3600)`, cached in-memory keyed by path, refreshed 60s before expiry (SupabaseManager.swift:2172–2197). **`avatar_url` never stores a signed URL.**
- Remove photo (`removeChildAvatarPhoto`, SupabaseManager.swift:2143): update row to null path + null avatar_url, then delete the object. Errors: `"Couldn't remove the photo. Please try again."`
- Upload errors: `"That photo couldn't be processed. Try another one."`, `"Your session expired. Please sign in again."`, release build `"Couldn't upload that photo. Check your connection and try again."` (DEBUG shows raw error).
- **Interaction:** picking a DiceBear/emoji avatar in `updateChild` also retires an existing uploaded photo (nulls `avatar_photo_path` with `keepAvatarUrl: true`, then deletes the object) — SupabaseManager.swift:3683–3697.

### 1.4 PIN flow (exact)
**Set PIN is a DIRECT TABLE UPSERT — no RPC, no web API** (`SupabaseManager.setChildPin`, **SupabaseManager.swift:374–415**):

```
salt  = randomSaltHex()                      // 32 random bytes → 64 lowercase hex chars (line 362)
hash  = SHA256(pin + salt) → 64 lowercase hex chars   // hashPin(), line 367
client.from("child_pins").upsert(row, onConflict: "child_id").execute()
```
Payload (`PinUpsertRow`, SupabaseManager.swift:385):
```json
{ "child_id": "<uuid string>", "pin_hash": "<sha256 hex>", "pin_salt": "<64 hex>",
  "failed_attempts": 0, "locked_until": null }
```
Client-side guard before the write: digits only, length 4–6, and `digitsOnly == pin`, else throws `"PIN must be 4-6 digits"`.
Note: `child_id` is sent as `UUID.uuidString` (UPPERCASE) here — Postgres uuid casts it fine.

**Remove PIN** (`SupabaseManager.swift:416–435`): `client.from("child_pins").delete().eq("child_id", childId.uuidString)`. Local `childIdsWithPin` set updated on both paths; `childHasPin(_:)` reads that published `Set<UUID>` (line 93) and is populated by `loadChildPins()`.

(For contrast: PIN *verification* at kid-login goes through the web API with a bearer token, not this table — error strings `"Couldn't reach ChoreStar. Check your connection."`, `"Too many tries. Please wait a few minutes and try again."`, `"Incorrect PIN. Try again!"` at SupabaseManager.swift:340–358.)

### 1.5 Supabase ops for children (exact)
- **Create — `createChild`, SupabaseManager.swift:3606–3646**
  `client.from("children").insert(NewChildRow)` — columns: `name, age, avatar_color, avatar_url, avatar_file, user_id` (`user_id` = `debugUserId`, the signed-in user). Then `loadRemoteData()`.
  Errors thrown: `"No Supabase client"`, `"No user ID"`.
- **Update — `updateChild`, SupabaseManager.swift:3648–3703**
  `client.from("children").update(ChildUpdate).eq("id", childId.uuidString)` — columns: `name, age, avatar_color, avatar_url, avatar_file, updated_at` (ISO8601). Optionals are *omitted* when nil (synthesized encoder). Then the avatar-photo retirement branch described above. Then `loadRemoteData()`.
- **Delete — `deleteChild`, SupabaseManager.swift:3705–3724**
  `client.from("children").delete().eq("id", childId.uuidString)`. **No client-side cascade** — chores/completions are removed by the DB FK cascade. Then `loadRemoteData()`.
- Table columns read back (`ChildRow`, Models.swift:214): `id, name, age, avatar_color, avatar_url, avatar_file, avatar_photo_path, user_id, created_at, updated_at`.

### 1.6 Delete-child confirmation — `Views/ChildrenView.swift:208–217`
- Alert title: `"Delete \(child.name)?"`
- Message: `"This will also delete all of \(child.name)'s chores. This action cannot be undone."`
- Buttons: `"Cancel"` (cancel role), `"Delete"` (destructive)
- Triggered from the card's context menu: `"Edit"` (pencil) / `"Delete"` (trash). Errors are swallowed (`try?`).

### 1.7 Family list screen — `Views/ChildrenView.swift`
Nav title `"Family"` (large). Header: `"Family Members"` + `"Manage your family and track their progress"`. Toolbar `+` button, accessibility label `"Add Child"`, identifier `family.addChildButton`. Grid `adaptive(min 165, max 260)`.
Card contents: avatar (80pt) with a pencil overlay button, name, `"Age \(child.age)"`, ring progress `completed/total` of **today's due chores**, earnings pill (`manager.formatMoney(calculateTodayEarnings)`), and an unpaid pill `"\(money) unpaid"` when `wallet.owedCents > 0`.
Empty state: icon `figure.2.and.child.holdinghands`, `"No family members yet"`, `"Tap the + button to add your first child."`

---

## 2. CHILD DETAIL screen — `Views/ChildDetailView.swift`
Pushed from `ContentView.swift:390`, `DashboardView.swift:180`, `GettingStartedCard.swift:96`. Empty nav title, inline.

**Sections top→bottom:**
1. Header: 100pt gradient circle with **initials only** (this screen does not use `AvatarView`), name in display font 32, `"Age \(child.age)"`.
2. Four stat cards in an HStack: `"Completed"` (count of today's done, green), `"Pending"` (today's not-done, warning), `"Earned"` (`formatMoney(calculateTodayEarnings)`, accent), `"Badges"` (achievement count, trophy) — the Badges card is a `NavigationLink` to `AchievementsView(child:)`.
3. `"Today's Progress"` card: percent label + animated bar tinted with `child.avatarColor`; percentage = completedToday / dueToday.
4. `ParentGoalSection` (allowance/goal/payout) — header `"Allowance"`, right side `"\(money) owed"` or `"All paid up"`; goal row `"Saving for \(title)"`, `"\(progress) of \(target)"` + `" · reached"`; `"Set a goal for \(child.name)"` when no goal; buttons `"Paid Out"` and `"Pay toward goal"` / `"Pay out the goal"`. Payout sheet titled `"Record a Payout"` with copy `"\(name) is owed \(money)."`, `"That pays everything owed."`, `"\(money) will remain."`, `"Enter an amount up to \(money)."`, button `"Pay \(money)"`. Loads via `manager.loadWallet(for:)`.
5. `"\(child.name)'s Chores"` heading, then three groups: `"To Do"`, `"Completed"`, `"Other Days"` (chores not due today, rendered at 0.75 opacity). Empty state: `"No chores yet"` / `"\(childName) has no chores assigned yet"`.
6. Chore row (`ChildChoreCard`): tap circle toggles completion (medium haptic, `manager.toggleChoreCompletion`), name (strikethrough when done), description, and a reward pill `String(format:"%.2f", chore.reward)` shown **only when `isPerChoreRewardMode`**. Context menu `"Edit"` / `"Delete"`.

**Toolbar:** calendar button → sheet `WeekCalendarView(child:)` with a `"Done"` button; `+` button → `AddChoreWizardView(preselectedChildId: child.id)`.
**Editing:** `sheet(item: $editingChore) { AddEditChoreView(chore:) }` — deliberately hoisted out of the row.
**Delete chore alert:** title `"Delete \(choreToDelete?.name ?? "this chore")?"`, message `"This action cannot be undone."`, buttons `"Cancel"` / `"Delete"`; failure alert title `"Delete Failed"` with message `"Couldn't delete \(chore.name). Please try again."`, button `"OK"`. Identical copy in `Views/ChoresView.swift:232–263`.

---

## 3. CHORE

### 3.1 Full editor — `Views/AddEditChoreView.swift`
Title `"Add Chore"` / `"Edit Chore"`, inline. Toolbar `"Cancel"` and `"Add"`/`"Save"` (disabled when `name.isEmpty || selectedChild == nil || isSaving`).

**Sections:**

| Header | Content |
|---|---|
| `"Suggestions"` or `"Suggestions · personalized"` (only when suggestions exist and NOT editing) | rows: icon, name, `reason` caption, reward, `plus.circle.fill` |
| `"Chore Details"` | `"Name"` + TextField placeholder `"e.g., Make bed"`; `Picker("Assigned To")` with a `"Select Child"` nil option and one row per child (color dot + name) |
| `"Reward"` | currency symbol, decimal TextField `"0.00"`, custom Stepper, preset chips, `"Current: \(money)"`, flat-rate notice |
| `"Which Days"` (footer: `"Only the days you pick count toward a perfect day. Web and iOS share the same schedule."`) | `DaysOfWeekPicker` |
| *(no header)*, footer `"Kids snap a picture when they check this off, and it waits for your OK before it counts."` | `Toggle("Ask for a photo")` with `camera.fill` |
| `"Category"` | menu Picker, rows `"\(emoji) \(label)"` |
| `"Icon"` | `LazyVGrid(adaptive min 50)` over `ChoreIconCatalog.all` (167 emoji), 55pt rounded tiles |
| `"Color"` | 10 color circles, 40pt |
| `"Notes (Optional)"` | `TextEditor`, height 80 |

**Fields & defaults (AddEditChoreView.swift:56–70):**
- `name` — `""`
- `selectedChild` — `chore?.childId ?? preselectedChildId`
- `rewardDollars` — sentinel `-1`; resolved in `.onAppear`: **`isPerChoreRewardMode ? 0.10 : (familySettings?.dailyRewardCents ?? 7)/100.0`**
- `category` — `ChoreCategory.normalize(chore?.category).rawValue` → default `"household_chores"`
- `selectedIcon` — `"📝"`
- `selectedColor` — `"blue"`
- `notes` — `""`
- `daysOfWeek` — `ChoreSchedule.everyDay` = `[0,1,2,3,4,5,6]`
- `requiresPhoto` — `false`

**Chore color palette (10, AddEditChoreView.swift:25):** `blue, green, orange, purple, pink, red, yellow, teal, indigo, mint`

**Reward semantics (cents vs dollars) — AddEditChoreView.swift:30–54, 395:**
- UI works in **dollars (Double)**; storage is **integer cents** in `chores.reward_cents`.
- Conversion always `Int((rewardDollars * 100).rounded())` — `.rounded()` is mandatory (0.29*100 = 28.999…).
- Preset chips, in cents: **`[10, 25, 50, 100, 200, 500]`**
- Max: **10 000 cents ($100.00)**; min 0.
- Stepper step depends on current value: `< 100 cents → ±5 cents`, `>= 100 → ±25 cents` (`stepCents`), clamped to `0…10000`.
- `Chore.reward` decodes **from the `reward_cents` column** (`Models.swift:63` CodingKey `reward = "reward_cents"`) into a `Double` — so `chore.reward` is actually a cents value on read while the editor treats it as dollars; the Android port should keep one integer-cents field and convert only for display.
- Flat-rate notice (shown when `!isPerChoreRewardMode`): `"Your family is on the Flat Daily Rate, so this amount isn't used yet. It's saved, and applies if you switch to Per Chore in Settings."`

**Category list — `Models/ChoreCategory.swift` (Postgres enum `activity_category`; any other value → 22P02):**

| raw value | label | emoji |
|---|---|---|
| `household_chores` | Household Chores | 🏠 |
| `learning_education` | Learning & Education | 📚 |
| `physical_activity` | Physical Activity | 🏃 |
| `creative_time` | Creative Time | 🎨 |
| `games_play` | Games & Play | 🎮 |
| `reading` | Reading | 📖 |
| `family_time` | Family Time | ❤️ |
| `custom` | Custom | ⚙️ |

Categories carry **no per-category color** — color is a separate free choice. `normalize(_:)` and `label(for:)` map unknown/legacy values to `household_chores`.

**Icon set — `ChoreCategory.swift:72–91` `ChoreIconCatalog.all`:** a flat ordered list of 167 emoji (cleaning → kitchen → stationery/school → science → sports → arts/music → games → nature/animals → food → stars/awards). Picker tiles show the full-color emoji; displayed chores render bundled OpenMoji line art from `Assets.xcassets/ChoreIcons` via `AdaptiveIcon(icon:fallbackSymbol:tint:iconSize:)`.

**Days-of-week picker — `DaysOfWeekPicker`, AddEditChoreView.swift:446–538:**
- Data convention: **0 = Sunday … 6 = Saturday**; default = all seven.
- Display order follows `Calendar.firstWeekday` (`ChoreSchedule.displayOrder`) — presentation only.
- Short labels `Sun Mon Tue Wed Thu Fri Sat`; long names for a11y.
- **The last selected day cannot be deselected** (a chore with no days is rejected by the DB, migration 015). A11y hint: `"The only day selected. A chore needs at least one day."`
- Preset chips: `"Every day"` `[0…6]`, `"Weekdays"`, `"Weekends"` — membership depends on `WeekendStyle` (`Logic/RewardMath.swift:242–290`): default Sat–Sun (`weekends [0,6]`, `weekdays [1,2,3,4,5]`), Fri–Sat for Gulf/Middle-East IANA zones (`weekends [5,6]`, `weekdays [0,1,2,3,4]`), inferred from `familySettings.timezone` (unless "UTC"/empty/invalid) else the device zone. Zone set listed at RewardMath.swift:262–269.
- Summary label (`ChoreSchedule.label`): `"Every day"` / `"Weekdays"` / `"Weekends"` / `"<Day>s"` for a single day / `"Mon, Wed, Fri"` otherwise.
- `normalized()`: filter to 0…6, dedupe, sort; empty or nil → every day.

**Per-child assignment:** single child per chore (`chores.child_id`), chosen in the "Assigned To" picker (or the wizard's child chips). Re-assignment is allowed on edit (updateChore writes `child_id`).

**Photo proof / approval:** one boolean `requires_photo` (`"Ask for a photo"`). There is **no separate "requires approval" per-chore field** — family-wide approval is `family_settings.require_approval` (`Models.swift:376`), and a photo chore's completion row is written with `status = 'pending'` + `proof_path` (`ChoreCompletionRow`, Models.swift:246–258). No premium gate on this toggle.

**Validation:** save button enablement as above; `saveChore` re-checks `selectedChild` and sets `"Please select a child"` if missing; then the chore-limit gate; notes empty → `nil`. The full editor does **not** trim the name (the wizard does).

### 3.2 Wizard — `Views/AddChoreWizardView.swift`
Nav title `"New Chore"`, inline, `"Cancel"` in the toolbar. Header shows `ProgressView` + `"Step \(n) of 3"` and the step title. Footer: `"Back"` (not on step 1) and `"Next"` / on the last step `"Create Chore"` (spinner while saving); disabled per `canAdvance`.

| Step | `Step` case / title | Content | Advance rule |
|---|---|---|---|
| 1 | `.whoAndWhat` — `"Who & What"` | `"Who is this chore for?"` horizontal child chips; `"What needs doing?"` TextField `"e.g., Make bed"`; `"Suggestions"` / `"Suggestions · personalized"` — **first 4 only** | child selected AND trimmed name non-empty |
| 2 | `.style` — `"Make It Yours"` | `"Category"` menu picker; `"Pick an icon"` grid; `"Pick a color"` grid | always true |
| 3 | `.reward` — `"Reward"` | review card (icon tile, name or `"New chore"`, `"For \(child.name) · \(categoryLabel)"`); `"Reward"` field + presets + flat-rate notice; `"Which days?"` + `DaysOfWeekPicker`; `"Ask for a photo"` toggle with subtitle `"Kids snap a picture when they check this off; it waits for your OK."`; `"Notes (optional)"` TextField `"Anything your kid should know?"` (3–5 lines) | `!isSaving` |

Same defaults, presets, max, and step-size logic as the full editor. **Tapping a suggestion fills name/reward/category/icon, fires a light haptic, and jumps straight to step 3.** Save trims the name; the chore-limit gate is checked in `saveChore` (AddChoreWizardView.swift:487).

### 3.3 Suggestions source
**Two-tier.** `displayedSuggestions = aiSuggestions ?? localSuggestions`; identical UI either way, only the section header differs.

- **Remote (preferred)** — `SupabaseManager.fetchAISuggestions`, **SupabaseManager.swift:1881–1925**
  - `POST https://chorestar.app/api/ai/suggest-chores` (base `appBaseURL = "https://chorestar.app"`, SupabaseManager.swift:124)
  - Headers: `Content-Type: application/json`, `Authorization: Bearer <supabase access token>`
  - Body: `{ "childName": String, "childAge": Int?, "existingChoreNames": [String], "completionRate": Double /* clamped 0…100 */ }`
  - Response: `{ "suggestions": [{ "name", "category", "icon", "rewardCents", "reason" }] }`
  - Returns nil on any non-200, empty array, decode error, no session, or offline → falls back silently. Re-fetched by `.task(id: selectedChild)`; cleared to nil first.
- **Local fallback** — `ChoreSuggestionEngine.suggestions(childName:childAge:existingChoreNames:completionRate:count: 5)`, `Models/ChoreSuggestions.swift`. 58-item catalogue with `(name, category, icon, minAge, maxAge, rewardCents, seasonalMonths)`. Algorithm: filter by age range and exclude existing names (case-insensitive, trimmed); score = +30 in-season, +15 category not already used, +10 if completionRate > 75 and reward ≥ 15c, +10 if age ≤ 6 and maxAge ≤ 10, +5 if year-round, plus `(sum of unicode scalars of name + dayOfMonth) % 7` as a deterministic daily shuffle; sort desc; take 5. Age defaults to 7 when nil/0. Reason strings: `"Great for this time of year"`, `"\(childName) is doing great, ready for a challenge!"`, `"Perfect for \(childName)'s age"`, `"Age-appropriate and builds good habits"`.
- `ChoreSuggestion.editorCategory` maps catalogue categories to DB enum: `learning → learning_education`, `outdoor → physical_activity`, everything else (self-care, tidying, kitchen, laundry, pets, household) → `household_chores`.
- Note: the suggestion engine's "category diversity" check compares category names against *existing chore names* (`existingLower.contains(def.category)`) — a faithful port should replicate this quirk or fix it deliberately.

### 3.4 Supabase ops for chores (exact)
- **Create — `createChore`, SupabaseManager.swift:3732–3773**
  `client.from("chores").insert(NewChoreRow)`; columns: `name, child_id (uuidString), reward_cents (Int), category (normalized enum raw), icon, color, notes, days_of_week (normalized [Int]), requires_photo`. Nil optionals are **omitted**, not sent as null (so DB defaults apply). Then `loadRemoteData()`.
- **Update — `updateChore`, SupabaseManager.swift:3775–3821**
  `client.from("chores").update(ChoreUpdate).eq("id", choreId.uuidString)`; same columns plus `updated_at` (ISO8601).
- **Reorder — `updateChoreOrder`, SupabaseManager.swift:3823–3855** — optimistic local sort, then a per-row `update({sort_order: index}).eq("id", …)` for each row whose index changed.
- **Delete — `deleteChore`, SupabaseManager.swift:3857–3876** — `client.from("chores").delete().eq("id", choreId.uuidString)`, then `loadRemoteData()`.
- Row shape read back (`ChoreRow`, Models.swift:227): `id, name, child_id, reward_cents, description, category, icon, color, notes, sort_order, days_of_week, requires_photo, created_at, updated_at`. The `chores` table no longer has a writable `description` column (comment at SupabaseManager.swift:3727).
- Tolerant decode (`Models.swift:98–114`): missing `days_of_week` → every day; missing `requires_photo` → false; missing `sort_order` → 0.

---

## 4. Premium gates in these flows
`SupabaseManager.swift:46–48`:
```
isPremium  = subscriptionType == "premium" || subscriptionType == "lifetime"
childLimit = isPremium ? Int.max : 3
choreLimit = isPremium ? Int.max : 20
```
- **Children:** `AddEditChildView.saveChild()` — on **create only**, `if manager.children.count >= manager.childLimit { showingUpgradePrompt = true; return }` (line 249). Editing is never gated.
- **Chores:** `AddEditChoreView.saveChore()` line 381 (create only, `choreToEdit == nil`) and `AddChoreWizardView.saveChore()` line 487 (always, since the wizard only creates).
- Gate UI: `Views/UpgradePromptView.swift`, `limitType: .children | .chores`, plus `currentCount` and `limit`.
  - Titles: `"Child Limit Reached"` / `"Chore Limit Reached"`; icons `figure.2.and.child.holdinghands` / `list.bullet.clipboard`; itemName `"children"` / `"chores"`.
  - Body: `"You've reached the free plan limit of \(limit) \(itemName)."` and `"You currently have \(currentCount) \(itemName)."`
  - Feature bullets: `"Unlimited children and chores"`, `"Unlimited reward store items"`, `"Premium themes: Ocean, Sunset, Forest, and more"`.
  - Buttons: `"See Premium Plans"` (crown icon → `PaywallView`), `"Not Now"`.
- Separate grandfathering system (`Logic/Entitlements.swift`) applies only to `themes, sharing, export, analytics` — **not** to child/chore counts, and not to anything in these flows.
- No premium gate on photo avatars, PINs, photo proof, or AI suggestions.

---

## 5. Exact user-facing strings (for Localizable.xcstrings lookup)

**Child add/edit:** `Add Child` · `Edit Child` · `Avatar` · `Choose Avatar` · `Child Information` · `Name` · `Enter name` · `Age` · `%lld years old` (from `"\(age) years old"`) · `Avatar Color` · `Kid Login` · `Enable Kid Login` · `PIN (4-6 digits)` · `Enter 4-6 digit PIN` · `Enter new PIN to change it` · `A PIN is already set. Leave blank to keep it.` · `This PIN lets \(name) log in to their own chore view` (falls back to `your child`) · `Cancel` · `Save` · `Add` · `Error: \(description)` · `Enter a 4-6 digit PIN to enable kid login` · `PIN must be 4-6 digits`

**Avatar picker:** `Choose Avatar` · `Photo` · `Robots` · `People` · `Emojis` · `Select` · `Cancel` · `Take a Photo` · `Choose from Library` · `Remove Current Photo` · `Save this child first, then add a photo from their edit screen.` · `Stored privately. Only your family can see it, and you can remove it any time.` · `Uploading…` · `Removing…` · `That image couldn't be read. Try another.` · `Add Some Fun` · `Use Photo` · `Tap something below to add it.` · `Drag to move · pinch to size · twist to rotate` · `That photo couldn't be processed. Try another one.` · `Your session expired. Please sign in again.` · `Couldn't upload that photo. Check your connection and try again.` · `Couldn't remove the photo. Please try again.`

**Family list:** `Family` · `Family Members` · `Manage your family and track their progress` · `Add Child` · `No family members yet` · `Tap the + button to add your first child.` · `Age \(age)` · `\(money) unpaid` · `Edit` · `Delete` · `Delete \(child.name)?` · `This will also delete all of \(child.name)'s chores. This action cannot be undone.`

**Child detail:** `Completed` · `Pending` · `Earned` · `Badges` · `Today's Progress` · `\(child.name)'s Chores` · `To Do` · `Other Days` · `No chores yet` · `\(childName) has no chores assigned yet` · `Done` · `Delete \(name)?` · `This action cannot be undone.` · `Delete Failed` · `Couldn't delete \(chore.name). Please try again.` · `OK` · `Allowance` · `\(money) owed` · `All paid up` · `Saving for \(title)` · `\(a) of \(b)` · ` · reached` · `Set a goal for \(child.name)` · `Paid Out` · `Pay toward goal` · `Pay out the goal` · `Record a Payout` · `\(name) is owed \(money).` · `Amount` · `That pays everything owed.` · `\(money) will remain.` · `Enter an amount up to \(money).` · `Pay` / `Pay \(money)` · `Paid \(name) \(money).` · `Paid \(name) \(money) toward the goal. Goal reached.`

**Chore editor:** `Add Chore` · `Edit Chore` · `Suggestions` · `Suggestions · personalized` · `Chore Details` · `Name` · `e.g., Make bed` · `Assigned To` · `Select Child` · `Reward` · `0.00` · `Current: \(money)` · `Your family is on the Flat Daily Rate, so this amount isn't used yet. It's saved, and applies if you switch to Per Chore in Settings.` · `Which Days` · `Only the days you pick count toward a perfect day. Web and iOS share the same schedule.` · `Ask for a photo` · `Kids snap a picture when they check this off, and it waits for your OK before it counts.` · `Category` · `Icon` · `Color` · `Notes (Optional)` · `Please select a child` · `Every day` · `Weekdays` · `Weekends` · `The only day selected. A chore needs at least one day.`

**Wizard:** `New Chore` · `Step \(n) of \(total)` · `Who & What` · `Make It Yours` · `Reward` · `Who is this chore for?` · `What needs doing?` · `Pick an icon` · `Pick a color` · `Which days?` · `Notes (optional)` · `Anything your kid should know?` · `Kids snap a picture when they check this off; it waits for your OK.` · `New chore` · `For \(child.name) · \(category)` · `Back` · `Next` · `Create Chore` · `Cancel`

**Upgrade prompt:** `Child Limit Reached` · `Chore Limit Reached` · `You've reached the free plan limit of \(limit) \(items).` · `You currently have \(count) \(items).` · `Unlimited children and chores` · `Unlimited reward store items` · `Premium themes: Ocean, Sunset, Forest, and more` · `See Premium Plans` · `Not Now`

**Caveat on xcstrings coverage:** strings built in plain-`String` computed properties are *not* auto-extracted. Verified absent from `Localizable.xcstrings`: `"Child Limit Reached"` / `"Chore Limit Reached"` (UpgradePromptView `LimitType.title`) and `"Make It Yours"` / `"Who & What"` (wizard `Step.title`). These are English-only today — treat them as new strings in the Android resource file. Strings checked and present: `Edit Child`, `Add Child`, `Choose Avatar`, `Enable Kid Login`, `Create Chore`, `Ask for a photo`.

---

## Key file:line index for Supabase calls
| Operation | Location |
|---|---|
| `createChild` insert into `children` | `Managers/SupabaseManager.swift:3606` (insert at 3640) |
| `updateChild` update `children` | `Managers/SupabaseManager.swift:3648` (update at 3673) |
| `deleteChild` delete from `children` | `Managers/SupabaseManager.swift:3705` (delete at 3712) |
| `setChildPin` upsert `child_pins` | `Managers/SupabaseManager.swift:374` (upsert at 3??→ line 402) |
| `removeChildPin` delete `child_pins` | `Managers/SupabaseManager.swift:416` (delete at 423) |
| `hashPin` / `randomSaltHex` | `Managers/SupabaseManager.swift:367` / `362` |
| `childAvatarBucket = "child-avatars"` | `Managers/SupabaseManager.swift:1934` |
| `avatarObjectPath` | `Managers/SupabaseManager.swift:1954` |
| `uploadChildAvatar` storage upload | `Managers/SupabaseManager.swift:2017` (upload at 2056) |
| `updateChildAvatarPhoto` update `children` | `Managers/SupabaseManager.swift:2092` (update at 2130) |
| `removeChildAvatarPhoto` | `Managers/SupabaseManager.swift:2143` |
| `signedAvatarURL` createSignedURL(3600s) | `Managers/SupabaseManager.swift:2172` |
| `createChore` insert into `chores` | `Managers/SupabaseManager.swift:3732` (insert at 3766) |
| `updateChore` update `chores` | `Managers/SupabaseManager.swift:3775` (update at 3812) |
| `updateChoreOrder` sort_order writes | `Managers/SupabaseManager.swift:3823` |
| `deleteChore` delete from `chores` | `Managers/SupabaseManager.swift:3857` (delete at 3863) |
| `fetchAISuggestions` POST /api/ai/suggest-chores | `Managers/SupabaseManager.swift:1881` (URL at 1890) |
| `childLimit` / `choreLimit` | `Managers/SupabaseManager.swift:47` / `48` |

No `.env` files or Info.plist values were read.

