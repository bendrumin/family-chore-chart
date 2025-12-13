# Vercel Deployment Update Guide

## Current Situation

You're currently set to deploy from the `frontend/` folder (vanilla JS only). Now you need to deploy **both** apps from the **root** of the repository.

## What Needs to Change

### ✅ Good News: Your `vercel.json` is Already Configured!

Your current `vercel.json` already handles both apps:
- ✅ Next.js build from `chorestar-nextjs/`
- ✅ Vanilla JS static files from `frontend/`
- ✅ API routes from `frontend/api/`
- ✅ Routing via rewrites

### ⚠️ What You Need to Update: Vercel Project Settings

You need to change the **Root Directory** in Vercel Dashboard:

## Step-by-Step Update

### 1. Go to Vercel Dashboard
- Navigate to your project: `family-chore-chart`
- Go to **Settings** → **General**

### 2. Update Root Directory
**Current Setting** (probably):
- Root Directory: `frontend` ❌

**New Setting** (needed):
- Root Directory: **(empty/blank)** or `/` ✅
- This tells Vercel to use the **root of the repository**

### 3. Update Framework Preset
- **Framework Preset**: `Other` (since we're using custom `builds` in `vercel.json`)
- Don't use "Next.js" or "Vite" - we're handling builds manually

### 4. Build Settings
- **Build Command**: (leave empty - handled by `vercel.json`)
- **Output Directory**: (leave empty - handled by `vercel.json`)
- **Install Command**: (leave empty - Vercel auto-detects)

### 5. Save and Redeploy
- Click **Save**
- Trigger a new deployment (push to git or click "Redeploy")

## How It Works Now

### Build Process (via `vercel.json`)

```
Repository Root
├── vercel.json (defines all builds)
├── frontend/
│   ├── index.html (vanilla JS app)
│   └── api/ (API functions)
└── chorestar-nextjs/
    ├── package.json (Next.js app)
    └── app/ (Next.js pages)
```

**Vercel will:**
1. Read `vercel.json` from root
2. Build Next.js from `chorestar-nextjs/`
3. Build API functions from `frontend/api/`
4. Serve static files from `frontend/`
5. Route traffic via rewrites

### Routing (via `vercel.json` rewrites)

```
User visits: /app/dashboard
  ↓
Vercel rewrite: /app/dashboard → /chorestar-nextjs/dashboard
  ↓
Next.js serves: dashboard page

User visits: /
  ↓
Vercel rewrite: / → /frontend/index.html
  ↓
Vanilla JS serves: main app
```

## Verification Checklist

After updating settings, verify:

- [ ] Root Directory is empty/blank in Vercel Dashboard
- [ ] Framework Preset is "Other"
- [ ] `vercel.json` is in repository root
- [ ] Both `frontend/` and `chorestar-nextjs/` exist
- [ ] Deployment builds both apps
- [ ] `/app/*` routes work (Next.js)
- [ ] `/*` routes work (Vanilla JS)

## If You Can't Change Root Directory

If Vercel won't let you change the root directory (some projects are locked), you have two options:

### Option A: Create New Project
1. Create a new Vercel project
2. Connect to same Git repo
3. Set Root Directory to root (empty)
4. Use the new project

### Option B: Keep Current + Add Second Project
1. Keep current project for vanilla JS (root: `frontend`)
2. Create second project for Next.js (root: `chorestar-nextjs`)
3. Use path prefixes to route on same domain

## Current Configuration Summary

**Your `vercel.json` is correct!** It already:
- ✅ Builds Next.js from `chorestar-nextjs/package.json`
- ✅ Serves vanilla JS from `frontend/`
- ✅ Routes `/app/*` to Next.js
- ✅ Routes `/*` to vanilla JS

**You just need to update Vercel Dashboard:**
- Change Root Directory from `frontend` to **(empty)**

## Quick Command to Check

```bash
# Check current Vercel project settings
vercel inspect

# Or pull current settings
vercel pull
```

This will show you the current root directory setting.

