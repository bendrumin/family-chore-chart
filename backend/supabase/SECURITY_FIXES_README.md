# Supabase Security Fixes

This document outlines the security fixes applied to address Supabase linter warnings.

## Fixed Issues

### 1. Function Search Path Security (6 functions fixed) ✅

**Problem:** Functions with mutable search_path can be vulnerable to search_path injection attacks.

**Solution:** Added `SET search_path = public` to all functions to lock down the search path.

**Affected Functions:**
- `get_week_start`
- `update_updated_at_column`
- `update_contact_submissions_updated_at`
- `create_user_profile`
- `get_child_weekly_progress`
- `get_family_weekly_summary`

**Migration File:** `fix-search-path-security.sql`

**How to Apply:**
```sql
-- Run this in your Supabase SQL Editor
\i fix-search-path-security.sql
```

### 2. RLS Performance Optimization (28 policies fixed) ✅

**Problem:** RLS policies re-evaluate `auth.uid()` for each row, causing performance issues at scale. Also, multiple permissive policies for the same action reduce performance.

**Solution:** 
1. Wrapped all `auth.uid()` calls in `(select auth.uid())` to cache the result
2. Consolidated duplicate permissive policies

**Affected Policies:**
- All policies on: `profiles`, `children`, `chores`, `chore_completions`, `family_settings`, `family_codes`, `family_members`, `contact_submissions`
- 28 total policies optimized
- 2 duplicate policy sets consolidated (`family_codes` SELECT, `contact_submissions` INSERT)

**Migration File:** `fix-rls-performance.sql`

**How to Apply:**
```sql
-- Run this in your Supabase SQL Editor
\i fix-rls-performance.sql
```

**Performance Impact:**
- ✅ `auth.uid()` is now evaluated once per query instead of per row
- ✅ Reduced policy evaluation overhead
- ✅ Better query performance at scale
- ✅ No security changes - same access control, just faster

## Remaining Issues (Require Supabase Dashboard Configuration)

### 3. Auth OTP Long Expiry

**Problem:** OTP expiry is set to more than an hour (recommended: less than 1 hour).

**Fix Required:** 
1. Go to Supabase Dashboard → Authentication → Settings
2. Find "Email OTP expiry" setting
3. Set to 3600 seconds (1 hour) or less

**Current Status:** ⚠️ Requires manual configuration in Supabase Dashboard

### 4. Leaked Password Protection Disabled

**Problem:** HaveIBeenPwned password checking is disabled.

**Fix Required:**
1. Go to Supabase Dashboard → Authentication → Settings
2. Enable "Leaked Password Protection"
3. This checks passwords against HaveIBeenPwned.org database

**Current Status:** ⚠️ Requires manual configuration in Supabase Dashboard

### 5. Vulnerable Postgres Version

**Problem:** Current Postgres version has security patches available.

**Fix Required:**
1. Go to Supabase Dashboard → Settings → Database
2. Check for available database upgrades
3. Schedule maintenance window for upgrade
4. Follow Supabase upgrade guide: https://supabase.com/docs/guides/platform/upgrading

**Current Status:** ⚠️ Requires Supabase platform upgrade (may require downtime)

## Testing After Fixes

### After Function Search Path Fixes:

1. **Test Week Start Calculation:**
   ```sql
   SELECT get_week_start(); -- Should return current week's Sunday
   ```

2. **Test Profile Creation:**
   - Sign up a new user
   - Verify profile is created correctly

3. **Test Weekly Progress:**
   ```sql
   SELECT * FROM get_child_weekly_progress('child-uuid-here');
   SELECT * FROM get_family_weekly_summary('user-uuid-here');
   ```

4. **Test Updated At Triggers:**
   - Update a profile, child, or chore
   - Verify `updated_at` timestamp is updated

### After RLS Performance Fixes:

1. **Test Basic Operations:**
   - Sign in as a user
   - View your profile, children, and chores
   - Create a new child and chore
   - Mark a chore as complete
   - Verify all operations work correctly

2. **Test Family Sharing:**
   - View family codes (should work for everyone)
   - Join a family using a code
   - Verify family members can see shared data

3. **Test Contact Form:**
   - Submit contact form as anonymous user (should work)
   - Submit contact form as logged-in user (should work)
   - View your own submissions (should work)

4. **Performance Check:**
   - Notice faster query response times
   - Check Supabase Dashboard → Database → Linter
   - Verify RLS performance warnings are resolved

## Safety Notes

- ✅ Function fixes use `CREATE OR REPLACE` - safe to run multiple times
- ✅ RLS fixes use `DROP POLICY IF EXISTS` then `CREATE POLICY` - safe to run multiple times
- ✅ No data will be modified or deleted
- ✅ Existing functionality preserved
- ✅ All functions and policies keep their original behavior
- ✅ Only adds security hardening and performance improvements
- ✅ Access control remains identical - just faster execution

## Verification

After applying all fixes, verify in Supabase Dashboard:
1. Go to Database → Linter
2. Check that function search_path warnings are resolved (6 functions)
3. Check that RLS performance warnings are resolved (28 policies)
4. Check that multiple permissive policy warnings are resolved (2 tables)
5. Verify all functions and policies work correctly in your app

