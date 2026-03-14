# CLAUDE.md — ChoreStar

## Security — Environment Variables

**Do NOT read, output, log, or include the contents of any of these files:**
- `.env`, `.env.local`, `.env.production`, `.env.test` (in any directory)
- `setup-env.sh`
- Any file containing API keys, secrets, or credentials

These files contain production secrets (Supabase keys, Stripe keys, Resend API keys, etc.) and must never appear in chat output, commits, pull requests, or logs. When referencing environment variables, use the variable *names* only (e.g. `NEXT_PUBLIC_SUPABASE_URL`) — never their values. For setup guidance, refer to `.env.local.example` which contains only placeholder values.

## What This Project Is

ChoreStar is a family chore tracking app that gamifies household tasks for kids. Parents create children with avatars, assign chores with reward amounts, and build step-by-step routines (morning, bedtime, afterschool). Kids log in with a PIN (no email needed), check off chores, earn allowance, unlock achievement badges, and get confetti celebrations on completion.

**Live at:** [chorestar.app](https://chorestar.app)

## Repository Structure

This is a monorepo with two active apps sharing a single Supabase backend:

```
family-chore-chart/
├── chorestar-nextjs/       # Primary web app — Next.js 15, TypeScript, Tailwind
├── ChoreStar-iOS/          # Native iOS app — SwiftUI
├── backend/supabase/       # Supabase schema & SQL migrations
├── database-migrations/    # Standalone migration files
├── frontend/               # Legacy vanilla JS app (archived, do not modify)
├── deployment/             # Docker config for legacy frontend
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
- **TanStack Query** for server state, **Zustand** for client state
- **Framer Motion** for animations
- **React Hook Form** + **Zod** for form validation
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
- **TypeScript** is strict but `ignoreBuildErrors: true` in next.config.ts due to pre-existing Supabase type inference issues

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

Deployed on **Vercel**. The root `vercel.json` handles routing: `/` serves the Next.js app, `/legacy` serves the archived frontend.

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

### Schema & Migrations

- Base schema: `backend/supabase/schema.sql`
- Incremental migrations: `backend/supabase/migrations/` and `database-migrations/`
- See `chorestar-nextjs/DATABASE_SETUP.md` for RLS policy details

## Key Features Across Both Platforms

- **Parent dashboard** with child management, chore assignment, and weekly stats
- **Kid mode** with PIN login, large tap targets, confetti celebrations
- **Routines** with step-by-step execution, optional timers, and completion tracking
- **Achievement badges** for streaks, perfect weeks, time-based goals
- **Allowance tracking** with configurable reward modes (per-chore or daily)
- **Dark mode** and **seasonal themes** (auto-detected by date)
- **Family sharing** with invite links and role-based access
