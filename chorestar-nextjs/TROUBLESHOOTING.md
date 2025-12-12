# Troubleshooting Guide

## Error: "Error loading children: {}"

**Cause**: Supabase Row Level Security (RLS) policies are not set up.

**Solution**:
1. Open [DATABASE_SETUP.md](./DATABASE_SETUP.md)
2. Copy the SQL commands
3. Run them in your Supabase SQL Editor
4. Refresh the app

**Quick Test**:
```bash
# Check if it's an RLS issue
# In Supabase SQL Editor, run:
SELECT * FROM children;

# If you see "permission denied", that's the issue!
```

---

## Error: "Supabase client not initialized"

**Cause**: Environment variables not set.

**Solution**:
```bash
# Make sure .env.local exists and has:
NEXT_PUBLIC_SUPABASE_URL=your_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key_here

# Restart dev server:
npm run dev
```

---

## Error: "Module not found"

**Cause**: Dependencies not installed.

**Solution**:
```bash
npm install
npm run dev
```

---

## Login doesn't work

**Possible causes**:
1. Email not verified (check your email)
2. Wrong credentials
3. Supabase auth not configured

**Solution**:
1. Check Supabase Auth settings
2. Make sure email confirmation is enabled/disabled as expected
3. Try creating a new account

---

## Children/Chores not showing

**Cause**: Either no data, or RLS policies blocking access.

**Solution**:
1. Make sure you're logged in
2. Check browser console for errors
3. Run RLS policies from [DATABASE_SETUP.md](./DATABASE_SETUP.md)
4. Try adding a child manually in Supabase dashboard to test

---

## Real-time updates not working

**Cause**: Supabase Realtime not enabled.

**Solution**:
1. Go to Supabase Dashboard → Database → Replication
2. Enable replication for:
   - `children`
   - `chores`
   - `chore_completions`
3. Refresh your app

---

## TypeScript errors

**Cause**: Types out of sync or missing dependencies.

**Solution**:
```bash
# Reinstall dependencies
rm -rf node_modules
npm install

# Check types
npm run type-check
```

---

## Build errors

**Cause**: Various issues.

**Solution**:
```bash
# Clear Next.js cache
rm -rf .next

# Rebuild
npm run build
```

---

## "Cannot find module '@/components/...'"

**Cause**: Path alias not working.

**Solution**:
1. Make sure `tsconfig.json` has:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

2. Restart your editor (VS Code)
3. Restart dev server

---

## Still having issues?

### Debug Checklist:
- [ ] `.env.local` file exists with correct values
- [ ] `npm install` was run
- [ ] Supabase RLS policies are set up
- [ ] Supabase Realtime is enabled
- [ ] No console errors (check browser DevTools)
- [ ] Latest code from repo
- [ ] Node.js 18.17+ installed

### Get More Info:
```bash
# Check environment
node --version  # Should be 18.17+
npm --version   # Should be 9+

# Check if Supabase is reachable
curl https://your-project.supabase.co/rest/v1/

# View all errors
npm run dev
# Then check browser console (F12)
```

### Common Console Errors:

**"Failed to fetch"**
- Check internet connection
- Check Supabase URL is correct
- Check Supabase project is not paused

**"Invalid API key"**
- Check `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Make sure it's the anon/public key, not the service role key

**"Row Level Security policy violated"**
- Run RLS policies from DATABASE_SETUP.md
- Or temporarily disable RLS for testing

---

## Pro Tips

### Check if Supabase is working:
```typescript
// Add to any component temporarily
useEffect(() => {
  const test = async () => {
    const supabase = createClient()
    const { data, error } = await supabase.from('profiles').select('count')
    console.log('Supabase test:', { data, error })
  }
  test()
}, [])
```

### Check if user is authenticated:
```typescript
useEffect(() => {
  const checkAuth = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    console.log('Current user:', user)
  }
  checkAuth()
}, [])
```

### Force refresh data:
- Hard refresh: `Cmd/Ctrl + Shift + R`
- Clear cookies: DevTools → Application → Cookies → Delete all
- Clear localStorage: DevTools → Application → Local Storage → Delete all

---

## Need More Help?

1. Check browser console for errors (F12)
2. Check Supabase logs (Dashboard → Logs)
3. Read [COMPLETE.md](./COMPLETE.md) for full documentation
4. Check original vanilla JS app to compare behavior

---

**Most common issue**: RLS policies not set up!

Run the SQL from [DATABASE_SETUP.md](./DATABASE_SETUP.md) and 90% of issues will be solved! 🎉
