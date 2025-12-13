# Quick Test Plan for Version Switcher

## After Deployment, Test These:

### Test 1: Vanilla JS → React
1. Visit your production URL (e.g., `https://chorestar.app`)
2. Should see vanilla JS version
3. Click **"Switch Version"** button (bottom right corner)
4. Modal should open
5. Click **"Switch to New Version"**
6. Should redirect to `https://chorestar.app/app/dashboard`
7. Should load React version ✅

### Test 2: React → Vanilla JS
1. While on React version (`/app/dashboard`)
2. Click **"Switch Version"** button
3. Modal should open
4. Click **"Switch to Original"**
5. Should redirect to `https://chorestar.app/`
6. Should load vanilla JS version ✅

### Test 3: Direct URL Access
1. Type `https://chorestar.app/app/login` in browser
2. Should load React login page ✅
3. Type `https://chorestar.app/app/signup` in browser
4. Should load React signup page ✅
5. Type `https://chorestar.app/app` in browser
6. Should redirect to `/app/dashboard` ✅

### Test 4: Assets Load Correctly
1. Visit `/app/dashboard`
2. Open DevTools → Network tab
3. Check that `_next/static/*` files load with 200 status ✅
4. No 404 errors ✅

## Expected Behavior Summary

| From | To | URL Change | Works? |
|------|----|-----------:|:------:|
| `/` (vanilla) | React | `/` → `/app/dashboard` | ✅ |
| `/app/dashboard` (React) | Vanilla | `/app/dashboard` → `/` | ✅ |
| Direct `/app/login` | N/A | Loads React login | ✅ |
| Direct `/app` | N/A | Redirects to `/app/dashboard` | ✅ |

## If Something Doesn't Work

### Check 1: Vercel Build Logs
```bash
vercel logs <deployment-url>
```

### Check 2: Browser Console
- Open DevTools (F12)
- Check for 404 errors
- Check for routing errors

### Check 3: Network Tab
- Are requests going to correct URLs?
- Are they returning 404 or 200?

### Check 4: Hard Refresh
- Clear cache: Cmd+Shift+R (Mac) or Ctrl+Shift+F5 (Windows)
- Try incognito/private window

## Deploy Commands

```bash
# Stage changes
git add vercel.json VERCEL_VERSION_SWITCHER_FIX.md

# Commit
git commit -m "Fix Vercel routing for version switcher"

# Deploy to preview (test first!)
vercel

# If preview works, deploy to production
vercel --prod
```

## Success Criteria

✅ Can switch from vanilla → React  
✅ Can switch from React → vanilla  
✅ Direct URLs work (`/app/dashboard`, `/app/login`, etc.)  
✅ No 404 errors for assets  
✅ Data syncs between versions (same database)

---

**Note**: Both versions use the same Supabase database, so your chores/children/completions are automatically synced!
