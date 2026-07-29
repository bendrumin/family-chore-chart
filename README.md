# ChoreStar

A family chore-tracking app that gamifies household tasks for kids — parents assign chores and build step-by-step routines, and kids log in **without an email or password** (just a family code + PIN) to check off tasks, run routines, earn allowance, and unlock badges.

**Live:** [chorestar.app](https://chorestar.app) · **Web** (Next.js) + **iOS** (native SwiftUI) + **Android** (Capacitor), all on one shared backend.

---

## Why it's interesting (the engineering, not the glue)

Most of the non-obvious work is in three places:

### 1. Email-free "kid mode" auth
Kids are minors — issuing them real accounts/emails is a privacy and UX non-starter. So kid login is a **custom auth layer** that sits alongside Supabase Auth (which handles parents):

- Parents set a per-child **4-digit PIN**, stored only as `sha256(pin + salt)` in `child_pins` — never in plaintext.
- A kid enters the **family code + PIN**; the server verifies the hash and mints a short-lived token in `kid_sessions` (8-hour expiry), returned as a bearer token.
- Kid-mode API calls run through the **service-role client server-side** to bypass row-level security, because a kid isn't a Supabase-authenticated user — the token *is* the authorization boundary.

This is the product's main differentiator and the most deliberate design decision in the codebase. Key files: [`app/kid-login/`](chorestar-nextjs/app/kid-login), [`app/api/child-pin/`](chorestar-nextjs/app/api/child-pin), [`lib/hooks/useChildPin.ts`](chorestar-nextjs/lib/hooks/useChildPin.ts).

### 2. Routines engine
Routines turn the app from a checkbox list into something kids run on their own: a drag-and-drop builder (`@dnd-kit`) produces ordered steps with per-step icons and optional countdown timers; a step player walks the kid through one task at a time with a progress bar, sounds, and a confetti finish. Completions are tracked (`steps_completed`, `duration_seconds`, `points_earned`) with **same-day double-completion prevention**. On iOS the current step's timer surfaces in the **Dynamic Island / Lock Screen** via Live Activities. Key files: [`components/routines/`](chorestar-nextjs/components/routines), [`app/api/routines/`](chorestar-nextjs/app/api/routines).

### 3. One backend, three clients
A single Supabase (Postgres + RLS) instance backs the web app, the native iOS app, and the Android wrapper. RLS is on every table; the service-role key is used **only** server-side for the kid/admin paths that must bypass it. The Android app is a **Capacitor shell** around the live web app — a deliberate call to avoid maintaining a third from-scratch native codebase while still shipping to the Play Store with native billing/push.

### 4. AI chore suggestions — cheap by design, with a graceful fallback
"Smart Chore Suggestions" calls **Claude Haiku 4.5** to generate age-appropriate, non-duplicate chore ideas personalized to each child (age, existing chores, completion rate, season). The interesting part is the engineering around the call, not the call itself:

- **One request, structured output.** A single call returns the whole set as JSON constrained by a schema (`output_config.format`) and re-validated with Zod server-side — no per-suggestion calls, no fragile string parsing.
- **Not call-heavy.** The model runs only on an explicit user action, and the result is cached in component state. The call hits Anthropic, not Supabase, so it adds zero database load — and Haiku 4.5 keeps a refresh well under a cent.
- **Graceful degradation.** With no API key or an unreachable/rate-limited API, the endpoint returns `503` and the UI silently falls back to a deterministic rule-based engine ([`lib/utils/chore-suggestions.ts`](chorestar-nextjs/lib/utils/chore-suggestions.ts)). The feature never breaks; it just gets less personalized.
- **Evals.** [`evals/suggest-chores.eval.ts`](chorestar-nextjs/evals/suggest-chores.eval.ts) runs representative child profiles through the real model and asserts the output is correctly shaped, deduped against existing chores, using known categories, and within reward bounds — `npm run eval:ai`.

Key files: [`lib/ai/suggest-chores.ts`](chorestar-nextjs/lib/ai/suggest-chores.ts), [`app/api/ai/suggest-chores/`](chorestar-nextjs/app/api/ai/suggest-chores), [`evals/`](chorestar-nextjs/evals).

---

## Architecture

```
family-chore-chart/
├── chorestar-nextjs/     # Primary web app — Next.js 15 (App Router), React 19, TS
├── ChoreStar-iOS/        # Native iOS app — SwiftUI, StoreKit 2, WidgetKit, Live Activities
├── ChoreStar-Android/    # Capacitor native shell around chorestar.app
├── backend/supabase/     # Postgres schema, RLS policies, SQL migrations
├── database-migrations/  # Standalone incremental migrations
└── frontend/             # Legacy vanilla-JS app (archived; 301-redirected)
```

**Web stack:** Next.js 15 App Router · React 19 · TypeScript (strict) · Tailwind · Supabase (Postgres + Auth + RLS) · Stripe · Anthropic SDK (Claude Haiku 4.5) · TanStack Query (server state) · Zod · Framer Motion · Playwright (E2E).

**iOS stack:** SwiftUI (iOS 16+) · Supabase Swift SDK · StoreKit 2 · WidgetKit + ActivityKit (home-screen widget + Dynamic Island).

**Android:** Capacitor 8 shell loading the deployed web app in a native WebView.

### Data model (core tables)
`profiles` · `children` · `chores` · `chore_completions` (7-day grid) · `routines` / `routine_steps` / `routine_completions` · `child_pins` / `kid_sessions` (kid auth) · `family_settings` · `family_members` / `family_invites` (co-parent sharing) · `achievement_badges`. Row-level security on all of them.

---

## Notable decisions & trade-offs

- **PIN auth over child accounts** — kids get independence without ever providing an email; the trade-off is a bespoke auth path (hashed PINs + session tokens + service-role) rather than leaning entirely on Supabase Auth.
- **Service-role only on the server** — kid-mode reads/writes bypass RLS deliberately, so that code path is confined to server route handlers and never ships the service key to a client.
- **Optimistic UI + TanStack Query** — checking off a chore updates instantly and reconciles with the server, which matters for the kid-facing flows.
- **Capacitor for Android, native for iOS** — iOS gets a first-class SwiftUI app (widgets, Live Activities, StoreKit); Android reuses the web app to avoid a third parallel codebase, trading some native polish for velocity.
- **Dual monetization** — Stripe on web, StoreKit 2 on iOS, entitlement synced upgrade-only (Stripe stays source of truth for downgrades).
- **AI as an enhancement, not a dependency** — the Claude-powered suggestions sit behind a `503`-triggered fallback to a local rule-based engine, so the feature still works (just less personalized) with no API key or a rate-limited API. One cheap, cached, schema-validated model call per refresh — chosen over a "call on every keystroke" design to keep token cost negligible.

---

## Local development

```bash
cd chorestar-nextjs
npm install
cp .env.local.example .env.local   # fill in Supabase / Stripe / Resend / Anthropic keys
npm run dev                         # http://localhost:3000
npm run test:e2e                    # Playwright E2E
npm run eval:ai                     # AI-suggestion evals (needs ANTHROPIC_API_KEY; skips without)
```

The AI suggestions feature needs `ANTHROPIC_API_KEY` (get one at [console.anthropic.com](https://console.anthropic.com)); without it, the app falls back to the local rule-based engine automatically.

iOS: open `ChoreStar-iOS/ChoreStar.xcodeproj` in Xcode (Supabase creds in `Info.plist`).
Android: `cd ChoreStar-Android && npm install && npx cap open android` (needs Android Studio).

Secrets are never committed — see [`chorestar-nextjs/.env.local.example`](chorestar-nextjs/.env.local.example) for the required variable names. Deeper architecture notes live in [`CLAUDE.md`](CLAUDE.md).

## License

MIT
