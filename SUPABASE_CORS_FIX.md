# Fixing Supabase CORS and 502 Errors

## Error Symptoms
- `Origin http://localhost:3000 is not allowed by Access-Control-Allow-Origin`
- `Status code: 502` from Supabase API
- `Failed to load resource: chore_completions`

## Solution 1: Configure CORS in Supabase Dashboard

The 502 error combined with CORS suggests your Supabase project needs to allow localhost:3000.

### Steps:
1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Settings** → **API**
4. Scroll to **"Allowed Origins"** or **"CORS Configuration"**
5. Add the following origins:
   - `http://localhost:3000`
   - `http://127.0.0.1:3000` (alternative localhost)
   - `http://localhost:3001` (if you use a different port)
6. Click **Save**

### For Production:
Add your production domain:
- `https://yourdomain.com`
- `https://www.yourdomain.com`

## Solution 2: Check Supabase Service Status

A 502 Bad Gateway error can also indicate:
- Supabase service is temporarily down
- Network connectivity issues
- Your Supabase project might be paused (free tier)

### Check:
1. Visit https://status.supabase.com to see if there are any outages
2. Check your Supabase Dashboard to ensure your project is active
3. Verify your Supabase URL and API key are correct in `frontend/supabase-config.js`

## Solution 3: Verify Supabase Configuration

Make sure your `frontend/supabase-config.js` has the correct values:

```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

## Solution 4: Test Supabase Connection

You can test if Supabase is accessible by running:

```bash
curl -H "apikey: YOUR_ANON_KEY" \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     https://your-project.supabase.co/rest/v1/
```

## Additional Notes

- The dev server (`dev-server.js`) already includes CORS headers for local development
- CORS errors are enforced by the browser, not the dev server
- Supabase requires explicit origin whitelisting in the dashboard
- Free tier projects may have rate limits or service pauses

## Quick Checklist

- [ ] Added `http://localhost:3000` to Supabase allowed origins
- [ ] Verified Supabase project is active (not paused)
- [ ] Checked Supabase status page for outages
- [ ] Verified SUPABASE_URL and SUPABASE_ANON_KEY are correct
- [ ] Restarted dev server after making changes

