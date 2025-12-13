# ChoreStar Local Development Guide

This guide explains how to run and test both versions of ChoreStar (Vanilla JS and React/Next.js) locally.

## Quick Start

Run both versions with proper routing (mimics production):

```bash
./start-both.sh
```

Then visit **http://localhost:3001** in your browser.

## How It Works

### Production Routing (Vercel)
In production on Vercel, the routing works like this:
- `/app/*` → React/Next.js version
- `/*` → Vanilla JS version

### Local Development Routing
We use a local proxy server ([local-proxy.js](local-proxy.js:1)) to mimic production routing:

1. **Next.js Dev Server** runs on `localhost:3000`
2. **Vanilla JS Static Server** runs on `localhost:8080`
3. **Proxy Server** runs on `localhost:3001` and routes requests:
   - `/app/*` → Next.js (port 3000)
   - `/*` → Vanilla JS (port 8080)

## Running Individual Services

### React/Next.js Only
```bash
cd chorestar-nextjs
npm run dev
```
Visit http://localhost:3000

### Vanilla JS Only
```bash
cd frontend
python3 -m http.server 8080
```
Visit http://localhost:8080

### Both with Proxy (Recommended)
```bash
./start-both.sh
```
Visit http://localhost:3001

## Testing Version Switching

1. Start the development environment:
   ```bash
   ./start-both.sh
   ```

2. Visit http://localhost:3001 (Vanilla JS version)

3. Click the "Switch Version" button and select "Switch to New Version"

4. You should be redirected to http://localhost:3001/app (React version)

5. Click "Switch Version" again and select "Switch to Original"

6. You should be back at http://localhost:3001 (Vanilla JS version)

## Why Not Use `vercel dev`?

The `vercel dev` command fails with "Invalid string length" error due to Next.js 15's large build output. This is a known issue with Vercel CLI's file tracing in development mode.

**Solution:** We bypass this by:
- Running Next.js dev server directly (`npm run dev`)
- Using a simple proxy for routing (mimics production)

**Note:** This issue **only affects local development**. Production deployment to Vercel works perfectly!

## Deployment

Despite the `vercel dev` issue, **production deployment works fine**. The [vercel.json](vercel.json:1) configuration correctly routes requests:

```json
{
  "rewrites": [
    { "source": "/app/:path*", "destination": "/chorestar-nextjs/:path*" },
    { "source": "/(.*)", "destination": "/frontend/$1" }
  ]
}
```

Deploy with:
```bash
vercel --prod
```

## Troubleshooting

### Port Already in Use
If you get "port already in use" errors:

```bash
# Kill processes on specific ports
lsof -ti:3000 | xargs kill -9   # Next.js
lsof -ti:8080 | xargs kill -9   # Vanilla JS
lsof -ti:3001 | xargs kill -9   # Proxy
```

### Proxy Not Routing Correctly
1. Make sure both backend servers are running:
   ```bash
   curl http://localhost:3000  # Should return Next.js HTML
   curl http://localhost:8080  # Should return Vanilla JS HTML
   ```

2. Check proxy logs for routing decisions

### Version Switcher Shows Wrong Version
The version switcher detects the current version by checking if the URL starts with `/app`. If you see incorrect messaging:
- Clear browser cache and localStorage
- Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)

## Architecture Notes

### Reward Calculation Consistency
Both versions now use the **exact same reward calculation logic**:

```javascript
// Daily earnings: days worked × daily_reward_cents
const daysWithAnyCompletions = completionsPerDay.size
const dailyEarnings = daysWithAnyCompletions * dailyRewardCents

// Weekly bonus: only if ALL chores completed every day for 7 days
const weeklyBonus = (perfectDays === 7) ? weeklyBonusCents : 0

// Total
const totalEarnings = dailyEarnings + weeklyBonus
```

### Perfect Day Definition
A "perfect day" = a day where **ALL assigned chores** are completed (not just any chore).

### Database
Both versions share the same Supabase database, so data stays in sync automatically.

## Files Changed for Consistency

- [chorestar-nextjs/components/dashboard/weekly-stats.tsx](chorestar-nextjs/components/dashboard/weekly-stats.tsx:67) - Fixed earnings calculation
- [chorestar-nextjs/lib/utils/export.ts](chorestar-nextjs/lib/utils/export.ts:205) - Fixed PDF/CSV exports
- [chorestar-nextjs/components/settings/tabs/downloads-tab.tsx](chorestar-nextjs/components/settings/tabs/downloads-tab.tsx:52) - Pass family settings to exports
- [chorestar-nextjs/components/chores/chore-card.tsx](chorestar-nextjs/components/chores/chore-card.tsx:87) - Removed misleading per-chore earnings
- [chorestar-nextjs/components/settings/tabs/family-tab.tsx](chorestar-nextjs/components/settings/tabs/family-tab.tsx:143) - Fixed helper text
- [chorestar-nextjs/components/settings/tabs/insights-tab.tsx](chorestar-nextjs/components/settings/tabs/insights-tab.tsx:1) - Complete rewrite with real analytics
- [chorestar-nextjs/components/version-switcher.tsx](chorestar-nextjs/components/version-switcher.tsx:144) - Fixed version detection
- [frontend/index.html](frontend/index.html:1280) - Fixed helper text to match React

## New Features in React Version

All features from the Vanilla JS version are now implemented in React, including:

✅ Child management
✅ Chore tracking
✅ Weekly stats with correct earnings
✅ Settings (family, theme, profile)
✅ Analytics dashboard (fully functional!)
✅ PDF/CSV exports
✅ Sound effects
✅ Dark mode
✅ Version switching

---

For questions or issues, check the main [README.md](README.md) or open an issue on GitHub.
