# ChoreStar — Next.js

A family chore tracking app built with Next.js 15 (App Router), Supabase, Tailwind CSS, and Stripe.

**Live:** [chorestar.app](https://chorestar.app)

## Features

- **Dashboard** — Manage children, chores, and routines with a 7-day completion grid
- **Kid Mode** — PIN-based kid login with large buttons, celebrations, and step-by-step routines
- **Payments** — Stripe integration (monthly, annual, lifetime plans) with webhook handling
- **Dark Mode** — Auto (OS preference + time-based), light, or dark
- **Seasonal Themes** — Holiday and seasonal color themes with auto-detection
- **Family Sharing** — Invite links for co-parents with role-based access
- **PWA** — Installable with service worker and offline support
- **Accessibility** — Focus traps, skip links, ARIA labels, reduced motion support
- **SEO** — Metadata, Open Graph, sitemap, robots.txt, canonical URLs

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL + Auth + RLS) |
| Payments | Stripe (Checkout, Subscriptions, Portal, Webhooks) |
| State | TanStack Query |
| Animations | Framer Motion |
| Icons | Lucide React |
| Notifications | Sonner |
| Analytics | Google Analytics |

## Quick Start

```bash
cd chorestar-nextjs
npm install
cp .env.local.example .env.local
# Fill in your Supabase and Stripe credentials
npm run dev
```

Visit **http://localhost:3000**

## Environment Variables

See `.env.local.example` for the full list. Key variables:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase project
- `SUPABASE_SERVICE_ROLE_KEY` — Server-side Supabase access (webhooks)
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` — Stripe API
- `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_ANNUAL` / `STRIPE_PRICE_LIFETIME` — Stripe Price IDs

## Project Structure

```
chorestar-nextjs/
├── app/                    # Pages & API routes
│   ├── api/               # Stripe, auth, family API endpoints
│   ├── dashboard/         # Protected dashboard
│   ├── kid/               # Kid-mode pages
│   ├── kid-login/         # PIN login for kids
│   ├── how-to/            # How-to guides (public)
│   ├── partners/          # Partners page (public)
│   └── payment/           # Payment success/cancel
├── components/            # React components
│   ├── auth/              # Login, signup forms
│   ├── brand/             # Logo component
│   ├── children/          # Child list, add/edit modals
│   ├── chores/            # Chore list, completion grid
│   ├── dashboard/         # Dashboard layout, weekly stats
│   ├── home/              # Logged-in home page
│   ├── layout/            # SiteNav, SiteFooter
│   ├── routines/          # Routine builder, celebration
│   ├── settings/          # Settings tabs (appearance, billing, family)
│   └── ui/                # Button, Card, Input, Modal, etc.
├── lib/
│   ├── supabase/          # Client, server, service-role, types
│   ├── contexts/          # Settings context (themes)
│   ├── constants/         # Brand colors, changelog
│   └── utils/             # Stripe, date helpers, logger
├── middleware.ts          # Auth protection & redirects
└── public/                # Static assets, icons, manifest
```

## Scripts

```bash
npm run dev        # Development server
npm run build      # Production build
npm run start      # Production server
npm run lint       # ESLint
```

## Database

Uses Supabase PostgreSQL with Row-Level Security. See [`DATABASE_SETUP.md`](./DATABASE_SETUP.md) for schema details.

Key tables: `profiles`, `children`, `chores`, `chore_completions`, `family_settings`, `family_invites`, `family_members`

## Deployment

Deployed on Vercel. Environment variables are configured in the Vercel dashboard.

```bash
vercel --prod
```

## Troubleshooting

See [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md).

## License

MIT
