<!-- Extracted from an iOS code survey on 2026-09-20; the source of truth is the Swift code it cites. -->

# ChoreStar iOS → Android port: functional spec (Week Calendar / Chores / Dashboard / Approvals)

All paths relative to `/Users/bensiegel/family-chore-chart/ChoreStar-iOS/ChoreStar/`. Web API lives in `/Users/bensiegel/family-chore-chart/chorestar-nextjs/`.

Tab bar (`ContentView.swift:340-370`): 0 Home (`DashboardView`, "Home", `house.fill`), 1 Family (`ChildrenView`, `figure.2.and.child.holdinghands`), 2 Chores (`ChoresView`, `list.bullet.clipboard`), 3 Stats (`HistoryView`, `chart.bar.fill`), 4 Settings (`gearshape.fill`).

---

## 1. WEEK CALENDAR (`Views/WeekCalendarView.swift`)

Reached from Chores tab → "Week" segment (`ChoresView.swift:76-89`), which shows a horizontal child-pill switcher when `children.count > 1` (`ChoresView.swift:91-121`) and re-creates the calendar with `.id(child.id)` per child.

### Layout (top → bottom), ScrollView inside GeometryReader, background `choreStarBackground`
1. **Title line**: `"<child.name>'s Week"` — display 22 bold (`:102`). NavBar title `"Week View"`, inline (`:308-309`).
2. **Segmented picker** `"View Mode"`: `"Daily List"` | `"Week View"` (`:108-113`). Default `.daily` (`:9`).
3. **Week navigator** — parents only; hidden when `kidModeSession != nil || isChildSession` (`:46-48, 117-119, 373-424`). Left chevron 44×44 (a11y "Previous week"), center `weekLabel`, right chevron (disabled + 0.35 opacity on current week, a11y "Next week"). When not on current week a caption button **"Back to this week"** appears under the label.
   - `weekLabel` (`:52-63`): `"This week"` when viewing current week; else `"Week of Sep 6"` (abbrev month + day) or `"Week of Dec 28, 2025"` when the start year ≠ current year.
   - `goToWeek(offset:)` (`:65-70`): `RewardMath.weekStart(viewed, offsetBy: ±1)` then `min(target, currentWeekStart)` — back unlimited, forward capped at the current week (string compare works because keys are `yyyy-MM-dd`).
4. **Week summary card** (only when the child has ≥1 chore) — `:122-199`. Three equal columns separated by 60pt dividers:
   - `"\(perfectDayCount)"` + `star.fill` (accent) + caption **"Perfect Days"**
   - `formatMoney(perfectDayEarningsCents/100)` + `dollarsign.circle.fill` + caption **"Earned"**
   - `"\(percentage)%"` + `chart.bar.fill` (success) + caption **"Complete"**
   - Numbers: display 30 bold, `lineLimit(1)`, `minimumScaleFactor(0.5)`.
   - **Daily-bonus line** only when `familySettings?.isPerChoreMode != true` (`:184-192`): `info.circle.fill` + `"Complete all chores in a day to earn <money>"` where money = `dailyRewardCents ?? 100` / 100. (Note the `?? 100` fallback here vs `RewardMath.defaultDailyRewardCents = 7` elsewhere.)
   - Definitions (`Logic/RewardMath.swift:108-183`, `SupabaseManager.swift:2535-2547`): `perfectDays[d]` = the day has ≥1 chore due (after vacation masking) and **all** due chores that day are completed/approved. `perfectDayCount` = count of those. **Earned** = sum of `dayEarningsCents[d]` **only on perfect days** (`RewardMath.swift:124-126`) — so in per-chore mode a partially-done day contributes 0 to the header figure even though the day cell math computed >0. **Complete %** = `completedCount / (chores.count * 7) * 100`, integer-truncated; `completedCount` counts every completed cell including cells for days the chore isn't due (`RewardMath.swift:148-150, 174-175`).
5. **Content**:
   - `childChores.isEmpty` → `EmptyWeekView` (`:894-917`): calendar glyph 60pt, **"No chores yet"**, `"<childName> doesn't have any chores assigned yet.\nAdd a chore to fill in their week."`
   - `.daily` → 7 `DayBreakdownCard`s in `ChoreSchedule.displayOrder()` order (`:206-219`).
   - `.grid` → one card: sticky-ish day header row + a `ChoreWeekRow` per chore, dividers between (`:228-298`). Card capped at 560pt wide on regular size class.
6. `Spacer(minLength: 110)` to clear the tab bar.

### Grid details
- **Day header** (`:231-265`): per column: short day name (`Sun…Sat`) subheadline bold; a 6pt dot filled `choreStarPrimary` only for today in the current week (clear placeholder otherwise); and, if that day is perfect, a pill with `formatMoney(dayEarningsCents[d]/100)` caption2 bold accent on accent@15%. Column text tinted primary for today, else secondary.
- **Chore row** (`ChoreWeekRow`, `:493-554`): chore info on its own line above the cells — 26pt `AdaptiveIcon(chore.icon ?? "📝", fallback "checklist", tint from chore.color)`, chore name callout semibold 1 line, and when `!chore.isEveryDay` a `calendar` glyph + `chore.scheduleLabel`. Then 7 flexible cells, spacing 6. Even rows get a `choreStarBackground.opacity(0.3)` wash.
- **Day order everywhere** is `ChoreSchedule.displayOrder()` (`RewardMath.swift:305-308`): starts at `Calendar.firstWeekday` (Monday-first in most of Europe). **Data indices stay Sunday=0.**

### Cell states (`DayCell`, `:556-652`), 12pt rounded rect, height 50 (compact) / 60 (regular)
| State | Fill | Border | Content |
|---|---|---|---|
| Completed (`isChoreCompleted(chore, day, weekStart)`) | `choreStarSuccess` | success, 1.5 (3 if today) solid | white bold `checkmark` at 0.5×height |
| Pending approval (current week only, `isChorePending`) | `choreStarWarning @18%` | warning solid | `clock.fill` warning at 0.42×height; a11y **"Waiting for your OK, tap to approve"** |
| Due, not done | `choreStarBackground` | `textSecondary@0.2`, solid | empty |
| Not due / vacation day | `.clear`, whole cell `opacity 0.6` | `textSecondary@0.35`, **dashed [4,3]** | empty |
| Today | — | `choreStarPrimary@0.5`, **lineWidth 3** | — |
- `isDue` (`:585-592`) = `chore.isDue(on: dayIndex)` **AND** the real date for that cell is not a vacation day (`manager.isVacationDay`). Vacation days therefore render exactly like off-days.
- Not-completed cells are drawn at `scaleEffect(0.95)`; spring animation on completion.

### Tapping
- **Any cell is tappable — past, today, and FUTURE days of the current week, and any day of any past week. There is no blocking.** Off-schedule/vacation cells stay tappable by design ("a parent can credit work done on another day", `:584-586`).
- Tap → light impact haptic → `manager.toggleChoreCompletion(chore, forDay: dayIndex, weekStart: isCurrentWeek ? nil : weekStart)` (`:595-618`).
- Celebrations (success sound, confetti, achievement alert) fire **only** when the cell was not completed **and** it is today **and** the current week is on screen (`:608-617`). Backfills earn silently.
- A pending cell tapped by a **parent** = approve; tapped in a **kid session** = delete the row (un-tick) (`SupabaseManager.swift:2604-2620`).

### Daily List mode
- `DayBreakdownCard` (`:654-798`): header = full day name (primary color if today) + `"TODAY"` pill (caption2 bold white on `choreStarFill`, radius 8); subtitle `"Nothing scheduled"` when no chores due, else `"\(done) of \(total) completed"`; if perfect and `dayEarnings > 0`, an accent pill with `star.fill` + `formatMoney(dayEarnings)`. Right: 50pt circular progress ring (accent when perfect, else success), showing `star.fill` when perfect else `"\(Int(pct*100))%"`. Card gets a 2pt `choreStarPrimary@0.3` border when today.
  - `dayEarnings` (`:691-694`) = `manager.calculateDayEarnings(childId, dayOfWeek, weekStart)` but only when `isPerfectDay`, else 0.
  - Chores listed = `manager.dueChores(for: child.id, on: dayIndex, weekStart: viewedWeekStart)` — **vacation days come back empty** (`SupabaseManager.swift:2558-2563`).
- `DailyChoreRow` (`:800-892`): 24pt circle checkbox (success ring + checkmark when done), 28pt chore icon, name (strikethrough + secondary when done), `ChoreCategory.label(for: chore.category)` caption2 under it; row bg `success@5%` when done. Medium impact haptic; same toggle + celebration rules.

### Week navigation / `week_start` computation — IMPORTANT INCONSISTENCY
- Canonical (UI + kid path + historical writes): **explicit Sunday**, local calendar, formatted `yyyy-MM-dd`: `RewardMath.weekStartString()` (`Logic/RewardMath.swift:74-82`) and `SupabaseManager.kidWeekStartString(for:)` (`SupabaseManager.swift:836-844`). Comments explicitly say Sunday-first, NOT locale-driven, matching the web `getWeekStart()`.
- **But three current-week write/read paths use `calendar.date(from: dateComponents([.yearForWeekOfYear, .weekOfYear]))`, which follows the device locale's first weekday (Monday in most of Europe)**: `loadCurrentDayCompletions()` `SupabaseManager.swift:2448-2451`, `toggleChoreCompletion(...)` `:2627-2630`, `markComplete(...)` `:2978-2981`. On a Monday-first device these write/query a Monday key while `RewardMath` compares against a Sunday key. Port the **Sunday-explicit** version everywhere (and treat this as an iOS bug worth mirroring-as-fixed).
- `RewardMath.weekStart(_:offsetBy:)` = parse key, ±7·weeks days, re-format (`RewardMath.swift:95-101`). `RewardMath.date(weekStart:dayIndex:)` = parsed Sunday + dayIndex days (`:88-91`).
- Past weeks read completions from the in-memory `allTimeCompletions` history, not from `weekCompletions` (`SupabaseManager.swift:2507-2528`).

### Bulk actions (toolbar `checkmark.circle` menu, a11y "Mark chores done in bulk")
- Items: **"Mark Today Done"** (`checkmark.circle`) and **"Mark Week So Far Done"** (`calendar.badge.checkmark`) (`:313-322`).
- Disabled when `childChores.isEmpty || bulkBusy || !isViewingCurrentWeek` (`:329`).
- Range: today-only → `fromDay = throughDay = currentDayOfWeek`; week-so-far → `fromDay = 0 … throughDay = currentDayOfWeek` (`:430, 470`).
- Nothing to do → toast overlay at top: `Label("All caught up", systemImage: "checkmark.seal.fill")` in a capsule, shown 1.8s (`:332-346, 429-446`).
- Otherwise confirm alert titled **"Mark Today Done"** / **"Mark Week So Far Done"**, buttons **"Cancel"** (cancel role) and **"Mark Done"**; message from `bulkConfirmMessage` (`:451-467`):
  `"This will check off {N chores|1 chore} for {name}"` + (if `earningsDeltaCents > 0`) `" and add {money} to the week's earnings."` else `"."` + (if pending) `" 1 chore waiting for your OK will be approved."` / `" N chores waiting for your OK will be approved."`
- On confirm: `markComplete(child:throughDay:fromDay:)`, then success haptic + success sound + confetti + achievement alert if any (`:469-490`).
- Achievement alert copy (shared): title **"Achievement unlocked"**, button **"OK"**, body `"{badgeIcon} {badgeName}\n{badgeDescription}"` (`:359-365`).

---

## 2. DASHBOARD / Home (`Views/DashboardView.swift`)

`NavigationStack` > `ScrollView` > `LazyVStack(spacing: 24)`, `.refreshable { manager.refreshData() }`, title **"Home"** (large). Toolbar primary action **"Kid Mode"** (`figure.child.circle.fill`) shown only if some child has a PIN → sheet `ChildAuthView` (`:352-365`).

Sections in order:

**1. Hero card** (`:123-252`) — seasonal gradient + particle overlay, radius 20, white 25% border.
- Row 1: left = `"🏖️ On vacation"` when `isOnVacationToday && vacationWindow != nil`, else `"{emoji} {greeting}"`. Right = `"through {Sunday, September 13}"` on vacation, else today's date `weekday(.wide) month(.wide) day()`.
- Greeting (`:34-46`): hour 0–11 `🌅 "Good morning"`, 12–16 `☀️ "Good afternoon"`, 17–20 `🌇 "Good evening"`, else `🌙 "Good night"`.
- Row 2: family name = `profiles.family_name` trimmed, fallback **"My Family"** (`:49-52`), display 28 heavy; a **"Shared"** chip when `memberOfFamilyId != nil`.
- If `children.isEmpty`: `"Add a child to start tracking chores."`
- Else: horizontal scroll of per-child rings (`heroChildRing`, `:72-109`) — `ProgressRing(done/total, lineWidth 4.5, white, track 0.28)` around a 50pt `AvatarView`, caption `"{FirstName} {done}/{total}"` or `"{FirstName} none today"`; each is a `NavigationLink` to `ChildDetailView`, a11y `"Show {name}'s chores"`. On vacation: plain avatar, no ring/counts, `opacity 0.85`.
- Trailing block: normal = `"{completedChores} of {totalChores}"` (display 24 heavy, numeric contentTransition) over `"{earnedToday} earned today"` or `"No chores due today"` when `totalChores == 0`. Vacation = `"Nothing due. Streaks are safe."` + underlined button **"End vacation early"** → `manager.clearVacation()`.
- Counts use `manager.choresDueToday` (all children, vacation-masked) and `isChoreCompleted` (`:19-32`); earned = Σ over children of `calculateTodayEarnings(childId)` (`:111-114`).

**2. Inline getting-started card** (`:257-260, 405-460`) — rendered when `children.isEmpty || chores.isEmpty || routines.isEmpty`. Header `flag.checkered` + **"Getting Started"**; three rows (checkmark.circle.fill green when done, else `circle`; title strikethrough when done; hint shown only when not done):
- `"Add your first child"` / hint `"Family tab → the + button"` (done ⇔ `!children.isEmpty`)
- `"Create a chore"` / `"Chores tab → New Chore"` (done ⇔ `!chores.isEmpty`)
- `"Set up a routine"` / `"Chores tab → Routines → Starter Routines"` (done ⇔ `!routines.isEmpty`)

**3. Rate card** (`:262-274`, `Theme/DesignSystem.swift:362-400`), shown when `ReviewPrompter.shouldShowRateCard()` on appear: **"Enjoying ChoreStar?"**, `"A quick App Store rating is how other families find it. It takes about ten seconds."`, buttons **"Rate on the App Store"** and **"Not now"**.

**4. `GettingStartedCard()`** (second, different checklist — `Views/GettingStartedCard.swift`). Renders `EmptyView` when `@AppStorage("gettingStartedHidden")`, `isChildSession`, `isSharedMember`, or `!initialDataLoaded`; when all three steps are done it sets `hidden = true` permanently (`:29-34`). Steps from `Logic/GettingStartedProgress.swift`: `hasKids = !children.isEmpty`, `hasChores = !chores.isEmpty`, `hasCompletion = !choreCompletions.isEmpty || !weekCompletions.isEmpty || !pendingCompletions.isEmpty || !achievements.isEmpty`. Copy: header **"Three steps and the chart runs itself"** + **"Hide"** button; steps **"Add a kid"**, **"Give them chores"**, **"Let them check one off"**. Only the first incomplete step (`nextStep`) shows helper UI:
- step 1: `"Pick from suggestions or write your own. Two or three is plenty to start."` + button `"Add chores for {firstChild.name}"` → `ChildDetailView`.
- step 2: `"Kids sign in with your family code and their PIN. No email. Set a PIN from each kid's edit screen."` + monospaced uppercased `kidLoginCode` chip and **"Copy"**/**"Copied"** button, or fallback `"Your family code is in Settings, Family section."`

**5. `ApprovalTrayView()`** — the "Needs your OK" list (see §3).

**6. "Today's Chores"** (`:290-339`), only when `!manager.chores.isEmpty`:
- `AppSectionHeader(title: "Today's Chores", trailing: "{completed}/{total}")`.
- Flat-rate explainer (hidden in per-chore mode and on vacation): `"Each child earns {money} for finishing all of their chores today."` using `familySettings.dailyRewardCents`.
- Empty state: `"Vacation mode is on. Chores come back when it ends."` on vacation, else `"Nothing is due today. Chores scheduled for other days show up on their day."`
- `LazyVGrid` adaptive 330–560 of `ChoreCard` (`:463-561`): circle icon `checkmark.circle.fill` (success) / `clock.fill` (warning, pending) / `circle`; a11y "Waiting for your OK, tap to approve" | "Done" | "Not done"; chore icon; name (strikethrough when done) + child name caption; trailing `formatMoney(chore.reward)` **only in per-chore mode**. Tap = `toggleChoreCompletion(chore)` (today), success haptic + sound + confetti + achievement alert on completing.

**7. Perfect-day overlay** (`:370-392`): triggers when `completedChores` transitions from `total-1` to `total` (not on load). `PerfectDayOverlay` copy (`Theme/DesignSystem.swift:405-436`): `🌟`, **"Perfect Day!"**, `"Every chore for today is done."`, share text `"Perfect day! Every chore in our house got done today, thanks to ChoreStar. Free on the App Store."`. Dismissal may trigger `requestReview()` via `ReviewPrompter.recordPerfectDayAndCheck()` after 0.6s.

Streaks are **not** on the Dashboard — they live in Stats (`HistoryView`) and per-child views.

---

## 3. APPROVALS

### Data model — `chore_completions` (base `backend/supabase/schema.sql:44-51`, migration `database-migrations/016_chore_approval_and_proof.sql`)
```
id uuid pk
chore_id uuid not null  -> chores
day_of_week int 0..6 not null   -- 0 = Sunday
week_start date not null        -- the Sunday key
completed_at timestamptz default now()
status text not null default 'approved'  check in ('pending','approved','rejected')
proof_path text        -- 'chore-proofs' bucket: {owner_user_id}/{child_id}/{completion_id}.jpg
reviewed_at timestamptz
reviewed_by uuid
UNIQUE (chore_id, day_of_week, week_start)
```
There is **no `approved` boolean, no `approved_by`, and no `proof_photo_url` column** — it is `status` / `reviewed_by` / `reviewed_at` / `proof_path` (photo URL is a short-lived signed URL minted server-side). Rejected rows are **deleted**, so in practice only `pending` and `approved` exist. Related: `family_settings.require_approval boolean not null default false`; `chores.requires_photo boolean not null default false`.

Swift models: `ChoreCompletionRow` (`Models/Models.swift:246-258`, `isPending = status == "pending"`, `status`/`proof_path` optional so nil is omitted on encode and the column default applies); `PendingApproval` (`SupabaseManager.swift:697-712`: `id, choreId, choreName, choreIcon, rewardCents, childId, childName, childColor, dayOfWeek, dayName, weekStart, completedAt, hasPhoto, photoUrl`).

Client state split (`SupabaseManager.swift:18-26`): `choreCompletions [choreId: Date]` (today, approved), `weekCompletions [(choreId, dayOfWeek)]` (current week, approved only), `pendingCompletions [(choreId, dayOfWeek, id)]`, `pendingApprovals [PendingApproval]`, `pendingRedemptions`.

### When does a tick wait?
`kidTickNeedsApproval(chore) = chore.requiresPhoto || familySettings?.requireApproval == true` (`:2576-2578`). **Parent-path ticks never wait** — only kid sessions. Kid mode on the parent device writes directly with the parent JWT, so the client applies the rule itself and sets `status = "pending"` on insert (`:2685-2721`). Standalone kid mode goes through `POST /api/kid/chores/toggle` and honors the server's `{status: "pending"}` response (`:928-1006`). Photo chores go through `POST /api/kid/chores/proof` (multipart: `choreId`, `dayOfWeek`, `weekStart`, `file`=proof.jpg ≤1280px JPEG q0.82) which creates the row pending (`:1509-1578`).

### Parent approve / reject — **web API, not a direct table update**
- `POST https://chorestar.app/api/chores/approve`, `Authorization: Bearer <Supabase access token>`, JSON `{ "completionId": "<lowercased uuid>", "action": "approve" | "reject" }` (`SupabaseManager.swift:1412-1424`). 200 = success.
- Server (`chorestar-nextjs/app/api/chores/approve/route.ts`): verifies the caller owns/co-parents the family; **approve** → `update { status: 'approved', reviewed_at: now(), reviewed_by: userId }` on `id`, then fires `notifyIfAllChoresDone(child.id, week_start, day_of_week)`; **reject** → `DELETE` the row and remove the proof object from storage.
- `approveCompletion(id:)` (`:1429-1440`): optimistically removes from `pendingApprovals` + `pendingCompletions`, calls the API, then `loadCurrentDayCompletions()` + `loadPendingApprovals()` + `publishWidgetSnapshot()`. `rejectCompletion(id:)` (`:1445-1455`) is the same minus the widget publish.
- **Tray fetch**: `GET https://chorestar.app/api/chores/pending` with Bearer token → `{ items: PendingApproval[], redemptions: PendingRedemption[] }` (`:1458-1478`). Server query: `chore_completions` where `chore_id in (family chores)` and `status = 'pending'`, ordered `completed_at desc`, limit 100, joined to chores/children and signed proof URLs (`app/api/chores/pending/route.ts`).
- **Settings toggle**: `family_settings.update({require_approval: enabled}).eq("user_id", effectiveUserId)` (`:1481-1499`).
- Bulk approve reuses the same endpoint per id (`:3025-3027`).

### Effect on earnings
Pending rows are filtered out of `weekCompletions` on load (`:2466-2471`) and out of `allTimeCompletions` (`:3954`), so a pending tick earns nothing, breaks perfect days/streaks, and isn't "done" anywhere. Approval simply reloads state and it counts from then on.

### Approval UI copy (`DashboardView.swift:575-816` `ApprovalTrayView`)
- Renders nothing when both pending lists are empty (an invisible `Color.clear` keeps `.task` alive).
- Header: `clock.badge.checkmark.fill` (warning) + **"Needs your OK"** + count `pendingApprovals.count + pendingRedemptions.count`.
- **Store-request rows** (reward redemptions): emoji tile, `itemTitle`, `"{childName} wants this"` + `"· {money}"`; buttons **"Not now"** (`reviewRedemption(action:"reject")`) and **"Yes"** (green, `action:"approve"`), a11y `"Yes to {itemTitle} for {childName}"`.
- **Chore rows**: 52pt thumbnail — the proof photo (tappable → lightbox) when `hasPhoto`, else the chore icon tile. Text: chore name, then `childName` (tinted with the child's avatar color) + `"· {dayName}"` (long day name from the server) + `camera.fill` when there is a photo. Buttons: `arrow.uturn.backward` icon (a11y **"Send {choreName} back to {childName}"**) → `rejectCompletion`; green **"Approve"** with checkmark (a11y **"Approve {choreName} for {childName}"**) → `approveCompletion`. Haptics: light on reject, success on approve.
- **Photo lightbox sheet**: nav title `"{childName} · {choreName}"`, toolbar **"Close"**, buttons **"Send back"** and **"Approve"**.
- Tray refreshes via `.task { loadPendingApprovals() }` and `onChange(of: pendingCompletions.count)`.

---

## 4. VACATION MODE (migration `019_vacation_mode.sql`)

- Live switch: `family_settings.vacation_starts_on date`, `vacation_ends_on date` (both null or both set, `ends >= starts`). History: `vacation_periods (id, user_id, starts_on, ends_on, created_at)` with RLS for owner + family members.
- Parsing/formatting is hand-rolled `yyyy-MM-dd` ↔ local start-of-day, never `DateFormatter` (`Logic/RewardMath.swift:191-232`). `covers()` is inclusive both ends; nil/half-set/inverted = not on vacation.
- `isOnVacation(date)` = live window contains `startOfDay(date)`; `isVacationDay(date)` = live window **or** any `vacation_periods` row (`SupabaseManager.swift:3064-3093`). `vacationResumeDate` = end + 1 day.
- **Effect on due-ness**: `dueChores(for:on:)` returns `[]` for a vacation day (`:3324-3328`); `choresDueToday` returns `[]` (`:3331-3334`); week-aware `dueChores(for:on:weekStart:)` likewise (`:2558-2563`); `DayCell.isDue` false (`WeekCalendarView.swift:585-592`).
- **Effect on earnings/stats**: `calculateDayEarnings` returns 0 on a vacation day (`:3355-3357`); `RewardMath.weekStats` zeroes `dayEarningsCents` and forces `perfectDays[d] = false` for flagged days (`RewardMath.swift:145-171`); `calculateWeeklyStats` excludes vacation days from `dueDayCount`, perfect days, the weekly bonus, and the streak (`:4800-4871`); `currentStreak` treats a vacation day as "nothing due" so the run carries across it (`:3302`).
- Writes: `setVacation(from:through:)` (`:3125-3206`) **upserts** `family_settings` on conflict `user_id` with `{user_id, vacation_starts_on, vacation_ends_on}`, then updates the matching `vacation_periods` row (matched on old start/end) or inserts a new one; history failures are non-fatal. `clearVacation()` (`:3212-3278`) sets both columns to `AnyJSON.null` `.eq(user_id)`, then **deletes** the history row if the window never started, or **trims** `ends_on` to yesterday if it is mid-window; a finished window is left alone. Both reload settings + periods and republish the widget snapshot.
- Loading history: `vacation_periods.select("id, starts_on, ends_on").eq("user_id", uid.lowercased())`; any error (e.g. table missing) silently yields `[]` (`:3098-3119`).
- UI surfaces: hero "🏖️ On vacation" / "through …" / "Nothing due. Streaks are safe." / "End vacation early"; Today's Chores empty copy; the daily local reminder is re-scheduled to skip the window (`:3407`).

---

## 5. STATS / HISTORY tab (`Views/HistoryView.swift`) — nav title **"Stats & History"**

- **Premium gate**: if `!manager.canUse(.analytics)` the whole screen is `PremiumFeatureGate(feature: .analytics)` under nav title **"Stats"** (`:63-68`).
- **Child filter pills**: **"All"** (nil) + one per child; selected = white on `choreStarFill` (`:73-82, 354-372`).
- **Summary grid** (adaptive 160–260) of 4 `StatTile`s (`:85-116`): `checkmark.circle.fill` `{stats.totalCompletions}` **"Completed"**; `star.fill` `formatMoney(stats.totalEarnings)` **"Total Earned"**; `trophy.fill` `{achievements.count}` **"Total Badges"** (family-wide, not filtered); `chart.line.uptrend.xyaxis` `{Int(completionRate*100)}%` **"Completion"**.
- **"Completions This Week"** area+line+point chart (`Charts`), 7 points `Sun…Sat`, height 190, `chartXSelection` scrubbing with a dashed RuleMark and a callout showing the day label and `"{count} done"` (`:119-199`). Data = `weekCompletions` filtered to the selected child's chore ids (or all) counted per `dayOfWeek` (`:22-36`) — i.e. **current week only, approved only**.
- **"By Child"** bar chart, only when no child filter and `children.count > 1`; bar per child in the child's avatar color with the count annotated on top (`:202-243`).
- **"Perfect Days"** section: header + `"{stats.perfectDays}/7"`, then 7 star glyphs (`star.fill` accent when `dailyStatus[day]`, hollow otherwise) with `Sun…Sat` labels; when `perfectDays == 7`, the line `"Perfect week: all 7 days complete."` (`:246-288`).
- **Streak card** (only when `stats.streak > 0`): `flame.fill` orange, `"{n} Day Streak"`, subtitle **"Consecutive days with every chore done"** on orange@10% with orange@30% border (`:291-318`). NOTE: the streak shown here is `WeeklyStats.streak` (`SupabaseManager.swift:4854-4871`) = consecutive days **with at least one completion**, current week only, walking backwards from today, skipping vacation days and days with nothing due. The more accurate cross-week `currentStreak(for:)` (`:3286-3318`, all-chores-due-done, up to 400 days back) is **not** used here.
- **"Family Leaderboard"**: children sorted by `calculateWeeklyStats().totalCompletions` desc; `LeaderboardRow` shows `#rank` (gold/silver/bronze for 1-3), gradient initials avatar, name, and three chips — completed **today** (`dueChores(for:).filter(isChoreCompleted)`), `formatMoney(calculateTodayEarnings(childId))`, badge count — plus a trophy for the top 3 (`:320-333, 386-501`).
- **Queries / date ranges**: this screen issues **no queries of its own**. It reads in-memory state loaded by `loadRemoteData()`:
  - `loadCurrentDayCompletions()` (`:2436-2496`): `chore_completions.select().eq("week_start", <current week key>)` — no child/chore filter (RLS scopes it); splits into pending vs approved, and today's map by `day_of_week == today`.
  - `loadAllTimeCompletions()` (`:3923-3972`): `chore_completions.select("chore_id, week_start, day_of_week, status").in("chore_id", allChoreIds).limit(10000)`, drops `status == "pending"`, derives a date as `weekStart + day_of_week`. This is the history behind past-week viewing, achievements, and `currentStreak`.
  - `loadAchievements()` (`:3879-3919`): `achievement_badges.select().in("child_id", childIds).order("earned_at", desc)`.
  - Aggregate stats across children (`:4883-4914`): sums completions/earnings, averages perfect days (`total/children.count`, integer division), `completionRate = avgPerfectDays/7`, `streak = max`, `dailyStatus[i] = AND` across children.

---

## 6. EARNINGS MATH

Core: `RewardMath.dayEarningsCents(completedRewards:totalChoreCount:isPerChoreMode:dailyRewardCents:)` (`Logic/RewardMath.swift:25-40`):
```
if totalChoreCount == 0 -> 0
if perChore  -> Σ Int(round(reward * 100))          // round each chore to whole cents, then sum
else          -> completedRewards.count == totalChoreCount ? (dailyRewardCents ?? 7) : 0
```
- `Chore.reward` is `reward_cents` from the DB divided by 100 into a Double (`SupabaseManager.swift:2388`), hence the per-chore re-rounding.
- **Pool selection** (`:3355-3371` and `RewardMath.swift:161`): per-chore mode pools **all** of the child's chores (a completed chore earns even on a day it wasn't scheduled); flat/daily mode pools only the chores **due** that day, and pays `dailyRewardCents` only when every one is done ("perfect day").
- `defaultDailyRewardCents = 7` (`RewardMath.swift:11`) — but `family_settings.daily_reward_cents` defaults to **100** in the schema, and the WeekCalendar bonus line falls back to 100 (`WeekCalendarView.swift:188`). Reconcile deliberately on Android.
- **Week header "Earned"** = Σ `dayEarningsCents[d]` over **perfect days only** (`RewardMath.swift:124-126`).
- **Weekly stats earnings** (`:4828-4850`): per-chore = Σ over non-vacation days of each completed chore's `round(reward*100)`; flat = `perfectDayCount * dailyRewardCents(?? 7)`; plus `weeklyBonusCents` when `dueDayCount > 0 && perfectDayCount == dueDayCount`. (The weekly bonus is applied **only** in `calculateWeeklyStats`, not in the week-calendar header.)
- `mode` source: `family_settings.reward_mode == "per_chore"` → `isPerChoreMode`; anything else (default `'flat'`) = daily mode (`Models/Models.swift:385`, `SupabaseManager.swift:70`).
- **Currency formatting** (`SupabaseManager.formatMoney`, `:73-80`): symbol from `FamilyCurrency.find(familySettings?.currency_code)` (36-entry table in `Models/Models.swift:300-337`, fallback derives symbol/name via `NumberFormatter`/`Locale` with flag `💱`); `decimals` 2, or **0** for JPY/KRW/CLP. Output is `String(format: "%@%.2f")` → **symbol prefix, no space, no thousands separators, no locale-aware placement** (e.g. `$12.50`, `€12.50`, `¥13`). Fallback symbol `$` until settings load. Storage is always integer cents.
- Bulk-plan money delta (`:2920-2947`): recomputes `dayEarningsCents` before/after per day in range and sums the difference, so daily mode only counts days that *become* perfect.

---

## 7. Exact Supabase operations (table, columns, filters) with refs

Client: supabase-swift; base web API `https://chorestar.app` (`SupabaseManager.swift:126`). `effectiveUserId` = joined family owner id, else own user id (`:120-122`).

| Op | Detail | Ref |
|---|---|---|
| Load children | `children.select().eq("user_id", effectiveUserId).limit(100)` | `:2323-2329` |
| Load chores | `chores.select().in("child_id", childIds).eq("is_active", true).limit(200)`, sorted by `(sort_order, created_at)` | `:2368-2401` |
| Load week completions | `chore_completions.select().eq("week_start", weekStartString)` | `:2454-2459` |
| Insert completion (today/current week) | `chore_completions.insert({id, chore_id, day_of_week, week_start, completed_at ISO8601[, status:"pending"]})` | `:2690-2705` |
| Delete completion (current week) | `.delete().eq("chore_id", uuidString).eq("day_of_week", d).eq("week_start", key)` | `:2652-2658` |
| Insert/delete completion (past week) | same shape, `week_start` = viewed week, `completed_at` = **noon of the credited day**; 23505 tolerated | `:2806-2857` |
| Bulk insert | `chore_completions.insert([rows])`; on 23505 retry row-by-row skipping duplicates | `:2997-3020` |
| Kid un-tick of pending (kid session) | `chore_completions.delete().eq("id", pendingRowId)` | `:2611-2615` |
| All-time history | `chore_completions.select("chore_id, week_start, day_of_week, status").in("chore_id", choreIds).limit(10000)`, drop `status=="pending"` | `:3941-3961` |
| Achievements | `achievement_badges.select().in("child_id", ids).order("earned_at", desc)`; insert `{child_id, badge_type, badge_name, badge_description, badge_icon}` | `:3889-3895`, `:4006-4018` |
| Family settings | `family_settings.select().eq("user_id", uid).limit(1)`; `update {require_approval}`; `upsert {user_id, vacation_*} onConflict user_id`; `update {vacation_* : null}` | `:3389-3395`, `:1487-1491`, `:3149-3156`, `:3224-3231` |
| Vacation periods | `select("id, starts_on, ends_on").eq("user_id", uid.lowercased())`; `update {starts_on, ends_on}` matched on old pair; `insert {user_id, starts_on, ends_on}`; `delete` / `update {ends_on: yesterday}` | `:3105-3110`, `:3176-3191`, `:3247-3261` |
| Chore reorder | `chores.update({sort_order})` per chore | `:3823-3855` |

**Web API endpoints called** (all `https://chorestar.app`):
- `POST /api/chores/approve` — Bearer parent JWT, `{completionId, action}` (`:1412-1424`)
- `GET /api/chores/pending` — Bearer parent JWT → `{items, redemptions}` (`:1458-1478`)
- `POST /api/push/chores-done` — Bearer parent JWT, `{childId, weekStart, dayOfWeek}`; fire-and-forget after a parent-path completion insert; **skipped for bulk** (`:1375-1398`, `:2724-2728`, `:2964-2965`)
- `POST /api/kid/chores/toggle` — Bearer kid token, `{choreId, dayOfWeek, weekStart, completed}` → `{status}` (`:943-963`)
- `POST /api/kid/chores/proof` — multipart `{choreId, dayOfWeek, weekStart, file}` (`:1510-1542`)
- `GET /api/kid/chores`, `GET /api/kid/stats`, `/api/kid/wallet`, `/api/kid/routines/complete`, redemption review endpoints (2.0 store).

---

## 8. Exact user-facing strings (quick reference)

**Week calendar**: "Week View" (nav) · "{Name}'s Week" · "Daily List" / "Week View" · "This week" / "Week of Sep 6" / "Week of Dec 28, 2025" · "Back to this week" · "Perfect Days" / "Earned" / "Complete" · "Complete all chores in a day to earn {money}" · "TODAY" · "Nothing scheduled" · "{n} of {m} completed" · "No chores yet" / "{name} doesn't have any chores assigned yet.\nAdd a chore to fill in their week." · "Mark Today Done" / "Mark Week So Far Done" / "Cancel" / "Mark Done" · "All caught up" · "This will check off {N chores} for {name} and add {money} to the week's earnings." (+ " {N} chores waiting for your OK will be approved.") · "Achievement unlocked" / "OK" · a11y: "Previous week", "Next week", "Mark chores done in bulk", "Waiting for your OK, tap to approve".

**Dashboard**: "Home" · "Good morning/afternoon/evening/night" (🌅☀️🌇🌙) · "My Family" · "Shared" · "Add a child to start tracking chores." · "{money} earned today" / "No chores due today" · "🏖️ On vacation" / "through {date}" / "Nothing due. Streaks are safe." / "End vacation early" · "Getting Started" + "Add your first child" ("Family tab → the + button") / "Create a chore" ("Chores tab → New Chore") / "Set up a routine" ("Chores tab → Routines → Starter Routines") · "Three steps and the chart runs itself" / "Hide" / "Add a kid" / "Give them chores" / "Let them check one off" / "Add chores for {name}" / "Copy"/"Copied" / "Your family code is in Settings, Family section." · "Needs your OK" / "Approve" / "Send back" / "Yes" / "Not now" / "{child} wants this" / "Close" · "Today's Chores" · "Each child earns {money} for finishing all of their chores today." · "Nothing is due today. Chores scheduled for other days show up on their day." / "Vacation mode is on. Chores come back when it ends." · "Kid Mode" · "Perfect Day!" / "Every chore for today is done." · "Enjoying ChoreStar?" / "Rate on the App Store" / "Not now".

**Chores tab** (`Views/ChoresView.swift`): segments "Chores" | "Routines" | "Week"; nav titles "Chores" / "Routines" / "This Week"; search prompt "Search chores"; filter menu "Filter" with "All" / "Pending" / "Completed"; "New Chore" (+ toolbar); swipe actions "Done"/"Undo" (leading, full-swipe allowed), "Delete" (red) and "Edit" (blue) trailing with `allowsFullSwipe: false` and no destructive role; tip "Swipe to complete" / "Swipe a chore to the right to check it off, or drag with a long press to reorder."; delete alert "Delete {name}?" / "This action cannot be undone." / "Cancel" / "Delete"; error alert "Delete Failed" / "Couldn't delete {name}. Please try again."; empty states "No chores yet" + "Tap the + button to create your first chore." / "All done" + "All chores for today are done." / "No completed chores" + "Chores show up here once they're checked off."; iPad card subtitle "Nothing due today" / "{n} of {m} done today"; week segment empty state "No children yet" + "Add your first child on the Family tab to see their week here."
- Filter semantics (`ChoresView.swift:142-157`): **All** = every chore regardless of day (reorder enabled only here with empty search, persisted to `chores.sort_order`); **Pending** = `choresDueToday` not completed; **Completed** = all chores completed **today**. Grouping is by child name (`"Unassigned"` fallback), sections sorted alphabetically. Per-chore money is shown only in per-chore mode.

**Stats**: "Stats & History" (nav; "Stats" when gated) · "All" · "Completed" / "Total Earned" / "Total Badges" / "Completion" · "Completions This Week" / "{n} done" · "By Child" · "Perfect Days" / "{n}/7" / "Perfect week: all 7 days complete." · "{n} Day Streak" / "Consecutive days with every chore done" · "Family Leaderboard".

### Gotchas worth carrying into the Android port
1. The Sunday-vs-locale `week_start` inconsistency (§1) — three call sites use `yearForWeekOfYear`.
2. Two independent "getting started" cards both render on Home with different step definitions.
3. Week-header "Earned" counts perfect days only, even in per-chore mode, while individual day cells/DayBreakdownCard use full day earnings.
4. "Complete %" denominator is `chores × 7`, ignoring schedules, so a weekdays-only child can never reach 100%.
5. Two different streak algorithms exist (`WeeklyStats.streak` vs `currentStreak`); Stats shows the weaker one.
6. `daily_reward_cents` fallbacks disagree: 7 (`RewardMath`, `calculateWeeklyStats`) vs 100 (`WeekCalendarView` bonus line) vs schema default 100.
7. Reject = hard delete (row + proof object), never a `rejected` status.
8. `formatMoney` is symbol-prefix `%.Nf` with no locale grouping.

