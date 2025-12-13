# Vercel Monorepo Build Fix

## Problem
Error: `The file "/vercel/path0/chorestar-nextjs/chorestar-nextjs/.next/routes-manifest.json" couldn't be found`

This indicates Vercel is looking in the wrong directory (duplicated path).

## Solution Options

### Option 1: Use Vercel Project Settings (Recommended)
Instead of using `builds` in `vercel.json`, configure in Vercel Dashboard:

1. Go to Vercel Project Settings
2. Set **Root Directory** to `chorestar-nextjs`
3. Remove Next.js build from `vercel.json` builds array
4. Let Vercel auto-detect Next.js

**Pros**: Simpler, Vercel handles it automatically
**Cons**: Requires separate Vercel projects for each app (or use subdomains)

### Option 2: Fix Build Configuration (Current)
Keep using `builds` but ensure correct paths:

1. Make sure `chorestar-nextjs/package.json` exists
2. Ensure build output goes to `chorestar-nextjs/.next`
3. Verify rewrites point to correct locations

### Option 3: Use Separate Projects
Create two Vercel projects:
- One for vanilla JS (root directory: `frontend`)
- One for Next.js (root directory: `chorestar-nextjs`)
- Use path prefixes or subdomains

## Current Configuration

The `vercel.json` uses:
- `builds` array with `@vercel/next` for Next.js
- Rewrites to route `/app/*` to Next.js app
- Static files from `frontend/`

## Troubleshooting Steps

1. **Check Build Logs**:
   - Look for where Next.js is building
   - Verify `.next` directory location

2. **Verify Package.json**:
   - Ensure `chorestar-nextjs/package.json` has correct build script
   - Check that dependencies are installed

3. **Check Rewrites**:
   - `/app/_next/*` should map to Next.js static assets
   - `/app/*` should map to Next.js pages

4. **Try Alternative**:
   - Remove Next.js from builds
   - Use Vercel Project Settings → Root Directory instead

## Recommended Fix

For a monorepo with both apps, the cleanest solution is:

1. **Remove Next.js from `vercel.json` builds**
2. **Create separate Vercel project for Next.js**:
   - Root Directory: `chorestar-nextjs`
   - Framework: Next.js (auto-detected)
3. **Keep vanilla JS in main project**:
   - Root Directory: `frontend` or root
   - Use current `vercel.json` without Next.js build

This avoids path conflicts and makes deployments simpler.

