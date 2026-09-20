<!-- Extracted from an iOS code survey on 2026-09-20; the source of truth is the Swift code it cites. -->

# ChoreStar iOS — SETTINGS tab functional spec (for Android port)

Base paths:
- iOS: `/Users/bensiegel/family-chore-chart/ChoreStar-iOS/ChoreStar/`
- Web: `/Users/bensiegel/family-chore-chart/chorestar-nextjs/`
- API base constant: `SupabaseManager.appBaseURL = "https://chorestar.app"` (`Managers/SupabaseManager.swift:126`)

Settings is tab index 4, label "Settings", icon `gearshape.fill` (`ContentView.swift:365-369`). Nav title "Settings" (`Views/SettingsView.swift:468`). Root is a `NavigationStack { Form { … } }`.

---

## 1. SETTINGS screen — sections and rows in order

File: `Views/SettingsView.swift`. All rows listed top-to-bottom.

### Section "Appearance" (`:48`)
| Row | Control | Writes | Notes |
|---|---|---|---|
| "Theme" | Menu picker: "Light" / "Dark" / "System" (icons `sun.max.fill` / `moon.fill` / `gear`) | **Local only** — `@AppStorage("darkModePreference")`, String raw values `"Light"|"Dark"|"System"` (`:9`, `:39-43`) | Consumed in `ContentView.swift:6-12` → `.preferredColorScheme`. NOT synced to Supabase. |
| "Current Theme" | Read-only label | — | Right value = "Dark"/"Light" from `colorScheme` (`:60-67`) |

### Section header "Theme", footer variable (`:70-91`)
- Body is `ThemeGalleryView` — a horizontally-scrolling swatch gallery (`:540-707`), 4 rows:
  1. untitled row: `Auto` (✨), `Classic` (⭐)
  2. "Holidays": christmas, halloween, easter, valentine, stpatricks, thanksgiving, newYear
  3. "Seasons": spring, summer, fall, winter
  4. "Premium": ocean, sunset, forest, aurora, coral, lavender (lock badge if `!manager.canUse(.themes)`; tapping a locked card fires haptic + opens `PaywallView`)
- Selection binding = `@AppStorage("seasonalTheme")`, values `"auto" | "none" | SeasonalTheme.rawValue` (`:10`, `:78-80`)
- `.onChange` → `manager.setSeasonalThemePreference(newValue)` (`SupabaseManager.swift:3499`)
- Footer copy (3 variants, `:83-90`):
  - accent set: "Custom accent overrides the theme colours. Theme choice syncs with the web app."
  - theme active: "Active: {emoji} {displayName}. Synced with the web app."
  - else: "Theme choice syncs with the web app."
- Card UI: `ThemePreviewCard` 172×126 — a miniature app screen over the theme gradient, emoji charm bottom-right, 3pt border + checkmark when selected, `lock.fill` on black 50% circle when locked.

### Section "Accent Colour" (`:93-123`)
| Row | Control | Writes |
|---|---|---|
| "Custom Accent" (icon `paintpalette.fill`) | `ColorPicker`, `supportsOpacity: false` | Debounced 700ms → `manager.setCustomAccentColor(hex)`; hex is `"#rrggbb"` lowercase via `Color.hexRGBString` (sRGB-converted, `Theme/Colors.swift:180-186`) |
| "Reset to Theme Colours" | Button, only when `customAccentHex != nil` | `setCustomAccentColor(nil)` |
Footer: "Synced with the web app. Pick a colour once and every device follows."

### Section "Audio" (`:125-138`)
| Row | Control | Writes |
|---|---|---|
| "Sound Effects" (icon toggles `speaker.wave.3.fill` / `speaker.slash.fill`) | Toggle | **Local only** — `UserDefaults` bool key `"soundEnabled"`, default `true` (`Managers/SoundManager.swift:12-22`). Turning on plays `.cheer`. |

### Section "Subscription" (`:140-209`)
| Row | Control | Detail |
|---|---|---|
| "Plan" | Read-only | `manager.subscriptionType.capitalized` ("Free"/"Premium"/"Lifetime"), crown icon when premium |
| "Upgrade to Premium" / subtitle "Unlimited children, chores & more" | Button (free only) | opens `PaywallView` |
| "Restore Purchases" | Button (free only) | `StoreKitManager.shared.restorePurchases()` |
| "Manage Subscription" / "Change plans or cancel. Billed by Apple." | Button — only when `isPremium && hasAppleSubscription` | `.manageSubscriptionsSheet` (`:481`). Hidden for Stripe subscribers deliberately. |
| "Children" | Read-only | `"{children.count}/{isPremium ? "∞" : childLimit}"` (childLimit = 3) |
| "Chores" | Read-only | `"{chores.count}/{isPremium ? "∞" : choreLimit}"` (choreLimit = 20) |

### Section "Account" (`:211-239`)
| Row | Control | Detail |
|---|---|---|
| "Email" | Read-only | `manager.currentUserEmail ?? "Not signed in"` |
| "Change Password" (icon `lock.rotation`) | Button → sheet `ChangePasswordView` | |
| "Delete Account" (icon `trash`, `role: .destructive`) | Button → sheet `DeleteAccountView` | Placed here per App Store Guideline 5.1.1(v) |

### Section "Family" (`:241-271`) — three NavigationLinks
1. "Family Sharing & Kid Login" (`person.2.fill`) → `FamilySharingView`
2. "Rewards & Currency" (`dollarsign.circle.fill`) → `FamilyRewardsSettingsView`
3. "Reward Store" (`bag.fill`) → `RewardStoreSettingsView`

### Section "Vacation" (`:273-316`)
| Row | Control | Writes |
|---|---|---|
| "Vacation mode" (icon `airplane`) | Toggle | On → debounced save; Off → `manager.clearVacation()` |
| "From" | DatePicker (`.date`) — only when on | clamps `Through >= From` |
| "Through" | DatePicker (`.date`, range `vacationFrom...`) — only when on | |
| error text | red caption | |
Footer: "No chores due, streaks safe, alerts quiet."
Save debounce 700ms → `manager.setVacation(from:through:)` → writes `family_settings.vacation_starts_on` / `vacation_ends_on` as `yyyy-MM-dd` strings, plus a `vacation_periods` row. Skips the write if unchanged. Haptic success on OK. (`:504-523`)

### Section (untitled) "Approve Chores First" (`:318-335`)
| Row | Control | Writes |
|---|---|---|
| "Approve Chores First" + subtitle "Kids' ticks wait in a Needs Your OK list before they count." (icon `checkmark.shield.fill`) | Toggle | `family_settings.require_approval` boolean, via `setRequireApproval` (`SupabaseManager.swift:1481`) |

### Section "Notifications" (`:337-391`)
| Row | Control | Writes |
|---|---|---|
| "Activity Alerts" (icon `iphone.radiowaves.left.and.right`) | Toggle | `family_settings.activity_push_enabled` boolean, via `setActivityPushEnabled` (`SupabaseManager.swift:3471`). nil ⇒ treated as ON (`FamilySettings.activityPushOn`) |
| "Daily Reminder" (icon `bell.badge.fill`) | Toggle | **Local** `@AppStorage("dailyReminderEnabled")` bool. On → requests UN authorization; if denied, toggle flips back to false. |
| "Reminder Time" | DatePicker `.hourAndMinute`, only when enabled | **Local** `@AppStorage("dailyReminderTime")` = `Double` `timeIntervalSinceReferenceDate`; default 5:00 PM today |
Footer: "Activity alerts buzz when a kid finishes all chores or a routine. The daily reminder is a local nudge on this device."

### Section "Data" (`:393-397`)
- "Refresh Data" Button → `manager.refreshData()` (reloads all remote data)

### Section "About" (`:399-447`)
| Row | Type | Destination/behavior |
|---|---|---|
| "Rate ChoreStar" (`star.fill`) | Link | `https://apps.apple.com/app/id6761279049?action=write-review` (`Managers/ReviewPrompter.swift:14`) → Android: Play in-app review |
| "Share ChoreStar" (`square.and.arrow.up`) | ShareLink | item `https://apps.apple.com/app/id6761279049`, subject "ChoreStar", message "We use ChoreStar for chores and routines with the kids. Free on the App Store." |
| "What's New" (`sparkles`) | Button → sheet `WhatsNewView` | |
| "Chore icons by OpenMoji" / trailing caption "CC BY-SA 4.0" | Link | `https://openmoji.org` |
Footer: "Ratings and reviews are how other families find ChoreStar."

### Final section (`:449-453`)
- "Sign Out" Button, `role: .destructive` → `manager.signOut()` (no confirmation dialog).

### onAppear seeding (`:455-462`)
`customAccent` from `themeManager.customAccentHex`; `activityPushEnabled = familySettings?.activityPushOn ?? true`; `requireApproval = familySettings?.requireApproval ?? false`; `seedVacationState()` (an expired window reads as OFF and is not cleaned up).

---

### 1b. Sub-screen: "Rewards & Currency" (`FamilyRewardsSettingsView`, `:1044-1256`)
Nav title "Rewards & Currency", inline. Writes `family_settings` via `updateFamilyRewards` — an **upsert** `onConflict: "user_id"` (`SupabaseManager.swift:3543-3590`).

| Section | Row | Control | Column |
|---|---|---|---|
| (footer only) | "Reward mode" | segmented Picker: "Daily flat rate" = `"flat"`, "Per chore" = `"per_chore"` | `reward_mode` (text) |
| | footer | per_chore: "Kids earn the amount on each chore they finish." / flat: "Kids earn the daily amount when they finish every chore for the day." | |
| "Amounts (cents)" | "Daily reward" (flat) or "Default chore" (per_chore) | numberPad TextField + "¢" suffix, default "100" | `daily_reward_cents` (**integer cents**) |
| | "Weekly bonus" | numberPad TextField + "¢", default "1" | `weekly_bonus_cents` (**integer cents**) |
| | footer | "Enter amounts in cents, e.g. 100 = {formatMoney(1.0)}. Synced with the web app." | |
| "Currency" | "Currency" | Picker, label `"{flag} {name} ({symbol})"` | `currency_code` (ISO code) |
| | footer | "Allowance and chore rewards use this symbol on iPhone and the web." | |
| "Time zone" | "Time zone" | Picker of 41 city labels | `timezone` (IANA id) |
| | footer | `WeekendStyle.inferred` → "Weekdays / Weekends on new chores will be Sunday–Thursday and Friday–Saturday." (Gulf) or "…Monday–Friday and Saturday–Sunday." | |
| (last) | "Save Rewards" / "Saving…" | Button | on success status = "Saved. Synced with the web app." + success haptic; on failure "Couldn't save rewards. Please try again." |

Input parsing: digits only, `max(0, …)`; daily fallback 100, weekly fallback 0.
Timezone resolution: a stored `"UTC"`/empty/invalid is treated as unset and replaced by the device zone (`:1221-1226`).
Timezone picker list (id → label), `:1057-1099`: America/New_York New York, America/Chicago Chicago, America/Denver Denver, America/Los_Angeles Los Angeles, America/Toronto Toronto, America/Vancouver Vancouver, America/Mexico_City Mexico City, America/Sao_Paulo São Paulo, America/Buenos_Aires Buenos Aires, Europe/London London, Europe/Dublin Dublin, Europe/Paris Paris, Europe/Berlin Berlin, Europe/Amsterdam Amsterdam, Europe/Madrid Madrid, Europe/Rome Rome, Europe/Stockholm Stockholm, Europe/Warsaw Warsaw, Africa/Cairo Cairo, Africa/Johannesburg Johannesburg, Africa/Lagos Lagos, Asia/Riyadh Riyadh, Asia/Dubai Dubai, Asia/Qatar Doha, Asia/Kuwait Kuwait City, Asia/Bahrain Manama, Asia/Muscat Muscat, Asia/Jerusalem Jerusalem, Asia/Istanbul Istanbul, Asia/Karachi Karachi, Asia/Kolkata Mumbai, Asia/Bangkok Bangkok, Asia/Jakarta Jakarta, Asia/Singapore Singapore, Asia/Hong_Kong Hong Kong, Asia/Shanghai Shanghai, Asia/Tokyo Tokyo, Asia/Seoul Seoul, Australia/Sydney Sydney, Australia/Melbourne Melbourne, Pacific/Auckland Auckland. Unknown stored zone is inserted at top.

**Currency list** (`Models/Models.swift:289-360`, keep in sync with `chorestar-nextjs/lib/constants/currencies.ts`) — code/symbol/flag/name/decimals:
USD $ 🇺🇸 US Dollar 2 · EUR € 🇪🇺 Euro 2 · GBP £ 🇬🇧 British Pound 2 · CAD $ 🇨🇦 2 · AUD $ 🇦🇺 2 · NZD $ 🇳🇿 2 · SAR ر.س 🇸🇦 2 · AED د.إ 🇦🇪 2 · QAR ر.ق 🇶🇦 2 · EGP E£ 🇪🇬 2 · ILS ₪ 🇮🇱 2 · TRY ₺ 🇹🇷 2 · **JPY ¥ 🇯🇵 0** · CNY ¥ 🇨🇳 2 · **KRW ₩ 🇰🇷 0** · INR ₹ 🇮🇳 2 · SGD $ 🇸🇬 2 · HKD $ 🇭🇰 2 · TWD NT$ 🇹🇼 2 · THB ฿ 🇹🇭 2 · PHP ₱ 🇵🇭 2 · MYR RM 🇲🇾 2 · IDR Rp 🇮🇩 2 · CHF Fr 🇨🇭 2 · SEK kr 🇸🇪 2 · NOK kr 🇳🇴 2 · DKK kr 🇩🇰 2 · PLN zł 🇵🇱 2 · CZK Kč 🇨🇿 2 · MXN $ 🇲🇽 2 · BRL R$ 🇧🇷 2 · COP $ 🇨🇴 2 · ARS $ 🇦🇷 2 · PEN S/ 🇵🇪 2 · **CLP $ 🇨🇱 0** · ZAR R 🇿🇦 2.
Unknown code → fallback built from `NumberFormatter` with flag 💱, decimals 2 (never silently USD). Storage is always integer hundredths regardless of display decimals.

### 1c. Sub-screen: "Reward Store" (`RewardStoreSettingsView`, `:1262-1427`)
Table `reward_items` (columns `id, user_id, title, emoji, price_cents, is_active, sort_order` — `SupabaseManager.swift:686-695`).
- Header: `"Rewards ({count})"` or `"Rewards ({count} of {rewardItemLimit})"` for free.
- Empty state copy: "No rewards yet. Start with a few families like, then make them yours." + button "Add the starter set" (`addStarterRewards`, `:1843`).
- Rows: emoji + title + price field (debounced 900 ms → `updateRewardItemPrice`). Swipe-to-delete → `removeRewardItem`.
- Footer: "Kids ask from their dashboard; you say yes or no from Needs Your OK on Home, and the price comes off their balance. Swipe to remove."
- "Add a reward" section: emoji Picker (🎁 📱 🌙 🎬 🍕 🍦 🎲 🧸 🎮 🏊 🚲 📚 ⭐), title TextField placeholder "30 minutes of screen time", price with currency symbol prefix (dollars → `Int(dollars*100)` cents), "Add reward" button, and "Add more from the starter set".
- At limit: `Label("The free plan lists 3 rewards. Premium removes the limit.", systemImage: "lock.fill")` (same string returned by `addRewardItem` at `SupabaseManager.swift:1785`).
- Price validation failure copy: "Give the reward a price."

---

## 2. THEMES

### Light/Dark/System mode
**Local only, not synced.** `@AppStorage("darkModePreference")` String `"Light" | "Dark" | "System"`. Web has its own independent key `chorestar-theme-mode` (`'light'|'dark'|'auto'`) in localStorage (`chorestar-nextjs/lib/utils/theme-mode.ts:1-3`) — web `auto` also goes dark 19:00–07:00; iOS `System` follows OS only. Android equivalent: a local preference (DataStore/SharedPreferences), no DB column.

### Accent colour list
There is **no fixed palette** — the accent is a free-form `ColorPicker` producing any `#rrggbb`. Brand defaults (`Theme/Colors.swift:5-35`):
`choreStarPrimary #6366f1` (indigo) · `choreStarFill #5e61e5` (AA-safe filled button) · `choreStarFillPressed #565ad2` · `choreStarPrimaryLight #818cf8` · `choreStarPurple #8b5cf6` · `choreStarSecondary/Success #10b981` · `choreStarAccent/Warning #f59e0b` · `choreStarDanger #ef4444` · `choreStarDangerStrong #dc2626` · `choreStarLink` adaptive `#4338ca` light / `#a5b4fc` dark. Brand gradient = `#6366f1 → #8b5cf6` topLeading→bottomTrailing.

### Seasonal theme catalog (`Theme/SeasonalThemes.swift`)
id (rawValue) | display | emoji | primary | secondary | date range (MM-DD) | particle glyph | premium
---|---|---|---|---|---|---|---
christmas | Christmas | 🎄 | #dc2626 | #228033 | 12-01 → 12-31 | ❄️ | no
thanksgiving | Thanksgiving | 🦃 | #ea8811 | #c75a0d | 11-20 → 11-30 | 🍂 | no
halloween | Halloween | 🎃 | #f79307 | #8c24ab | 10-01 → 10-31 | 🎃 | no
easter | Easter | 🐰 | #a855f7 | #ed789e | 04-01 → 04-30 | 🌸 | no
valentine | Valentine's Day | 💕 | #ec4899 | #d92e61 | 02-10 → 02-15 | 💕 | no
stpatricks | St. Patrick's Day | ☘️ | #22b84e | #148738 | 03-10 → 03-18 | ☘️ | no
newYear | New Year | 🎉 | #6366f1 | #8c5cf7 | 01-01 → 01-07 | 🎊 | no
spring | Spring | 🌸 | #ee3c6b | #e7206b | 03-01 → 05-31 | 🌸 | no
summer | Summer | ☀️ | #3a9aa3 | #ed706f | 06-01 → 08-31 | ✨ | no
fall | Fall | 🍂 | #b31e11 | #fa6a18 | 09-01 → 11-30 | 🍂 | no
winter | Winter | ❄️ | #1a22b0 | #2f7cc6 | 12-01 → 02-28 (wraps) | ❄️ | no
ocean | Ocean | 🌊 | #0284c7 | #0a5ca6 | — | 🫧 | **yes**
sunset | Sunset | 🌅 | #ea4c23 | #f59e0b | — | ✨ | **yes**
forest | Forest | 🌲 | #158750 | #0d6138 | — | 🍃 | **yes**
aurora | Aurora | 🌌 | #592eba | #1eab8c | — | ✦ | **yes**
coral | Coral | 🪸 | #f56b5b | #f59e0b | — | 🫧 | **yes**
lavender | Lavender | 💜 | #9466dd | #6640b3 | — | ✿ | **yes**

(Secondary hex values above are the exact RGB triples from `secondaryColor` converted to hex; primaries carry hex comments in source.) Gradient for every theme = `primary → secondary`, topLeading→bottomTrailing. Particles: `ThemeParticleOverlay` (`Theme/DesignSystem.swift:288-357`), 12 glyphs, 30 fps Canvas, opacity 0.5, drifting fall + sine sway, size 13pt × 0.6–1.2 scale, tinted white. Used on `DashboardView.swift:239-241` and `ChildMainView.swift:210`.

### "Auto" logic (`SeasonalTheme.current()`, `:164-200`)
Month/day compared as `month*100 + day`. Holidays checked FIRST in this order: christmas, thanksgiving, halloween, easter, valentine, stpatricks, newYear. Then seasons: spring, summer, fall, winter. Ranges that wrap the year (winter) match `date >= start || date <= end`. Returns nil if nothing matches (→ Classic brand colors).

### Precedence (`Managers/ThemeManager.swift:125-145`)
`customAccent (hex) > activeTheme.primaryColor > .choreStarPrimary` — matches web `resolveActiveTheme`. A custom accent renders as a **solid** fill (single-color "gradient"), not a two-stop gradient.

### Persistence & web sync
- Custom accent: `family_settings.custom_theme` JSON key `accentColor` (string `#rrggbb` or null). Written via **read-merge-write** on the raw JSON (`setCustomAccentColor`, `SupabaseManager.swift:3429-3469`) — the web keeps other keys (`whatsNewSeenVersion`, etc.) in the same object and a wholesale replace would wipe them. Also mirrored locally to `UserDefaults` key `"customAccentHex"` so a standalone kid device keeps the colour offline (`ThemeManager.swift:13-19`, `:48-56`).
- Seasonal selection: same JSON object, keys `autoSeasonal: Bool` + `seasonalTheme: String|null` (`setSeasonalThemePreference`, `SupabaseManager.swift:3499-3541`):
  - `"auto"` → `{autoSeasonal: true, seasonalTheme: null}`
  - `"none"` → `{autoSeasonal: false, seasonalTheme: null}`
  - else → `{autoSeasonal: false, seasonalTheme: webId}`
- **ID case mapping**: web uses camelCase for two ids. `webSeasonalId(fromIOS:)` maps `stpatricks → "stPatricks"`, `newyear → "newYear"`; `iosSeasonalId(fromWeb:)` maps back, case-insensitively matching all others (`ThemeManager.swift:97-117`). Android must do the same.
- Read path: `loadFamilySettings` (`SupabaseManager.swift:3381`) applies `customTheme.accentColor` then `applySeasonalFromCustomTheme`, then re-syncs the daily reminder against the vacation window.
- Kid mode gets the same payload from `GET /api/kid/child` rather than `family_settings` (`ThemeManager.apply(customTheme:)`, `SupabaseManager.swift:570-593`).
- `CustomThemePayload` decode is lenient — all three fields optional; unknown keys ignored (`Models/Models.swift:280-287`).

---

## 3. FAMILY SHARING (`Views/FamilySharingView.swift`, nav title "Family Sharing", inline)

### Tables
- **`family_codes`**: `user_id` (owner), `code`. One row per family.
- **`family_members`**: `id`, `user_id` (the co-parent), `family_id` (the owner's user id), `joined_at`.
- `profiles.kid_login_code` — the separate kid code.
There is **no `role` column**. Roles are implicit: *owner* = a user with no `family_members` row for themselves; *co-parent / shared member* = a user who has one. Display label in the members list is hard-coded `"Co-parent"` (`:141`).

### Invite creation — NOT a link, NOT expiring
`generateFamilyJoinCode()` (`SupabaseManager.swift:4229-4264`): returns the existing `familyJoinCode` if present, else generates **8 characters** from the Crockford-ish alphabet `"abcdefghjkmnpqrstuvwxyz23456789"` (lowercase, no i/l/o/0/1) and `INSERT`s into `family_codes(user_id, code)`. **No expiry, no single-use, no separate `invites` table.** Lookup on join is `.eq("code", lowercased().trimmed)`.
- Copy button puts the **bare code** on the clipboard.
- ShareLink text: `"Join our family on ChoreStar! Open the app, tap Settings → Family Sharing → Join a Family, and enter code: {code}"`

### Accept flow — plain PostgREST, no RPC, no web API
`joinFamily(code:)` (`SupabaseManager.swift:4266-4317`):
1. `select("user_id") from family_codes .eq("code", normalized) .limit(1)`
2. not found → "That code doesn't match any family. Double-check it and try again."
3. owner == self → "That's your own family code."
4. `INSERT into family_members (user_id: me, family_id: owner)`
5. duplicate (`PostgrestError.code == "23505"`) → "You've already joined this family."
6. other error → `"Couldn't join: {localizedDescription}"`
7. success → set `memberOfFamilyId`, `loadRemoteData()`

`resolveFamilyMembership()` (`:4144`) runs BEFORE loading children and sets `memberOfFamilyId`; `effectiveUserId = memberOfFamilyId ?? debugUserId` is the id every family query keys off (web parity: `lib/utils/family.ts getEffectiveFamilyId`).

### Member list / removal
- `loadFamilySharing()` (`:4175-4227`): `family_members.select("id, user_id, joined_at").eq("family_id", myUid)` + `family_codes.select("code").eq("user_id", myUid).limit(1)`.
- Row: person icon, "Co-parent", `"Joined {abbreviated date}"`. Swipe action "Remove" (`person.badge.minus`).
- Alert title **"Remove this co-parent?"**, message **"They'll lose access to your family's chores and routines."**, buttons "Cancel" / "Remove" (destructive).
- `removeFamilyMember(memberId:)` → `DELETE from family_members .eq("id", memberId)` then reload.
- Co-parent's own exit: "Leave Family" → confirmationDialog **"Leave this family?"** with destructive "Leave Family"; `leaveFamily()` → `DELETE from family_members .eq("user_id", myUid)` then `loadRemoteData()`.

### What a co-parent can / can't do
- **Can**: read/write all family data (children, chores, routines, completions, family_settings — every write uses `effectiveUserId`), incl. rewards/currency/vacation/approval/theme settings; see the owner's kid login code and family name (`loadProfile` fetches the owner's `profiles` row, `:4108-4142`).
- **Can't**: see the Invite/Members/Join sections at all (the whole `shareSection` + `membersSection` + `joinSection` is replaced by `memberSection` when `isSharedMember`, `:19-33`); create invite codes; remove other members. Subscription is read from **their own** `profiles.id` (`loadProfile` uses `debugUserId`), so premium does **not** propagate to co-parents.

### Sections & copy (in order)
1. **"Kid Login Code"** — monospaced bold code, CopyCodeButton, ShareLink to `https://chorestar.app/kid-login/{code}` with message `"Log in to ChoreStar with our family code: {code}"`. Empty state: "Your kid login code appears here once it's generated on chorestar.app." Footer: "Kids use this code plus their PIN to log in on any device."
2. **"Invite a Co-Parent"** (owner, entitled) — code row, or button "Create Invite Code" (`person.badge.plus`). Footer: "Share this code with a partner or grandparent so they can see and manage your family's chores from their own account. The same code works in the iOS app and on chorestar.app." Error copy: `"Couldn't create a code: {error}"`.
   - Not entitled → `PremiumFeatureGate(feature: .sharing)` instead.
3. **"Family Members"** — empty: "No one has joined yet."
4. **"Join a Family"** — TextField "Enter invite code" (monospaced, no autocap/autocorrect), button "Join Family". Footer: "Got a code from your partner? Enter it here to manage their family together. Your view switches to their family's chores."
5. **"Family Membership"** (shared member only) — "You're sharing another family's chores." + "Leave Family". Footer: "Leaving switches you back to your own family's data."

---

## 4. ACCOUNT

### Change password (`Views/ChangePasswordView.swift`)
- Sheet, nav title "Change Password" (inline). Toolbar "Cancel" / "Change" (bold, disabled until valid).
- Sections: **"Current Password"** — SecureField "Enter current password". **"New Password"** — SecureField "Enter new password", SecureField "Confirm new password", plus live requirement rows "At least 8 characters" and "Passwords match".
- Validity: current non-empty AND new non-empty AND `new.count >= 8` AND `new == confirm`.
- **The current password is collected but never verified/sent** — `changePassword(newPassword:)` only calls `client.auth.update(user: UserAttributes(password: newPassword))` (Supabase GoTrue `PUT /auth/v1/user`) (`SupabaseManager.swift:2279-2297`).
- Success copy "Password changed." with green checkmark, auto-dismiss after 1 s. Failure `"Error: {localizedDescription}"`.

### Sign out
`Button("Sign Out", role: .destructive) { manager.signOut() }` — no confirmation (`SettingsView.swift:449-453`, impl `SupabaseManager.swift:1282`).

### Delete account (`DeleteAccountView`, `SettingsView.swift:805-1038`)
**Endpoint:** `POST https://chorestar.app/api/account/delete`
- Headers: `Content-Type: application/json`, `Authorization: Bearer <supabase access token>`
- Body: `{"confirm":"DELETE"}` (server compares case-insensitively after trim; `chorestar-nextjs/app/api/account/delete/route.ts:33,203-210`)
- 200 response: `{ success: true, subscriptionsCancelled, billingCleanupFailed, filesRemoved, storageCleanupFailed }` (route.ts:269-276)
- Errors: 401 `{error:"You must be signed in to delete your account."}` · 400 `{error:"Type DELETE to confirm account deletion."}` · 500 `{error:"We could not delete your account. Please contact hi@chorestar.app and we will remove it for you."}` / `{error:"Something went wrong. Please try again."}`
- Rate limit `ACCOUNT_DELETE`: **5 attempts per hour per IP** (`lib/utils/rate-limit.ts:229`); iOS maps 429 → "Too many attempts. Please wait a few minutes and try again."
- Server-side: cancels Stripe subs (best effort), deletes `child-avatars` storage objects under `{user_id}/…`, purges email-keyed `testflight_waitlist` + `outreach_sent_log`, then `auth.admin.deleteUser(user.id)` which cascades profiles → children → chores → chore_completions, routines, routine_steps, routine_completions, child_pins, kid_sessions, achievement_badges, family_settings, family_members, family_codes, push_subscriptions. `contact_submissions.user_id` is `ON DELETE SET NULL` and is intentionally kept.
- iOS client error strings: "Your session expired. Please sign in again and retry." / "Couldn't reach ChoreStar. Check your connection." / "We couldn't delete your account. Please try again." / "Something went wrong. Please try again."

**Confirmation UI copy (exact):**
- Nav title "Delete Account"; toolbar "Cancel"; `interactiveDismissDisabled` while deleting.
- Header: icon `exclamationmark.triangle.fill`; "This permanently deletes your account"; "Your family's chore data is erased from our servers and can't be recovered. There's no way to undo this."
- "What gets deleted" list: "Your login and profile" · "Every child, including their avatars and PINs" · "All chores and your family's completion history" · "All routines and their step-by-step history" · "Allowance and earnings totals" · "Achievement badges and streaks" · "Family sharing and your kid login code"
- Premium notice, Apple-billed: "Your subscription is billed by Apple, and deleting your account does not cancel it. Cancel it in Settings → your name → Subscriptions to stop future charges." **Android equivalent: point at Play Store → Subscriptions.**
- Premium notice, Stripe: "Your ChoreStar subscription will be cancelled. You won't be billed again."
- Sharing notice (owner): "Anyone sharing this family loses access to its children, chores, and routines." / (member): "You'll be removed from the family you joined. The family's own data stays with its owner."
- Confirm field label: "Type DELETE to confirm", placeholder "DELETE", `.characters` autocap, autocorrect off, a11y label "Type DELETE to confirm account deletion".
- Buttons: "Delete My Account" / "Deleting…" (white on `#dc2626`; disabled = secondary label on 14%-grey), and "Keep My Account".
- Post-delete billing warning alert: title **"Account deleted"**, body "Your account is gone, but we couldn't confirm your subscription was cancelled. Please email hi@chorestar.app so we can check your billing.", button "OK".

### Kid login code display / regeneration
- Stored in `profiles.kid_login_code`. Displayed in FamilySharingView (section 3 above).
- **There is no user-facing regenerate button on iOS.** The code is fetched-or-minted automatically: `loadProfile()` calls `materializeKidLoginCode()` when `kid_login_code == nil` and the user is not a shared member (`SupabaseManager.swift:4104-4107`).
- `materializeKidLoginCode()` (`:4045-4067`): `GET https://chorestar.app/api/kid-login-code` with `Authorization: Bearer <token>`, expects 200 `{ code, kidLoginUrl }`.
- Server (`app/api/kid-login-code/route.ts`): resolves user from cookie session **or** Bearer token (service-role `auth.getUser(token)`), reads `profiles.kid_login_code`; if missing generates `crypto.randomBytes(4).toString('hex')` = **8 lowercase hex chars**, retries up to 5 times, then returns `{ code, kidLoginUrl: "{origin}/kid-login/{code}" }`. 401 Unauthorized / 404 "Profile not found" / 500. **GET only — there is no POST/regenerate path.**
- Shared members display the owner's code, fetched from the owner's profile row.

---

## 5. PREMIUM

### Entitlement decision
- Source of truth: `profiles.subscription_type` ∈ `"free" | "premium" | "lifetime"`. `isPremium = type == "premium" || type == "lifetime"` (`Models/Profile.swift:12-16`, `SupabaseManager.swift:46`; web mirror `lib/utils/subscription.ts:3-5`). "lifetime" is a withdrawn tier still honored.
- **No expiry columns are read by the client.** Expiry/cancellation is entirely server-side: Stripe webhook, `/api/apple/notifications`, `/api/google/notifications`. Related profile columns written but never read for gating: `apple_original_transaction_id`, `google_purchase_token`.
- Grandfathering: four "premium" features are also allowed for any account whose `profiles.created_at < 2026-09-19T00:00:00Z` (`Logic/Entitlements.swift`, web `lib/utils/subscription.ts:44-62`). `canUse(feature) = isPremium || isGrandfathered(profileCreatedAt)`. Timestamp parsing trims Postgres 6-digit fractional seconds to 3 before ISO8601 parse (`Entitlements.parseTimestamp`).

### Hard limits (free tier)
| Thing | Free limit | Source |
|---|---|---|
| Children | **3** | `SupabaseManager.swift:47`, web `getChildLimit` |
| Chores (family-wide) | **20** | `SupabaseManager.swift:48`, web `getChoreLimit` |
| Reward store items | **3** | `SupabaseManager.swift:1777` / `lib/constants/rewards.ts:39` `FREE_STORE_ITEM_LIMIT` |
| Savings goals per child | **1** | `lib/constants/rewards.ts:38` `FREE_GOAL_LIMIT` (server-enforced via `/api/kid/wallet` limits) |

### Soft-gated features (`GatedFeature`)
`.themes` (the 6 premium themes only — seasonal stay free) · `.sharing` (co-parent invites) · `.export` (PDF/CSV) · `.analytics` (advanced stats in HistoryView). Gate usages: `SettingsView.swift:73`, `FamilySharingView.swift:22,26`, `HistoryView.swift:62-64`.

`PremiumFeatureGate` copy (`Views/PremiumFeatureGate.swift`):
- themes — "Premium themes" / "Ocean, Sunset, Forest, Aurora, Coral, and Lavender come with Premium. The seasonal themes stay free."
- sharing — "Family sharing is part of Premium" / "Invite a co-parent or guardian with their own login to the same family."
- export — "Export reports come with Premium" / "PDF family reports and CSV data for spreadsheets."
- analytics — "Advanced stats come with Premium" / "Completion trends, per-child comparisons, and streak history. Today's chores and this week's totals on Home stay free."
- CTA button: "See Premium" (crown icon).

`UpgradePromptView` (hit when adding past a hard limit; used in `AddEditChildView.swift:224`, `AddEditChoreView.swift:341`, `AddChoreWizardView.swift:136`): titles "Child Limit Reached" / "Chore Limit Reached"; body "You've reached the free plan limit of {limit} {children|chores}." + "You currently have {n} {children|chores}."; bullets "Unlimited children and chores", "Unlimited reward store items", "Premium themes: Ocean, Sunset, Forest, and more"; buttons "See Premium Plans" / "Not Now".

`PaywallView` copy: title "Premium"; hero "ChoreStar Premium" / "Everything your family needs to make chores fun"; features "Unlimited children & chores", "Unlimited reward store items and goals", "Premium themes: Ocean, Sunset, Forest, and more", "Support an indie family app"; plan cards with "BEST VALUE" badge on the annual plan and "Billed yearly"/"Billed monthly"; CTA "Continue"; "Restore Purchases"; unavailable state "Plans aren't available right now." + "You can also upgrade at chorestar.app"; success alert title **"Welcome to Premium"** body "Your family now has unlimited children, chores, and premium themes." button "Done"; Close in toolbar. Legal block (Apple-specific; rewrite for Play) + links `https://chorestar.app/terms` and `https://chorestar.app/privacy`. Demo prices in screenshot mode: $4.99 monthly / $49.99 annual.

### StoreKit product ids (iOS)
`com.chorestar.premium.monthly`, `com.chorestar.premium.yearly` (`Managers/StoreKitManager.swift:14-28`). Note the comment: `com.chorestar.premium.annual` is permanently burned. Lifetime non-consumable withdrawn.

Purchase → profile flow on iOS:
1. `product.purchase(options: [.appAccountToken(profileUUID)])`
2. verify → `transaction.finish()` → `syncEntitlement()`
3. `recordAppleOriginalTransactionId(String(transaction.originalID))` → `profiles.apple_original_transaction_id` (deduped in UserDefaults key `apple.originalTransactionIdSynced.{uid}`)
4. **Upgrade-only**: if `subscriptionType == "free"` → `updateSubscriptionType("premium")` → `profiles.update({subscription_type}).eq("id", uid)`. It NEVER downgrades; cancellations are webhook-only.
5. `loadProfile()` also calls `syncEntitlement()` on every cold launch so offer codes/family sharing/renewals heal a stale "free".

### Android equivalent — existing web endpoint contract
**Play product ids** (`chorestar-nextjs/lib/google/play-billing.ts:12-15`): `chorestar_premium_monthly`, `chorestar_premium_yearly`. Package `com.chorestar.app`.

**`POST /api/google/verify`** (`chorestar-nextjs/app/api/google/verify/route.ts`)
- Auth: **Supabase cookie session only** (`createClient()` → `auth.getUser()`). ⚠️ Unlike `/api/account/delete` and `/api/kid-login-code`, there is **no `Authorization: Bearer` fallback** — a native Android client would need one added, or must call it from the Capacitor WebView that carries the cookie.
- Request: `{ "purchaseToken": string, "productId"?: string }`
- Behavior: `getSubscriptionV2(purchaseToken)`; product must be in `PLAY_SUBSCRIPTION_PRODUCT_IDS`; if `externalAccountIdentifiers.obfuscatedExternalAccountId` is set and ≠ `user.id` → 403; maps state → tier; service-role update `profiles` with `{ google_purchase_token }` and, when tier is premium, `{ subscription_type: 'premium' }`; acknowledges the purchase if `ACKNOWLEDGEMENT_STATE_PENDING`.
- Responses: 200 `{ ok: true, tier: 'premium'|'free'|'unchanged', state: string|null }` · 400 `{error:'Invalid JSON body'|'purchaseToken required'|'Unknown product'}` · 401 `{error:'Unauthorized'}` · 403 `{error:'Purchase belongs to a different account'}` · 502 `{error:'Verification failed'}`
- State→tier map (`tierForPlaySubscriptionState`): ACTIVE / CANCELED / IN_GRACE_PERIOD → `premium`; EXPIRED / ON_HOLD / PAUSED → `free`; anything else → `null` (no change).
- Client must set Play's `obfuscatedAccountId` to the Supabase profile id at purchase time (web shell does this via `store.applicationUsername = () => userId`, `lib/utils/play-billing-client.ts:53`).

**`POST /api/google/notifications?token=<GOOGLE_PUBSUB_PUSH_TOKEN>`** — Pub/Sub RTDN push; verifies the query token, decodes base64 `message.data`, ignores the notification type and re-queries `purchases.subscriptionsv2.get`, then maps token→profile by (1) `profiles.google_purchase_token` or (2) `obfuscatedExternalAccountId`, and writes the tier. This is the server truth for renewals/cancellations — the Android app should NOT write downgrades itself, matching iOS's upgrade-only rule.

---

## 6. NOTIFICATIONS

### Local daily reminder (`Managers/NotificationsManager.swift`)
- Only one local reminder type exists. **No streak reminder and no Sunday recap are scheduled locally** anywhere in the iOS codebase.
- Identifier `"daily_chore_reminder"`; one-shot vacation variants `"daily_chore_reminder_day_{yyyy-MM-dd}"`.
- Content: title **"ChoreStar ⭐"**, body **"Time to check today's chores. A little progress goes a long way!"**, default sound.
- Trigger: repeating `UNCalendarNotificationTrigger` on hour+minute (second = 0).
- Preference storage (local only, no DB): `dailyReminderEnabled` (Bool) and `dailyReminderTime` (Double `timeIntervalSinceReferenceDate`; only hour/minute used). Default time **17:00**.
- Authorization requested lazily when the toggle is turned on, options `[.alert, .sound, .badge]`; `.denied` flips the toggle back off.
- **Vacation interaction**: while a vacation window is live, the repeating trigger is replaced by one-shot requests for each day OUTSIDE the window, out to 30 days past the window end, capped at 45 requests (iOS 64-request limit). `refreshDailyReminder(vacationWindow:)` is invoked from `loadFamilySettings()` so vacation days go quiet without visiting Settings. `cancelDailyReminder()` removes the repeating id plus deterministic one-shot ids for offsets −2…+90 days.

### Remote push ("Activity Alerts")
- Preference is a family-level DB column: `family_settings.activity_push_enabled` (bool; nil ⇒ on).
- Fired server-side; iOS posts `POST /api/push/chores-done` when a kid finishes all of a day's chores (`SupabaseManager.swift:1375-1401`); device tokens registered to `push_subscriptions`.
- Settings footer copy: "Activity alerts buzz when a kid finishes all chores or a routine. The daily reminder is a local nudge on this device."

---

## 7. Operation reference (file:line)

### Supabase (PostgREST via supabase-swift)
| Operation | Table / op | Ref |
|---|---|---|
| Load family settings | `family_settings.select().eq(user_id, effectiveUserId).limit(1)` | `SupabaseManager.swift:3381-3416` |
| Set custom accent | read `custom_theme` → merge `accentColor` → `update` | `:3429-3469` |
| Set activity push | `update({activity_push_enabled}).eq(user_id)` | `:3471-3497` |
| Set seasonal theme | read `custom_theme` → merge `autoSeasonal`/`seasonalTheme` → `update` | `:3499-3541` |
| Rewards/currency/timezone | `upsert({user_id, reward_mode, daily_reward_cents, weekly_bonus_cents, currency_code, timezone}, onConflict:"user_id")` | `:3543-3590` |
| Require approval | `update({require_approval}).eq(user_id)` | `:1481-1499` |
| Set vacation | `family_settings.upsert({user_id, vacation_starts_on, vacation_ends_on}, onConflict:"user_id")` + `vacation_periods` update-or-insert | `:3125-3210` |
| Clear vacation | `family_settings.update({vacation_starts_on: null, vacation_ends_on: null})` + trims the history row | `:3212-…` |
| Load vacation history | `vacation_periods.select("id, starts_on, ends_on").eq(user_id.lowercased())` | `:3098-3120` |
| Load profile | `profiles.select("id, subscription_type, kid_login_code, family_name, created_at").eq(id, uid)` | `:4069-4142` |
| Resolve membership | `family_members.select("family_id").eq(user_id, uid).limit(1)` | `:4144-4173` |
| Load sharing | `family_members.select("id, user_id, joined_at").eq(family_id, uid)` + `family_codes.select("code").eq(user_id, uid)` | `:4175-4227` |
| Create join code | `family_codes.insert({user_id, code})` | `:4229-4264` |
| Join family | `family_codes.select("user_id").eq(code)` → `family_members.insert({user_id, family_id})` | `:4266-4317` |
| Leave family | `family_members.delete().eq(user_id, uid)` | `:4319-4337` |
| Remove member | `family_members.delete().eq(id, memberId)` | `:4339-4353` |
| Update plan | `profiles.update({subscription_type}).eq(id, uid)` | `:4390-4423` |
| Record Apple txn | `profiles.update({apple_original_transaction_id}).eq(id, uid)` | `:4425-4453` |
| Change password | `client.auth.update(UserAttributes(password:))` | `:2279-2297` |
| Reward items | `reward_items` select/insert/update/delete | `:1754-1856` |

### Web endpoints called from Settings
| Endpoint | Method | Auth | Ref |
|---|---|---|---|
| `/api/account/delete` | POST `{confirm:"DELETE"}` | Bearer (or cookie) | iOS `SupabaseManager.swift:2224-2277`; server `chorestar-nextjs/app/api/account/delete/route.ts` |
| `/api/kid-login-code` | GET | Bearer (or cookie) | iOS `:4045-4067`; server `app/api/kid-login-code/route.ts` |
| `/api/google/verify` | POST `{purchaseToken, productId}` | **cookie only** | `app/api/google/verify/route.ts` |
| `/api/google/notifications?token=` | POST (Pub/Sub) | shared push token | `app/api/google/notifications/route.ts` |

### Android porting gotchas
1. `darkModePreference` and `soundEnabled` and the daily-reminder pair are **device-local**; everything themed/colour-related is family-level in `family_settings.custom_theme`.
2. All `custom_theme` writes MUST be read-merge-write — the web stores `whatsNewSeenVersion` and friends in the same JSON.
3. Seasonal ids need the camelCase mapping (`stPatricks`, `newYear`) when writing for web.
4. `family_settings` writes use **upsert on `user_id`** for rewards and vacation (an iOS/Android-created family may have no row) but plain **update** for `require_approval` / `activity_push_enabled` / `custom_theme` — those are silent no-ops on a missing row; consider upserting on Android.
5. All family writes key off `effectiveUserId` (owner id when you are a shared member), but `profiles` reads/writes key off your own `debugUserId`.
6. Money is integer cents everywhere; display decimals come from the currency table (0 for JPY/KRW/CLP).
7. `/api/google/verify` has no Bearer fallback today — add one before shipping a native (non-WebView) Android client.

