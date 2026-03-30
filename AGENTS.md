# AGENTS.md — ChoreStar

This file provides context for AI coding assistants (GitHub Copilot, Cursor, Windsurf, Cline, etc.) working on this codebase. For Cursor-specific rules, see `CLAUDE.md`.

## Security

**Never read, output, or commit** the contents of `.env`, `.env.local`, `.env.production`, `.env.test`, or `setup-env.sh`. These contain production secrets. Reference environment variable **names** only (e.g. `NEXT_PUBLIC_SUPABASE_URL`), never values. See `.env.local.example` for placeholder structure.

## Project Overview

ChoreStar is a family chore tracking app with gamification. Two apps share one Supabase backend:

- **`chorestar-nextjs/`** — Primary web app (Next.js 15, React 19, TypeScript, Tailwind CSS, Stripe)
- **`ChoreStar-iOS/`** — Native iOS companion app (SwiftUI, iOS 16+, Supabase Swift SDK)
- **`backend/supabase/`** — Database schema and SQL migrations
- **`frontend/`** — Legacy vanilla JS app (archived, do not modify)

Live at: https://chorestar.app

## Core Concepts

- **Kid Login**: Children authenticate with a family code + 4-digit PIN (no email). PINs are hashed in `child_pins`. Sessions stored in `kid_sessions` (8-hour TTL).
- **Routines**: Step-by-step morning/bedtime/afterschool task sequences with optional timers and completion celebrations.
- **Family Sharing**: Co-parents join via invite links. Role-based access via `family_members`.

## Web App Conventions (`chorestar-nextjs/`)

- Path alias: `@/*` maps to project root
- Client components: `'use client'` directive at top
- Supabase client: `@/lib/supabase/client` (browser), `@/lib/supabase/server` (server), `@/lib/supabase/service-role` (admin/RLS bypass)
- Supabase types: `@/lib/supabase/database.types` (auto-generated)
- Toasts: Sonner (`toast.success()`, `toast.error()`)
- TypeScript strict mode — zero errors, keep it that way
- Dark mode: always include `dark:` Tailwind variants. No hardcoded hex in inline styles for themed surfaces
- Brand gradient: indigo→purple (`#6366f1` → `#8b5cf6`)
- Icons: Lucide React
- Animations: Framer Motion
- State: TanStack Query for server state

## iOS App Conventions (`ChoreStar-iOS/`)

- `SupabaseManager` is the singleton `ObservableObject` for all data logic
- `ThemeManager` is the singleton `ObservableObject` for seasonal theme colors
- Views use `@EnvironmentObject` to access managers
- Deployment target: iOS 16 — do not use iOS 17+ APIs without availability checks
- Supabase import wrapped in `#if canImport(Supabase)`

## Database

Supabase PostgreSQL with RLS on all tables. Key tables: `profiles`, `children`, `chores`, `chore_completions`, `family_settings`, `routines`, `routine_steps`, `routine_completions`, `child_pins`, `kid_sessions`, `achievement_badges`.

Schema: `backend/supabase/schema.sql`. Migrations: `backend/supabase/migrations/` and `database-migrations/`.

## Development

```bash
# Web app
cd chorestar-nextjs && npm install && npm run dev

# iOS app
open ChoreStar-iOS/ChoreStar.xcodeproj
```

## Known Issues

- `testflight_waitlist` table is not in auto-generated Supabase types — API route uses `as any`
- Kid-mode pages use light-only buttons on gradient backgrounds (by design)
- `@supabase/ssr` 0.9.0 must pair with `@supabase/supabase-js` 2.97.0
