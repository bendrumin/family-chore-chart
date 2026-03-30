export function GET() {
  const content = `# ChoreStar

> A family chore tracking app that gamifies household tasks for kids. Parents assign chores, build step-by-step routines, and track allowance. Kids get their own PIN-based login — no email required — to check off chores, complete routines, earn rewards, and unlock achievement badges.

Live at: https://chorestar.app

## What ChoreStar Does

- **Parent Dashboard**: Create children with avatars, assign chores with reward amounts, view weekly completion stats and analytics charts
- **Kid Login**: Children log in with a family code + 4-digit PIN (no email needed). They get a dedicated kid-mode dashboard with large buttons, playful animations, and confetti celebrations
- **Routines**: Parents build structured morning/bedtime/afterschool routines with drag-and-drop step ordering, optional per-step timers, and completion tracking. Kids step through routines one task at a time
- **Allowance Tracking**: Configurable reward modes (per-chore or daily), currency settings, and weekly earning summaries
- **Achievement Badges**: Streak tracking, perfect weeks, time-based goals like "Early Bird"
- **Family Sharing**: Invite co-parents with role-based access via invite links
- **Dark Mode & Seasonal Themes**: Auto-detected holiday and seasonal color themes
- **Smart Chore Suggestions**: Age-filtered, seasonal, category-diverse suggestions for new chores

## Tech Stack

- **Web App**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Supabase (PostgreSQL + Auth + RLS), Stripe, TanStack Query, Framer Motion
- **iOS App**: SwiftUI (iOS 16+), Supabase Swift SDK
- **Database**: Supabase PostgreSQL with Row-Level Security on all tables
- **Payments**: Stripe (monthly, annual, lifetime plans + webhooks)
- **Deployment**: Vercel

## Public Pages

- [Home](https://chorestar.app) — Marketing homepage with feature overview and TestFlight signup
- [How-To Guides](https://chorestar.app/how-to) — Step-by-step tutorials for parents
- [Blog](https://chorestar.app/blog) — Parenting tips and chore strategies
- [Partners](https://chorestar.app/partners) — Partnership information
- [Privacy Policy](https://chorestar.app/privacy) — Data handling and privacy practices

## Key Differentiators

1. **Kid login without email** — Kids use a family code + PIN, not email accounts
2. **Step-by-step routines** — Not just a checklist, but a guided workflow with timers and celebrations
3. **Gamification** — Points, badges, confetti, and sound effects make chores feel like a game
4. **Cross-platform** — Web app + native iOS app sharing the same backend

## Contact

ChoreStar is built and maintained independently. For questions, visit https://chorestar.app.
`

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  })
}
