# CLAUDE.md — ChoreStar

## Security — Environment Variables

**Do NOT read, output, log, or include the contents of any of these files:**
- `.env`, `.env.local`, `.env.production`, `.env.test` (in any directory)
- `setup-env.sh`
- Any file containing API keys, secrets, or credentials

These files contain production secrets (Supabase keys, Stripe keys, Resend API keys, etc.) and must never appear in chat output, commits, pull requests, or logs. When referencing environment variables, use the variable *names* only (e.g. `NEXT_PUBLIC_SUPABASE_URL`) — never their values. For setup guidance, refer to `.env.local.example` which contains only placeholder values.

## What This Project Is

ChoreStar is a family chore tracking app that gamifies household tasks for kids. Parents create children with avatars, assign chores with reward amounts, and build step-by-step routines (morning, bedtime, afterschool). Kids get their own login — no email required, just a family code and a PIN — so they can independently check off chores, run through routines, earn allowance, unlock achievement badges, and get confetti celebrations when they finish.

**Live at:** [chorestar.app](https://chorestar.app)

### Kid Login — How It Works

Kid login is a core differentiator. Children don't need email accounts or passwords. The flow:

1. **Parent sets up a family code** — auto-generated 6-character code shown in Settings > Family tab, stored in `profiles.kid_login_code`
2. **Parent sets a PIN per child** — 4-digit PIN set in the child's edit modal, hashed and stored in `child_pins` (never stored in plain text)
3. **Kid goes to `/kid-login`** — enters the family code, which loads all children in that family
4. **Kid picks their name and enters their PIN** — verified via `POST /api/child-pin/verify`, which creates a temporary session token in `kid_sessions` (expires in 8 hours)
5. **Kid lands on `/kid/[childId]`** — a dedicated kid-mode dashboard with large buttons, playful animations, and their routines

The kid session token is stored in `localStorage` under the `kidMode` key. Kid-mode API requests pass it as `Authorization: Bearer <token>`. The service-role client is used server-side to bypass RLS for kid operations since kids aren't authenticated Supabase users.

Key files: `app/kid-login/`, `app/kid/[childId]/`, `app/api/child-pin/`, `lib/hooks/useChildPin.ts`

### Routines — The Killer Feature

Routines are what make ChoreStar more than a checkbox app. Parents build structured, step-by-step routines (morning, bedtime, afterschool, or custom) that kids execute independently:

1. **Parent creates a routine** via the routine builder modal (`components/routines/routine-builder-modal.tsx`) — drag-and-drop step ordering with `@dnd-kit`, per-step icons, optional timers, and a reward amount
2. **Kid taps "Start" on their dashboard** — opens the routine player (`app/kid/[childId]/routine/[routineId]/page.tsx`)
3. **Kid steps through each task one at a time** — large "Done!" button, optional countdown timer per step, progress bar at the top
4. **On completion** — confetti celebration, sound effects, points earned, and the routine is marked done for the day via `POST /api/routines/[routineId]/complete`
5. **Completion is tracked** in `routine_completions` with `steps_completed`, `steps_total`, `duration_seconds`, and `points_earned`

Routines support four types (`morning`, `bedtime`, `afterschool`, `custom`), each with a default icon and color. The routine player prevents double-completion on the same day. Completed routines show a "Done!" badge on the kid dashboard.

Key files: `components/routines/`, `lib/hooks/useRoutines.ts`, `app/api/routines/`, `app/kid/[childId]/routine/`

## Repository Structure

This is a monorepo with two active apps sharing a single Supabase backend:

```
family-chore-chart/
├── chorestar-nextjs/       # Primary web app — Next.js 15, TypeScript, Tailwind
├── ChoreStar-iOS/          # Native iOS app — SwiftUI
├── backend/supabase/       # Supabase schema & SQL migrations
├── database-migrations/    # Standalone migration files
├── frontend/               # Legacy vanilla JS app (archived, do not modify — 301 redirects in vercel.json)
├── deployment/             # Docker config for legacy frontend (archived)
├── docs/                   # Assets & recordings
├── email-templates/        # Magic link email HTML
└── vercel.json             # Vercel routing, rewrites, CSP headers
```

## Next.js App (`chorestar-nextjs/`)

### Tech Stack

- **Next.js 15** with App Router, **React 19**, **TypeScript** (strict mode)
- **Tailwind CSS** for styling
- **Supabase** (PostgreSQL + Auth + Row-Level Security)
- **Stripe** for payments (monthly, annual, lifetime plans + webhooks)
- **TanStack Query** for server state
- **Framer Motion** for animations
- **Zod** for validation
- **Sonner** for toast notifications
- **Lucide React** for icons
- **Playwright** for E2E tests

### Key Directories

```
chorestar-nextjs/
├── app/                    # App Router pages & API route handlers
│   ├── api/                # REST endpoints (Stripe, auth, family, routines, child-pin)
│   ├── dashboard/          # Protected parent dashboard
│   ├── kid/                # Kid-mode pages (large buttons, celebrations)
│   └── kid-login/          # PIN-based kid login
├── components/             # React components organized by feature
│   ├── auth/               # Login, signup, forgot/reset password
│   ├── children/           # Child list, add/edit modals
│   ├── chores/             # Chore list, 7-day completion grid
│   ├── dashboard/          # Dashboard layout, weekly stats
│   ├── routines/           # Routine builder, step player, celebration
│   ├── settings/           # Settings tabs (appearance, billing, family)
│   └── ui/                 # Reusable primitives (Button, Card, Input, Modal)
├── lib/
│   ├── supabase/           # Client/server/service-role helpers + generated types
│   ├── contexts/           # React contexts (settings, themes)
│   ├── constants/          # Brand colors, changelog entries
│   └── utils/              # Stripe helpers, date utilities, logger
├── middleware.ts           # Auth guards: protects /dashboard, redirects logged-in from /login
└── e2e/                    # Playwright E2E test suites
```

### Conventions

- **Imports** use the `@/*` path alias mapped to the project root
- **Client components** are marked with `'use client'` at the top
- **Supabase types** come from `@/lib/supabase/database.types` (auto-generated via `npx supabase gen types`)
- **Supabase client** is created via `createClient()` from `@/lib/supabase/client` (browser) or `@/lib/supabase/server` (server components/route handlers)
- **Service-role client** at `@/lib/supabase/service-role` bypasses RLS for admin operations (kid sessions, routine completions)
- **API routes** are Next.js Route Handlers under `app/api/`
- **User feedback** uses Sonner toasts (`toast.success()`, `toast.error()`)
- **TypeScript** is strict — currently at zero errors. Keep it that way.
- **Dark mode** — every UI element must include `dark:` variants. Never use hardcoded hex colors in inline `style={{ }}` for text, borders, or backgrounds that appear on both light and dark surfaces. Use Tailwind classes like `text-indigo-500 dark:text-indigo-400` instead.
- **Brand gradient** is indigo→purple (`#6366f1` → `#8b5cf6`), defined in `lib/constants/brand.ts`. The Button `gradient` variant uses `from-indigo-500 to-purple-500`.
- **Changelog** lives in `lib/constants/changelog.ts`. Bump `LATEST_CHANGELOG_VERSION` and add a new entry when shipping user-facing features. The "What's New" modal auto-shows on dashboard if the user hasn't seen the latest version.

### Development

```bash
cd chorestar-nextjs
npm install
cp .env.local.example .env.local   # then fill in credentials
npm run dev                         # http://localhost:3000
```

### Required Environment Variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side Supabase access (bypasses RLS) |
| `NEXT_PUBLIC_APP_URL` | App URL for redirects |
| `STRIPE_SECRET_KEY` | Stripe API secret |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_ANNUAL` / `STRIPE_PRICE_LIFETIME` | Stripe Price IDs |
| `RESEND_API_KEY` | Email sending via Resend |

### Testing

Playwright E2E tests live in `chorestar-nextjs/e2e/`. Test config is in `playwright.config.ts`. Tests require a `.env.test` file with `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, `TEST_FAMILY_CODE`, and `TEST_CHILD_PIN`.

```bash
npm run test:e2e          # run all E2E tests
```

### Build & Deploy

```bash
npm run build             # production build
npm run lint              # ESLint
```

Deployed on **Vercel**. The root `vercel.json` handles routing: `/` serves the Next.js app. Legacy `/app/*` and `/legacy/*` paths 301-redirect to their Next.js equivalents.

## iOS App (`ChoreStar-iOS/`)

### Tech Stack

- **SwiftUI** (iOS 16+)
- **Supabase Swift SDK** 2.x via Swift Package Manager
- **Xcode 15+**

### Key Directories

```
ChoreStar-iOS/ChoreStar/
├── ChoreStarApp.swift          # App entry point
├── ContentView.swift           # Root view with auth state routing
├── Models/
│   ├── Models.swift            # Child, Chore, ChoreCompletion, FamilySettings
│   ├── Routine.swift           # Routine, RoutineStep, RoutineCompletion
│   └── Profile.swift           # User profile model
├── Managers/
│   ├── SupabaseManager.swift   # Central Supabase client, all data operations
│   └── SoundManager.swift      # Sound effects for celebrations
├── Views/
│   ├── AuthView.swift          # Login/signup
│   ├── DashboardView.swift     # Parent dashboard
│   ├── ChildrenView.swift      # Child list
│   ├── ChoresView.swift        # Chore management
│   ├── RoutinesListView.swift  # Routine list
│   ├── RoutinePlayerView.swift # Step-by-step routine execution
│   ├── ConfettiView.swift      # Celebration animation
│   └── ...                     # AddEdit, Avatar, Settings, History views
├── Theme/
│   ├── Colors.swift            # Brand color palette
│   ├── ViewModifiers.swift     # Reusable SwiftUI modifiers
│   └── SeasonalThemes.swift    # Holiday/seasonal color themes
└── fastlane/metadata/          # App Store metadata
```

### Conventions

- **Architecture:** `SupabaseManager` is the single `ObservableObject` holding all data logic. Views observe it via `@EnvironmentObject`.
- **State management:** `@Published` properties on the manager, `@StateObject` and `@EnvironmentObject` in views
- **Supabase import:** Wrapped in `#if canImport(Supabase)` for conditional compilation
- **Configuration:** `SUPABASE_URL` and `SUPABASE_ANON_KEY` are read from `Info.plist` at runtime

### Development

Open `ChoreStar-iOS/ChoreStar.xcodeproj` in Xcode. The Supabase Swift SDK is pulled automatically via SPM. Set your Supabase credentials in `Info.plist`.

## Database (Supabase)

Both apps share the same Supabase PostgreSQL database with Row-Level Security on all tables.

### Core Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (extends `auth.users`) |
| `children` | Children with names, avatars, PINs |
| `chores` | Chores with reward amounts, categories, icons |
| `chore_completions` | Daily completion tracking (7-day grid) |
| `family_settings` | Per-family config (currency, timezone, reward mode, theme) |
| `family_members` | Family sharing membership with roles |
| `family_invites` | Invite links for co-parents |
| `routines` | Morning/bedtime/afterschool routines |
| `routine_steps` | Individual steps within routines (with optional timers) |
| `routine_completions` | Routine completion records |
| `child_pins` | Hashed PINs for kid login |
| `kid_sessions` | Temporary sessions for kid mode |
| `achievement_badges` | Earned badges (streaks, Early Bird, etc.) |
| `push_subscriptions` | Web push notification subscriptions |
| `testflight_waitlist` | iOS TestFlight beta email signups |

### Schema & Migrations

- Base schema: `backend/supabase/schema.sql`
- Incremental migrations: `backend/supabase/migrations/` and `database-migrations/`
- See `chorestar-nextjs/DATABASE_SETUP.md` for RLS policy details

## Key Features Across Both Platforms

- **Parent dashboard** with child management, chore assignment, and weekly stats
- **Kid login** — email-free PIN-based auth so kids can use the app independently (see "Kid Login" above)
- **Routines** — drag-and-drop builder, step-by-step player with timers, confetti celebrations (see "Routines" above)
- **Achievement badges** for streaks, perfect weeks, time-based goals
- **Allowance tracking** with configurable reward modes (per-chore or daily)
- **Dark mode** and **seasonal themes** (auto-detected by date)
- **Family sharing** with invite links and role-based access
- **Smart chore suggestions** — rule-based engine in `lib/utils/chore-suggestions.ts` (age-filtered, seasonal, category-diverse)
- **Analytics charts** (Recharts) — weekly completion trend line + per-child bar chart on the Insights tab
- **Printable weekly templates** (jsPDF) — themed PDFs (Stars/Rainbow/Minimal) on the Downloads tab
- **How-to guides** — timeline-style tutorials on `/how-to`
- **TestFlight waitlist** — email signup stored in `testflight_waitlist`, admin notified via Resend

## Known Gotchas

- The `testflight_waitlist` table is **not** in the auto-generated Supabase types (`database.types.ts`). The API route casts the client with `as any`. If you regenerate types, this table will still be absent unless you add it manually or run `npx supabase gen types` against the live database.
- Kid-mode pages (`/kid/*`, `/kid-login/*`) intentionally use light-only `bg-white` buttons on gradient backgrounds — this is by design, not a dark mode gap.
- `@supabase/ssr` must stay compatible with `@supabase/supabase-js`. Version 0.9.0 pairs with 2.97.0. Mismatched versions cause cascading `never` type errors across every Supabase query.
