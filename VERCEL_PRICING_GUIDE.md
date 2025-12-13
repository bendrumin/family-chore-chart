# Vercel Pricing Guide for Monorepo Setup

## Quick Answer

**You DON'T need to pay twice!** Here's why:

### Option 1: Single Project (Current Setup) - ✅ RECOMMENDED
- **Cost**: One project (free on Hobby plan)
- **Domain**: Single domain (`chorestar.app`)
- **Setup**: Both apps in one Vercel project with `vercel.json` routing
- **How it works**: 
  - `/app/*` → Next.js app (via rewrites)
  - `/*` → Vanilla JS app (default)
- **Pricing**: Counts as **1 project**

### Option 2: Two Separate Projects
- **Cost**: Two projects (still free on Hobby plan if under limits)
- **Domain**: Single domain with path prefixes
- **Setup**: Two Vercel projects, one domain
- **Pricing**: Counts as **2 projects** (but Hobby plan allows unlimited projects)

## Vercel Pricing Tiers

### Hobby Plan (Free)
- ✅ **Unlimited Projects** (this is key!)
- ✅ 100GB bandwidth/month
- ✅ Unlimited deployments
- ✅ Single domain per project (but you can add multiple)
- ✅ Path prefixes available

### Pro Plan ($20/month)
- ✅ Unlimited projects
- ✅ 1TB bandwidth/month
- ✅ Team collaboration
- ✅ Multiple domains per project
- ✅ Advanced features

## Recommendation: Single Project

**Use ONE Vercel project** (current setup) because:

1. ✅ **Simpler**: One deployment, one configuration
2. ✅ **Free**: Counts as 1 project (Hobby plan allows unlimited anyway)
3. ✅ **Easier routing**: All handled in `vercel.json`
4. ✅ **Shared resources**: Same domain, same environment variables
5. ✅ **Easier management**: One dashboard, one set of logs

## When to Use Two Projects

Only consider two projects if:

1. You want **completely separate deployments** (deploy one without the other)
2. You want **different environments** (staging vs production)
3. You want **different teams** managing each app
4. You need **separate analytics/monitoring**

But even then, you can use:
- **Path prefixes**: `app.chorestar.app` (subdomain) - still one project
- **Branch deployments**: Different branches for different apps
- **Preview deployments**: Test each app separately

## Current Setup (Single Project) - Cost Breakdown

```
Vercel Project: family-chore-chart
├── Next.js App (chorestar-nextjs/)
│   └── Accessible at: /app/*
├── Vanilla JS App (frontend/)
│   └── Accessible at: /*
└── API Routes (frontend/api/)
    └── Accessible at: /api/*

Total Cost: 1 project = FREE (Hobby plan)
```

## Two Projects Setup - Cost Breakdown

```
Project 1: chorestar-vanilla
├── Vanilla JS App
└── Domain: chorestar.app

Project 2: chorestar-nextjs  
├── Next.js App
└── Domain: chorestar.app/app/* (path prefix)

Total Cost: 2 projects = Still FREE (Hobby plan allows unlimited)
```

## Important Notes

1. **Hobby Plan**: Allows **unlimited projects** - so even 2 projects = free
2. **Bandwidth**: Shared across all projects on your account
3. **Deployments**: Each project has its own deployment history
4. **Path Prefixes**: Available on both Hobby and Pro plans

## Best Practice

**Stick with ONE project** (current setup) because:
- ✅ Simpler to manage
- ✅ Same cost (free)
- ✅ Easier routing
- ✅ Shared environment variables
- ✅ Single deployment pipeline

Only split into two projects if you have a specific need (like separate teams or completely independent release cycles).

## Summary

**You won't pay twice!** 

- **Single project**: FREE (1 project)
- **Two projects**: Still FREE (Hobby plan = unlimited projects)

The choice is about **management complexity**, not cost. For your use case (testing new version alongside old), **one project is better**.

