-- Family Member Shared Access Migration
--
-- Lets co-parents who joined a family via family_members read and manage that
-- family's data DIRECTLY under RLS (required by the iOS app, which talks to
-- Supabase client-side; the web app currently works around owner-only RLS by
-- using the service-role key in server components).
--
-- IDEMPOTENT: each policy is dropped-if-exists and recreated, so this can be
-- re-run safely any number of times (a prior partial run is fine). It never
-- touches the existing owner-only policies — only its own "Family members…"
-- policy names.
--
-- Run this in the Supabase SQL Editor. To inspect what's live afterwards,
-- run the verification query at the bottom of this file.

-- Helper predicate, inlined in each policy:
--   EXISTS (SELECT 1 FROM family_members fm
--           WHERE fm.user_id = auth.uid() AND fm.family_id = <owner-id-column>)

-- ── children ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Family members can view children" ON children;
CREATE POLICY "Family members can view children" ON children
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM family_members fm
                WHERE fm.user_id = auth.uid() AND fm.family_id = children.user_id)
    );

DROP POLICY IF EXISTS "Family members can update children" ON children;
CREATE POLICY "Family members can update children" ON children
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM family_members fm
                WHERE fm.user_id = auth.uid() AND fm.family_id = children.user_id)
    );

DROP POLICY IF EXISTS "Family members can insert children" ON children;
CREATE POLICY "Family members can insert children" ON children
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM family_members fm
                WHERE fm.user_id = auth.uid() AND fm.family_id = children.user_id)
    );

DROP POLICY IF EXISTS "Family members can delete children" ON children;
CREATE POLICY "Family members can delete children" ON children
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM family_members fm
                WHERE fm.user_id = auth.uid() AND fm.family_id = children.user_id)
    );

-- ── chores (owned via children) ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Family members can view chores" ON chores;
CREATE POLICY "Family members can view chores" ON chores
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM children c
                JOIN family_members fm ON fm.family_id = c.user_id
                WHERE c.id = chores.child_id AND fm.user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Family members can insert chores" ON chores;
CREATE POLICY "Family members can insert chores" ON chores
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM children c
                JOIN family_members fm ON fm.family_id = c.user_id
                WHERE c.id = chores.child_id AND fm.user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Family members can update chores" ON chores;
CREATE POLICY "Family members can update chores" ON chores
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM children c
                JOIN family_members fm ON fm.family_id = c.user_id
                WHERE c.id = chores.child_id AND fm.user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Family members can delete chores" ON chores;
CREATE POLICY "Family members can delete chores" ON chores
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM children c
                JOIN family_members fm ON fm.family_id = c.user_id
                WHERE c.id = chores.child_id AND fm.user_id = auth.uid())
    );

-- ── chore_completions (owned via chores → children) ─────────────────────────
DROP POLICY IF EXISTS "Family members can view completions" ON chore_completions;
CREATE POLICY "Family members can view completions" ON chore_completions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM chores ch
                JOIN children c ON c.id = ch.child_id
                JOIN family_members fm ON fm.family_id = c.user_id
                WHERE ch.id = chore_completions.chore_id AND fm.user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Family members can insert completions" ON chore_completions;
CREATE POLICY "Family members can insert completions" ON chore_completions
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM chores ch
                JOIN children c ON c.id = ch.child_id
                JOIN family_members fm ON fm.family_id = c.user_id
                WHERE ch.id = chore_completions.chore_id AND fm.user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Family members can delete completions" ON chore_completions;
CREATE POLICY "Family members can delete completions" ON chore_completions
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM chores ch
                JOIN children c ON c.id = ch.child_id
                JOIN family_members fm ON fm.family_id = c.user_id
                WHERE ch.id = chore_completions.chore_id AND fm.user_id = auth.uid())
    );

-- ── family_settings ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Family members can view settings" ON family_settings;
CREATE POLICY "Family members can view settings" ON family_settings
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM family_members fm
                WHERE fm.user_id = auth.uid() AND fm.family_id = family_settings.user_id)
    );

-- ── routines / routine_steps / routine_completions ──────────────────────────
DROP POLICY IF EXISTS "Family members can view routines" ON routines;
CREATE POLICY "Family members can view routines" ON routines
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM children c
                JOIN family_members fm ON fm.family_id = c.user_id
                WHERE c.id = routines.child_id AND fm.user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Family members can manage routines" ON routines;
CREATE POLICY "Family members can manage routines" ON routines
    FOR ALL USING (
        EXISTS (SELECT 1 FROM children c
                JOIN family_members fm ON fm.family_id = c.user_id
                WHERE c.id = routines.child_id AND fm.user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Family members can view routine steps" ON routine_steps;
CREATE POLICY "Family members can view routine steps" ON routine_steps
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM routines r
                JOIN children c ON c.id = r.child_id
                JOIN family_members fm ON fm.family_id = c.user_id
                WHERE r.id = routine_steps.routine_id AND fm.user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Family members can manage routine steps" ON routine_steps;
CREATE POLICY "Family members can manage routine steps" ON routine_steps
    FOR ALL USING (
        EXISTS (SELECT 1 FROM routines r
                JOIN children c ON c.id = r.child_id
                JOIN family_members fm ON fm.family_id = c.user_id
                WHERE r.id = routine_steps.routine_id AND fm.user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Family members can view routine completions" ON routine_completions;
CREATE POLICY "Family members can view routine completions" ON routine_completions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM children c
                JOIN family_members fm ON fm.family_id = c.user_id
                WHERE c.id = routine_completions.child_id AND fm.user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Family members can insert routine completions" ON routine_completions;
CREATE POLICY "Family members can insert routine completions" ON routine_completions
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM children c
                JOIN family_members fm ON fm.family_id = c.user_id
                WHERE c.id = routine_completions.child_id AND fm.user_id = auth.uid())
    );

-- ── achievement_badges ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Family members can view badges" ON achievement_badges;
CREATE POLICY "Family members can view badges" ON achievement_badges
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM children c
                JOIN family_members fm ON fm.family_id = c.user_id
                WHERE c.id = achievement_badges.child_id AND fm.user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Family members can insert badges" ON achievement_badges;
CREATE POLICY "Family members can insert badges" ON achievement_badges
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM children c
                JOIN family_members fm ON fm.family_id = c.user_id
                WHERE c.id = achievement_badges.child_id AND fm.user_id = auth.uid())
    );

-- ── child_pins (so a co-parent can manage kid login PINs) ───────────────────
DROP POLICY IF EXISTS "Family members can view child pins" ON child_pins;
CREATE POLICY "Family members can view child pins" ON child_pins
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM children c
                JOIN family_members fm ON fm.family_id = c.user_id
                WHERE c.id = child_pins.child_id AND fm.user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Family members can manage child pins" ON child_pins;
CREATE POLICY "Family members can manage child pins" ON child_pins
    FOR ALL USING (
        EXISTS (SELECT 1 FROM children c
                JOIN family_members fm ON fm.family_id = c.user_id
                WHERE c.id = child_pins.child_id AND fm.user_id = auth.uid())
    );

-- ── profiles: family co-members can see each other's basic profile ──────────
-- (used to show the owner's kid_login_code to members, and member names to owners)
DROP POLICY IF EXISTS "Family co-members can view profiles" ON profiles;
CREATE POLICY "Family co-members can view profiles" ON profiles
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM family_members fm
                WHERE (fm.user_id = auth.uid() AND fm.family_id = profiles.id)
                   OR (fm.family_id = auth.uid() AND fm.user_id = profiles.id))
    );

-- ── Verification (run separately to see all live policies) ──────────────────
-- SELECT tablename, policyname, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('children','chores','chore_completions','family_settings',
--                     'routines','routine_steps','routine_completions',
--                     'achievement_badges','child_pins','profiles',
--                     'family_members','family_codes')
-- ORDER BY tablename, cmd, policyname;
