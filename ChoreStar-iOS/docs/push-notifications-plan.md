# iOS Push Notifications — Design & Implementation Plan

**Status:** planned for v1.1 (after the current App Store submission is accepted)
**Decision:** direct APNs, **iOS only** — no OneSignal/Firebase, no cross-platform sender.
**Author context:** ChoreStar iOS (SwiftUI) + shared Supabase backend. The app already
has *local* notifications ([NotificationsManager.swift](../ChoreStar/Managers/NotificationsManager.swift),
daily reminders via `UNCalendarNotificationTrigger`). This adds *remote* push.

---

## Why remote push (vs. the local notifications we already ship)

Local notifications are device-scheduled and already cover "remind me at 8am."
Remote push adds the **event-driven, cross-person** moments a server triggers:

- Parent: "Emma finished all her chores! 🎉"
- Kid: "Dad added a new chore" / "Time for your bedtime routine"
- Co-parent: "Sarah approved Liam's allowance"
- Server-computed: "Emma's 7-day streak is about to break", weekly summary

**Flagship trigger to ship first:** chore/routine completed → notify the parent
(parent devices always have tokens; highest value, simplest path).

---

## Architecture

```
iOS app  ──register──▶  device token  ──upsert──▶  Supabase (device_push_tokens)
                                                        │
DB event (chore_completions insert) ──trigger/webhook──▶ Supabase Edge Function (sender)
                                                        │  signs ES256 JWT with APNs .p8
                                                        ▼
                                          api.push.apple.com  ──alert──▶  parent's iPhone
```

- **Sender home:** Supabase Edge Function (Deno). Invoked by DB webhooks for event
  pushes and by `pg_cron` for scheduled ones (weekly summary). (Alternative: a
  Next.js API route on Vercel — familiar, but the data + triggers live in Supabase,
  so an Edge Function keeps it co-located.)

---

## Piece 1 — Apple Developer setup (one-time)

- [ ] Apple Developer → **Keys** → create an **APNs Auth Key (.p8)**. One key covers
      sandbox + production and all apps. Record **Key ID** + **Team ID**.
- [ ] Store as backend secrets (Supabase Edge Function secrets): `APNS_KEY_P8`
      (the .p8 contents), `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID`
      (`com.chorestar.ChoreStar`). **Never commit the .p8.**
- [ ] Xcode → Signing & Capabilities → add **Push Notifications** + **Background
      Modes → Remote notifications**. Confirms `aps-environment` in
      `ChoreStar.entitlements` and enables Push on the App ID.

## Piece 2 — iOS app (SwiftUI)

- [ ] Add a `UIApplicationDelegateAdaptor` — SwiftUI needs an `AppDelegate` to receive
      `didRegisterForRemoteNotificationsWithDeviceToken` / `didFailToRegister…`.
- [ ] After the user grants notification permission (reuse `NotificationsManager`'s
      flow), call `UIApplication.shared.registerForRemoteNotifications()`.
- [ ] In the delegate: convert token `Data` → hex string; upsert to Supabase tied to
      the authenticated user (and `child_id` when in kid-mode, so we can push to a
      specific kid's device). Re-register on every launch (tokens rotate) and refresh
      `last_seen_at`.
- [ ] `UNUserNotificationCenterDelegate`: foreground presentation (banner+sound) and
      **tap handling** → parse payload `{ type, childId, deepLink }` → route to screen.

## Piece 3 — Server sender (Supabase Edge Function)

- [ ] APNs HTTP/2 `POST https://api.push.apple.com/3/device/{token}`
      (prod) or `…sandbox.push.apple.com` (dev builds).
- [ ] Auth: **ES256 JWT** signed with the .p8 — header `{ alg: ES256, kid: KEY_ID }`,
      payload `{ iss: TEAM_ID, iat }`. Header `apns-topic: com.chorestar.ChoreStar`,
      `apns-push-type: alert`. Cache the JWT up to ~1h (APNs allows reuse), refresh before.
- [ ] Payload: `{ aps: { alert: { title, body }, sound: "default", badge }, type, childId }`.
- [ ] Responses: `200` ok · `410`/`BadDeviceToken`/`Unregistered` → deactivate token ·
      `429`/`5xx` → backoff + retry.
- [ ] **Environment gotcha:** TestFlight/dev builds mint *sandbox* tokens; App Store
      builds mint *production* tokens. Store each token's environment and send to the
      matching host, or you'll get silent non-delivery.

---

## Data model

New table `device_push_tokens` (RLS: a user manages only their own rows; the sender
uses the service-role key):

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| user_id | uuid → auth.users | owner (parent) |
| child_id | uuid null → children | set when token registered in kid-mode |
| platform | text | `'ios'` (future-proofs for `'android'`/`'web'`) |
| token | text unique | APNs device token (hex) |
| environment | text | `'sandbox'` \| `'production'` |
| device_name | text null | e.g. "Ben's iPhone" |
| is_active | bool | flipped false on 410/Unregistered |
| created_at / last_seen_at | timestamptz | |

(Chose a dedicated table over extending `push_subscriptions`, which is Web-Push shaped.)

---

## Native iOS capabilities to lean into (all first-party, no SDKs)

Since we're staying fully native, layer these in as we go — they're pure
`UserNotifications`/APNs features:

- **Interruption levels** — send streak-about-to-break / time-critical reminders at
  `.timeSensitive` so they break through Focus; keep routine nudges `.active`.
- **Notification action buttons** (`UNNotificationCategory` + actions) — e.g. a
  co-parent taps **Approve** on the "allowance pending" push straight from the lock
  screen; a parent taps **Nice! 🎉** to react. Handled in the delegate, no app launch.
- **Communication Notifications** (`INSendMessageIntent` donation) — render
  "Emma finished her chores" with Emma's avatar, like a Messages notification. Nice
  polish for a family app; a Phase 3 enhancement.
- **Rich media** via a Notification Service Extension — badge art / celebration image.
- **Provisional authorization** (`.provisional`) — deliver quietly to Notification
  Center without a permission prompt to start, then earn the full opt-in. Optional.
- **Live Activities** are already in use for routine timers — keep that separate from
  this alert-push work.

## Preferences & privacy

- Per-user notification toggle in Settings (extend existing notification prefs); gate
  sends on it. Optional quiet-hours later.
- App Review: push needs a clear purpose — family activity notifications are fine.
  Add a pre-permission rationale screen before the system prompt to lift opt-in rate.

## Testing

- `xcrun simctl push <device> com.chorestar.ChoreStar payload.apns` tests
  **payload handling + tap routing** in the simulator (no live APNs round-trip).
- Real device + sandbox APNs for the true end-to-end path.

---

## Rough effort

| Phase | Work | Est. |
|---|---|---|
| 1 | Capability + AppDelegate + token registration + `device_push_tokens` + RLS | ~½ day |
| 2 | Edge Function sender (JWT + APNs) + first trigger (chore done → parent) | ~1 day |
| 3 | More triggers, weekly-summary cron, prefs UI, polish | ~1–2 days |

Phase 1 (app-side plumbing) is independent of the sender and can start any time —
it doesn't affect the in-review build (it ships in the *next* version).
