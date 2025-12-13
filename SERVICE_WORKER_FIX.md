# Service Worker Fix - Immediate Steps

## Problem
The service worker is blocking external resources (CDNs, fonts) and causing 500 errors on static files.

## Immediate Fix for Users

### Step 1: Unregister Service Workers
1. Open **DevTools** (F12 or Cmd+Option+I)
2. Go to **Application** tab
3. Click **Service Workers** in left sidebar
4. Click **Unregister** for ALL service workers
5. Check "Update on reload" if available

### Step 2: Clear Cache
1. Still in **Application** tab
2. Click **Clear storage** in left sidebar
3. Click **Clear site data** button
4. This clears all caches

### Step 3: Hard Refresh
- **Mac**: `Cmd + Shift + R`
- **Windows/Linux**: `Ctrl + Shift + R`

### Step 4: Verify
- Check console - should see no service worker errors
- External resources (Supabase, fonts) should load
- Static files should load (no 500 errors)

## Code Fix Applied

The service worker has been updated to:
- ✅ **Never intercept external resources** (CDNs, fonts, APIs)
- ✅ **Only handle same-origin requests** (your app files)
- ✅ **Skip service worker files** themselves

## For Future Deployments

After deploying the fix:
1. Users will get the new service worker automatically
2. Old service workers will be replaced
3. No manual intervention needed for new users

## Quick Console Command

Users can also run this in the browser console:

```javascript
// Unregister all service workers
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister())
})

// Clear all caches
caches.keys().then(names => {
  names.forEach(name => caches.delete(name))
})

// Reload page
location.reload()
```

## Verification

After fix, you should see:
- ✅ No "FetchEvent.respondWith received an error" messages
- ✅ External CDNs load (Supabase, fonts, confetti)
- ✅ Static files load (no 500 errors)
- ✅ App works normally

