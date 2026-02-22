-- Security Hardening Migration
-- Fixes: profiles subscription self-upgrade, achievement_badges missing RLS,
-- missing indexes, and family sharing RLS support.
-- Safe to run multiple times (uses IF NOT EXISTS and DROP IF EXISTS).

BEGIN;

-- ============================================
-- 1. Lock down profiles UPDATE policy
-- Prevent users from modifying subscription_tier directly
-- ============================================

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING ((select auth.uid()) = id)
    WITH CHECK (
        (select auth.uid()) = id
        AND subscription_tier IS NOT DISTINCT FROM (
            SELECT subscription_tier FROM profiles WHERE id = (select auth.uid())
        )
    );

-- ============================================
-- 2. Enable RLS on achievement_badges
-- ============================================

ALTER TABLE achievement_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own children badges" ON achievement_badges;
CREATE POLICY "Users can view own children badges" ON achievement_badges
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM children
            WHERE children.id = achievement_badges.child_id
            AND children.user_id = (select auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can insert badges for own children" ON achievement_badges;
CREATE POLICY "Users can insert badges for own children" ON achievement_badges
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM children
            WHERE children.id = achievement_badges.child_id
            AND children.user_id = (select auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can delete badges for own children" ON achievement_badges;
CREATE POLICY "Users can delete badges for own children" ON achievement_badges
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM children
            WHERE children.id = achievement_badges.child_id
            AND children.user_id = (select auth.uid())
        )
    );

-- ============================================
-- 3. Add missing indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_family_members_family_id ON family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_chores_child_active ON chores(child_id, is_active) WHERE is_active = true;

-- ============================================
-- 4. Update RLS to support family sharing
-- Shared family members (via family_members table) should be able
-- to read data belonging to the family they joined.
-- ============================================

-- Children: allow shared members to view
DROP POLICY IF EXISTS "Users can view own children" ON children;
CREATE POLICY "Users can view own or shared children" ON children
    FOR SELECT USING (
        (select auth.uid()) = user_id
        OR EXISTS (
            SELECT 1 FROM family_members
            WHERE family_members.user_id = (select auth.uid())
            AND family_members.family_id = children.user_id
        )
    );

-- Chores: allow shared members to view
DROP POLICY IF EXISTS "Users can view chores for own children" ON chores;
CREATE POLICY "Users can view chores for own or shared children" ON chores
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM children
            WHERE children.id = chores.child_id
            AND (
                children.user_id = (select auth.uid())
                OR EXISTS (
                    SELECT 1 FROM family_members
                    WHERE family_members.user_id = (select auth.uid())
                    AND family_members.family_id = children.user_id
                )
            )
        )
    );

-- Chore completions: allow shared members to view and insert
DROP POLICY IF EXISTS "Users can view completions for own children" ON chore_completions;
CREATE POLICY "Users can view completions for own or shared children" ON chore_completions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chores
            JOIN children ON children.id = chores.child_id
            WHERE chores.id = chore_completions.chore_id
            AND (
                children.user_id = (select auth.uid())
                OR EXISTS (
                    SELECT 1 FROM family_members
                    WHERE family_members.user_id = (select auth.uid())
                    AND family_members.family_id = children.user_id
                )
            )
        )
    );

-- Family settings: allow shared members to view
DROP POLICY IF EXISTS "Users can view own settings" ON family_settings;
CREATE POLICY "Users can view own or shared settings" ON family_settings
    FOR SELECT USING (
        (select auth.uid()) = user_id
        OR EXISTS (
            SELECT 1 FROM family_members
            WHERE family_members.user_id = (select auth.uid())
            AND family_members.family_id = family_settings.user_id
        )
    );

-- Achievement badges: allow shared members to view
DROP POLICY IF EXISTS "Users can view own children badges" ON achievement_badges;
CREATE POLICY "Users can view own or shared children badges" ON achievement_badges
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM children
            WHERE children.id = achievement_badges.child_id
            AND (
                children.user_id = (select auth.uid())
                OR EXISTS (
                    SELECT 1 FROM family_members
                    WHERE family_members.user_id = (select auth.uid())
                    AND family_members.family_id = children.user_id
                )
            )
        )
    );

COMMIT;
