# Local Development Setup

## Quick Start

You have **two apps** to test locally:

### 1. Vanilla JS App (Original)
**Location**: `frontend/`  
**Port**: 8000 (or any available port)

### 2. Next.js App (New Version)
**Location**: `chorestar-nextjs/`  
**Port**: 3000

---

## Running Both Apps Locally

### Option 1: Run Both Separately (Recommended for Testing)

#### Terminal 1: Vanilla JS App
```bash
cd /Users/bensiegel/family-chore-chart/frontend
python3 -m http.server 8000
# Or if you have Node.js http-server:
# npx http-server -p 8000
```

Visit: `http://localhost:8000`

#### Terminal 2: Next.js App
```bash
cd /Users/bensiegel/family-chore-chart/chorestar-nextjs
npm run dev
```

Visit: `http://localhost:3000`

**Note**: Next.js will run at root (`/`), not `/app/` in local dev. This is fine for testing.

---

### Option 2: Use Vercel CLI (Matches Production)

This runs both apps together, matching production setup:

```bash
cd /Users/bensiegel/family-chore-chart
vercel dev
```

This will:
- Read `vercel.json` configuration
- Run Next.js app
- Serve vanilla JS static files
- Route `/app/*` to Next.js
- Route `/*` to vanilla JS

Visit: `http://localhost:3000` (or port shown in terminal)

---

## Testing the Service Worker Fix

### For Vanilla JS App (Port 8000):

1. **Open browser**: `http://localhost:8000`
2. **Open DevTools** (F12)
3. **Check Console** for errors
4. **Check Application → Service Workers**:
   - Should see service worker registered
   - Should NOT see errors about external resources
5. **Verify external resources load**:
   - Supabase library loads
   - Google Fonts load
   - Canvas confetti loads
6. **Check Network tab**:
   - External CDNs should return 200 (not blocked)
   - Static files should return 200 (not 500)

### For Next.js App (Port 3000):

1. **Open browser**: `http://localhost:3000`
2. **Test version switcher**:
   - Should see "Switch Version" button
   - Can switch to vanilla JS version
3. **Check service worker**:
   - Should only register for `/app/*` paths
   - Should not interfere with vanilla JS

---

## Quick Test Commands

### Test Vanilla JS Only
```bash
cd frontend
python3 -m http.server 8000
# Visit http://localhost:8000
```

### Test Next.js Only
```bash
cd chorestar-nextjs
npm run dev
# Visit http://localhost:3000
```

### Test Both (Production-like)
```bash
cd /Users/bensiegel/family-chore-chart
vercel dev
# Visit http://localhost:3000
# /app/* routes to Next.js
# /* routes to vanilla JS
```

---

## What to Check

### ✅ Service Worker
- [ ] No "FetchEvent.respondWith received an error" messages
- [ ] External CDNs load (Supabase, fonts, confetti)
- [ ] Static files load (no 500 errors)
- [ ] Service worker only intercepts same-origin requests

### ✅ Version Switching
- [ ] "Try New Version" button appears in vanilla JS
- [ ] Can switch from vanilla JS to Next.js
- [ ] Can switch from Next.js to vanilla JS
- [ ] Data syncs between versions

### ✅ Routing
- [ ] Vanilla JS works at `http://localhost:8000/`
- [ ] Next.js works at `http://localhost:3000/`
- [ ] With Vercel dev: `/app/*` → Next.js, `/*` → vanilla JS

---

## Troubleshooting

### Service Worker Not Updating
```bash
# In browser console:
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(r => r.unregister())
})
caches.keys().then(names => {
  names.forEach(n => caches.delete(n))
})
location.reload()
```

### Port Already in Use
```bash
# Find what's using the port
lsof -i :8000
lsof -i :3000

# Kill the process or use different port
python3 -m http.server 8001  # Different port
```

### Next.js Build Errors
```bash
cd chorestar-nextjs
npm install
npm run build  # Test build first
npm run dev
```

---

## Recommended Workflow

1. **Start with vanilla JS**:
   ```bash
   cd frontend
   python3 -m http.server 8000
   ```
   - Test service worker fix
   - Verify external resources load

2. **Then test Next.js**:
   ```bash
   cd chorestar-nextjs
   npm run dev
   ```
   - Test version switcher
   - Verify features work

3. **Finally test together** (optional):
   ```bash
   vercel dev
   ```
   - Test routing
   - Test version switching between apps

---

## Summary

**For quick testing**: Run vanilla JS on port 8000  
**For full testing**: Run both separately or use `vercel dev`  
**For production-like**: Use `vercel dev` from root

