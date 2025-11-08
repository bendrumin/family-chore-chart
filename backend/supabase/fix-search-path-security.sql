-- Fix Function Search Path Security Issues
-- This migration fixes the search_path security warnings for all database functions
-- Safe to run: Uses CREATE OR REPLACE, so it won't break existing functionality

BEGIN;

-- 1. Fix get_week_start function (no SECURITY DEFINER needed)
CREATE OR REPLACE FUNCTION get_week_start(input_date DATE DEFAULT CURRENT_DATE)
RETURNS DATE 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    RETURN input_date - (EXTRACT(DOW FROM input_date)::INTEGER);
END;
$$;

-- 2. Fix update_updated_at_column function (no SECURITY DEFINER needed)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 3. Fix update_contact_submissions_updated_at function (no SECURITY DEFINER needed)
CREATE OR REPLACE FUNCTION update_contact_submissions_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 4. Fix create_user_profile function (KEEP SECURITY DEFINER - already had it)
CREATE OR REPLACE FUNCTION create_user_profile(
    user_id UUID,
    user_email TEXT,
    family_name TEXT
)
RETURNS VOID 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO profiles (id, email, family_name)
    VALUES (user_id, user_email, family_name)
    ON CONFLICT (id) DO NOTHING;
END;
$$;

-- 5. Fix get_child_weekly_progress function (no SECURITY DEFINER needed)
CREATE OR REPLACE FUNCTION get_child_weekly_progress(
    p_child_id UUID,
    p_week_start DATE DEFAULT get_week_start()
)
RETURNS TABLE(
    total_chores INTEGER,
    completed_chores INTEGER,
    completion_percentage NUMERIC,
    total_earnings_cents INTEGER
) 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH week_completions AS (
        SELECT 
            c.id as chore_id,
            c.reward_cents,
            COUNT(cc.id) as completed_days
        FROM chores c
        LEFT JOIN chore_completions cc ON c.id = cc.chore_id 
            AND cc.week_start = p_week_start
        WHERE c.child_id = p_child_id AND c.is_active = true
        GROUP BY c.id, c.reward_cents
    )
    SELECT 
        COUNT(*)::INTEGER as total_chores,
        COUNT(CASE WHEN completed_days = 7 THEN 1 END)::INTEGER as completed_chores,
        ROUND(
            (COUNT(CASE WHEN completed_days = 7 THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 
            1
        ) as completion_percentage,
        COALESCE(SUM(
            CASE 
                WHEN completed_days = 7 THEN reward_cents * 7
                ELSE reward_cents * completed_days
            END
        ), 0)::INTEGER as total_earnings_cents
    FROM week_completions;
END;
$$;

-- 6. Fix get_family_weekly_summary function (no SECURITY DEFINER needed)
CREATE OR REPLACE FUNCTION get_family_weekly_summary(
    p_user_id UUID,
    p_week_start DATE DEFAULT get_week_start()
)
RETURNS TABLE(
    child_id UUID,
    child_name TEXT,
    avatar_color TEXT,
    total_chores INTEGER,
    completed_chores INTEGER,
    completion_percentage NUMERIC,
    total_earnings_cents INTEGER
) 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as child_id,
        c.name as child_name,
        c.avatar_color,
        wp.total_chores,
        wp.completed_chores,
        wp.completion_percentage,
        wp.total_earnings_cents
    FROM children c
    CROSS JOIN LATERAL get_child_weekly_progress(c.id, p_week_start) wp
    WHERE c.user_id = p_user_id
    ORDER BY c.name;
END;
$$;

COMMIT;

-- Verification
DO $$
BEGIN
    RAISE NOTICE '✅ All function search_path security issues have been fixed!';
    RAISE NOTICE '🔒 Functions now use SET search_path = public for security';
    RAISE NOTICE '💡 This prevents search_path injection attacks';
    RAISE NOTICE '⚠️  Please verify functions still work correctly after this migration';
END $$;

