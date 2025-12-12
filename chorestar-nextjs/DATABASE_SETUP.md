# Database Setup - Supabase RLS Policies

## Issue: "Error loading children"

This error occurs if Row Level Security (RLS) policies aren't set up on your Supabase tables.

## Quick Fix

Run these SQL commands in your Supabase SQL Editor:

### 1. Enable RLS on all tables
```sql
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE chores ENABLE ROW LEVEL SECURITY;
ALTER TABLE chore_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_badges ENABLE ROW LEVEL SECURITY;
```

### 2. Create RLS Policies

```sql
-- Profiles: Users can only see their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Children: Users can manage their own children
CREATE POLICY "Users can view own children"
  ON children FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own children"
  ON children FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own children"
  ON children FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own children"
  ON children FOR DELETE
  USING (auth.uid() = user_id);

-- Chores: Users can manage their own chores
CREATE POLICY "Users can view own chores"
  ON chores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chores"
  ON chores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chores"
  ON chores FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own chores"
  ON chores FOR DELETE
  USING (auth.uid() = user_id);

-- Chore Completions: Users can manage their own completions
CREATE POLICY "Users can view own completions"
  ON chore_completions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own completions"
  ON chore_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own completions"
  ON chore_completions FOR DELETE
  USING (auth.uid() = user_id);

-- Family Settings: Users can manage their own settings
CREATE POLICY "Users can view own settings"
  ON family_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON family_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON family_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Achievement Badges: Users can view/manage their own badges
CREATE POLICY "Users can view own badges"
  ON achievement_badges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own badges"
  ON achievement_badges FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

## After Running These Commands

1. Refresh your Next.js app
2. Try logging in again
3. The "Error loading children" should be gone
4. You should be able to add children and chores!

## Testing

After setup, test that:
- ✅ You can add a child
- ✅ You can edit a child
- ✅ You can delete a child
- ✅ You can add chores
- ✅ You can toggle completions

## Alternative: Disable RLS (NOT RECOMMENDED for production)

If you just want to test quickly (NOT secure):

```sql
-- ONLY FOR TESTING - DO NOT USE IN PRODUCTION
ALTER TABLE children DISABLE ROW LEVEL SECURITY;
ALTER TABLE chores DISABLE ROW LEVEL SECURITY;
ALTER TABLE chore_completions DISABLE ROW LEVEL SECURITY;
```

**Note**: This makes your data accessible to anyone. Only use for local testing!

## Where to Run These

1. Go to your Supabase dashboard
2. Click "SQL Editor" in the left menu
3. Click "New Query"
4. Paste the SQL above
5. Click "Run"

That's it! Your database should now work with the Next.js app.
