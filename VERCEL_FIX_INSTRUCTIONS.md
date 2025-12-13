# Fix for Vercel Routes Manifest Error

## Error
```
The file "/vercel/path0/chorestar-nextjs/chorestar-nextjs/.next/routes-manifest.json" couldn't be found
```

## Root Cause
Vercel is duplicating the directory path when building Next.js from a subdirectory in a monorepo setup.

## Solution: Use Vercel Project Settings

Instead of using `builds` in `vercel.json` for Next.js, configure it in Vercel Dashboard:

### Step 1: Update vercel.json
Remove the Next.js build from the builds array:

```json
{
  "builds": [
    {
      "src": "frontend/api/**/*.js",
      "use": "@vercel/node"
    },
    {
      "src": "frontend/**",
      "use": "@vercel/static"
    }
  ],
  "rewrites": [
    {
      "source": "/app/:path*",
      "destination": "/chorestar-nextjs/:path*"
    },
    // ... rest of rewrites
  ]
}
```

### Step 2: Configure in Vercel Dashboard

1. Go to your Vercel project
2. Settings → General
3. Under "Build & Development Settings":
   - **Root Directory**: Leave empty (or set to root)
   - **Framework Preset**: Other
   - **Build Command**: (leave empty, handled by vercel.json)
   - **Output Directory**: (leave empty)

4. Go to Settings → Git
5. Create a new deployment or use the existing one

### Step 3: Alternative - Separate Projects (Recommended)

For a cleaner setup, create **two separate Vercel projects**:

#### Project 1: Vanilla JS (Main)
- **Root Directory**: `frontend` or root
- **Framework**: Other
- **Domain**: `chorestar.app` (main domain)

#### Project 2: Next.js (Subdirectory)
- **Root Directory**: `chorestar-nextjs`
- **Framework**: Next.js (auto-detected)
- **Domain**: `chorestar.app/app/*` (path prefix)

This avoids all path conflicts and is the recommended approach for monorepos.

## Current Workaround

If you must use a single project with builds:

1. The current `vercel.json` should work, but Vercel might have issues
2. Try deploying and check build logs
3. If it fails, use the Project Settings approach above

## Verification

After fixing, verify:
- ✅ Next.js builds successfully
- ✅ Routes manifest is found
- ✅ `/app/*` routes work
- ✅ Static assets load from `/app/_next/*`

