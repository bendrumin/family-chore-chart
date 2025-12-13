# Vercel Routing Fix for Dual-Version App

## The Problem

Your app has two versions:
- **Vanilla JS** version at `/` (root)
- **React/Next.js** version at `/app/*`

The version switcher buttons weren't working because Vercel's routing was incorrectly configured.

## The Solution

### Updated `vercel.json` Configuration

The fix uses `rewrites` (not just `routes`) to properly handle the Next.js app at `/app/*`:

```json
{
  "rewrites": [
    {
      "source": "/app",
      "destination": "/chorestar-nextjs/dashboard"
    },
    {
      "source": "/app/:path*",
      "destination": "/chorestar-nextjs/:path*"
    }
  ]
}
```

### How It Works

1. **`/app`** → redirects to `/chorestar-nextjs/dashboard` (Next.js dashboard page)
2. **`/app/:path*`** → rewrites to `/chorestar-nextjs/:path*` (any Next.js route)
3. **`/*`** → serves vanilla JS from `/frontend/` (catch-all at the end)

### Key Differences from Before

**Before (broken):**
- Used `routes` with complex regex patterns
- Tried to manually handle `_next` assets
- Routes were in wrong order

**After (working):**
- Uses `rewrites` which work better with `@vercel/next`
- Vercel automatically handles Next.js assets (`_next/*`)
- Simpler, cleaner configuration

## Version Switcher Behavior

### From Vanilla JS → React (Button: "Try New Version")
- Click button → Modal opens
- "Switch to New Version" → redirects to `/app/dashboard`
- Works because: `/app/dashboard` is rewritten to `/chorestar-nextjs/dashboard`

### From React → Vanilla JS (Button: "Switch to Original")
- Click button → redirects to `/` (root)
- Works because: `/` serves vanilla JS frontend

## Testing Locally

The `local-proxy.js` script mimics this behavior:

```bash
./start-both.sh
# Visit http://localhost:3001
```

- `/app/*` → proxies to Next.js (port 3000)
- `/*` → proxies to vanilla JS (port 8080)

## Deploying the Fix

```bash
# Commit the changes
git add vercel.json
git commit -m "Fix version switcher routing in Vercel"

# Deploy to preview
vercel

# Test the preview URL - try both version switcher buttons

# Deploy to production
vercel --prod
```

## What to Test After Deployment

1. **Visit production URL** (your vanilla JS version)
2. **Click "Switch Version" button** in bottom right
3. **Click "Switch to New Version"**
   - Should redirect to `/app/dashboard`
   - Should load React version
4. **Click "Switch Version" button** again
5. **Click "Switch to Original"**
   - Should redirect to `/`
   - Should load vanilla JS version

## Why This Fix Works

### Understanding Vercel's Build System

When you have `builds` in `vercel.json`:

```json
{
  "src": "chorestar-nextjs/package.json",
  "use": "@vercel/next"
}
```

Vercel builds the Next.js app and makes it available at `/chorestar-nextjs/*`. 

### Rewrites vs Routes

- **`rewrites`**: Better for Next.js apps, preserves the original URL in the browser
- **`routes`**: Lower-level, requires manual handling of all assets

With `rewrites`, Vercel automatically:
- Handles `/_next/*` assets
- Preserves cookies and headers
- Works with Next.js middleware
- Supports dynamic routes

## Troubleshooting

### If version switcher still doesn't work:

1. **Check browser console** for errors
2. **Check Network tab** - does `/app/dashboard` return 404?
3. **Check Vercel deployment logs** for build errors
4. **Try hard refresh** (Cmd+Shift+R / Ctrl+Shift+F5)

### If Next.js routes don't work:

Make sure your Next.js app has the routes you're trying to access:
- `/dashboard` → `chorestar-nextjs/app/dashboard/page.tsx` ✅
- `/login` → `chorestar-nextjs/app/login/page.tsx` ✅
- `/signup` → `chorestar-nextjs/app/signup/page.tsx` ✅

### If vanilla JS stops working:

The catch-all route at the end should handle it:
```json
{
  "src": "/(.*)",
  "dest": "/frontend/$1"
}
```

This matches anything NOT matched by previous rules.

## Order Matters!

Routes/rewrites are processed in order:

1. ✅ `/app` and `/app/*` → Next.js
2. ✅ `/api/*` → API functions
3. ✅ `/sw.js` → Service worker
4. ✅ `/*` → Vanilla JS (catch-all)

The catch-all MUST be last, or it will intercept everything.

## Summary

The fix simplifies the Vercel configuration to use `rewrites` instead of complex `routes`, which:
- ✅ Works better with `@vercel/next`
- ✅ Automatically handles Next.js assets
- ✅ Preserves URLs correctly
- ✅ Makes version switching work smoothly

Deploy and test! 🚀
