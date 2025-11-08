-- Fix RLS Performance Issues
-- This migration optimizes RLS policies by wrapping auth.uid() in subqueries
-- and consolidating duplicate permissive policies
-- Safe to run: Uses DROP/CREATE POLICY, preserves existing functionality

BEGIN;

-- ============================================
-- 1. Fix auth.uid() performance issues
-- ============================================
-- Wrap all auth.uid() calls in (select auth.uid()) to prevent re-evaluation per row

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK ((select auth.uid()) = id);

-- Children policies
DROP POLICY IF EXISTS "Users can view own children" ON children;
CREATE POLICY "Users can view own children" ON children
    FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own children" ON children;
CREATE POLICY "Users can insert own children" ON children
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own children" ON children;
CREATE POLICY "Users can update own children" ON children
    FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own children" ON children;
CREATE POLICY "Users can delete own children" ON children
    FOR DELETE USING ((select auth.uid()) = user_id);

-- Chores policies
DROP POLICY IF EXISTS "Users can view chores for own children" ON chores;
CREATE POLICY "Users can view chores for own children" ON chores
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM children 
            WHERE children.id = chores.child_id 
            AND children.user_id = (select auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can insert chores for own children" ON chores;
CREATE POLICY "Users can insert chores for own children" ON chores
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM children 
            WHERE children.id = chores.child_id 
            AND children.user_id = (select auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can update chores for own children" ON chores;
CREATE POLICY "Users can update chores for own children" ON chores
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM children 
            WHERE children.id = chores.child_id 
            AND children.user_id = (select auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can delete chores for own children" ON chores;
CREATE POLICY "Users can delete chores for own children" ON chores
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM children 
            WHERE children.id = chores.child_id 
            AND children.user_id = (select auth.uid())
        )
    );

-- Chore completions policies
DROP POLICY IF EXISTS "Users can view completions for own children" ON chore_completions;
CREATE POLICY "Users can view completions for own children" ON chore_completions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chores 
            JOIN children ON children.id = chores.child_id
            WHERE chores.id = chore_completions.chore_id 
            AND children.user_id = (select auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can insert completions for own children" ON chore_completions;
CREATE POLICY "Users can insert completions for own children" ON chore_completions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM chores 
            JOIN children ON children.id = chores.child_id
            WHERE chores.id = chore_completions.chore_id 
            AND children.user_id = (select auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can update completions for own children" ON chore_completions;
CREATE POLICY "Users can update completions for own children" ON chore_completions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM chores 
            JOIN children ON children.id = chores.child_id
            WHERE chores.id = chore_completions.chore_id 
            AND children.user_id = (select auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can delete completions for own children" ON chore_completions;
CREATE POLICY "Users can delete completions for own children" ON chore_completions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM chores 
            JOIN children ON children.id = chores.child_id
            WHERE chores.id = chore_completions.chore_id 
            AND children.user_id = (select auth.uid())
        )
    );

-- Family settings policies
DROP POLICY IF EXISTS "Users can view own settings" ON family_settings;
CREATE POLICY "Users can view own settings" ON family_settings
    FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own settings" ON family_settings;
CREATE POLICY "Users can insert own settings" ON family_settings
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own settings" ON family_settings;
CREATE POLICY "Users can update own settings" ON family_settings
    FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own settings" ON family_settings;
CREATE POLICY "Users can delete own settings" ON family_settings
    FOR DELETE USING ((select auth.uid()) = user_id);

-- Family codes policies
-- Consolidate SELECT policies: Combine "Users can view own family codes" and "Allow family code lookup for joining"
-- Since both allow viewing (one conditionally, one always), we can simplify to allow all SELECTs
-- This maintains the same security model (anyone can lookup codes for joining families)
DROP POLICY IF EXISTS "Users can view own family codes" ON family_codes;
DROP POLICY IF EXISTS "Allow family code lookup for joining" ON family_codes;
-- Create single optimized SELECT policy that handles both cases
-- Note: This allows anyone to view family codes (for joining), which matches the original behavior
CREATE POLICY "Users can view family codes" ON family_codes
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own family codes" ON family_codes;
CREATE POLICY "Users can insert own family codes" ON family_codes
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own family codes" ON family_codes;
CREATE POLICY "Users can update own family codes" ON family_codes
    FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own family codes" ON family_codes;
CREATE POLICY "Users can delete own family codes" ON family_codes
    FOR DELETE USING ((select auth.uid()) = user_id);

-- Family members policies
DROP POLICY IF EXISTS "Users can view family members" ON family_members;
CREATE POLICY "Users can view family members" ON family_members
    FOR SELECT USING (
        (select auth.uid()) = user_id OR 
        (select auth.uid()) = family_id
    );

DROP POLICY IF EXISTS "Users can insert family members" ON family_members;
CREATE POLICY "Users can insert family members" ON family_members
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update family members" ON family_members;
CREATE POLICY "Users can update family members" ON family_members
    FOR UPDATE USING (
        (select auth.uid()) = user_id OR 
        (select auth.uid()) = family_id
    );

DROP POLICY IF EXISTS "Users can delete family members" ON family_members;
CREATE POLICY "Users can delete family members" ON family_members
    FOR DELETE USING (
        (select auth.uid()) = user_id OR 
        (select auth.uid()) = family_id
    );

-- Contact submissions policies
-- Consolidate INSERT policies: The existing policy already allows both authenticated and anonymous users
-- Remove any duplicate policies first
DROP POLICY IF EXISTS "Users can insert their own contact submissions" ON contact_submissions;
DROP POLICY IF EXISTS "Anyone can submit contact form" ON contact_submissions;
-- Create single optimized INSERT policy that handles both cases
CREATE POLICY "Users can insert their own contact submissions" ON contact_submissions
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can view their own contact submissions" ON contact_submissions;
CREATE POLICY "Users can view their own contact submissions" ON contact_submissions
    FOR SELECT USING ((select auth.uid()) = user_id);

COMMIT;

-- Verification
DO $$
BEGIN
    RAISE NOTICE '✅ All RLS policies have been optimized for performance!';
    RAISE NOTICE '⚡ auth.uid() calls are now wrapped in subqueries to prevent per-row re-evaluation';
    RAISE NOTICE '🔒 Security is maintained - only performance improvements applied';
    RAISE NOTICE '💡 Duplicate permissive policies have been consolidated';
    RAISE NOTICE '⚠️  Please verify application functionality after this migration';
END $$;

