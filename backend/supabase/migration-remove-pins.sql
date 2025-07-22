-- Migration: Remove PIN functionality
-- This script removes all PIN-related tables and policies from the database

-- Drop PIN-related policies first
DROP POLICY IF EXISTS "Users can view their own family PIN" ON family_pins;
DROP POLICY IF EXISTS "Users can insert their own family PIN" ON family_pins;
DROP POLICY IF EXISTS "Users can update their own family PIN" ON family_pins;
DROP POLICY IF EXISTS "Users can delete their own family PIN" ON family_pins;
DROP POLICY IF EXISTS "Allow PIN lookup for authentication" ON family_pins;

-- Drop the family_pins table
DROP TABLE IF EXISTS family_pins;

-- Add RLS policies for family sharing tables (if they don't exist)
ALTER TABLE family_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- Family codes policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own family codes') THEN
        CREATE POLICY "Users can view own family codes" ON family_codes
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own family codes') THEN
        CREATE POLICY "Users can insert own family codes" ON family_codes
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own family codes') THEN
        CREATE POLICY "Users can update own family codes" ON family_codes
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own family codes') THEN
        CREATE POLICY "Users can delete own family codes" ON family_codes
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow family code lookup for joining') THEN
        CREATE POLICY "Allow family code lookup for joining" ON family_codes
            FOR SELECT USING (true);
    END IF;
END $$;

-- Family members policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view family members') THEN
        CREATE POLICY "Users can view family members" ON family_members
            FOR SELECT USING (
                auth.uid() = user_id OR 
                auth.uid() = family_id
            );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert family members') THEN
        CREATE POLICY "Users can insert family members" ON family_members
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update family members') THEN
        CREATE POLICY "Users can update family members" ON family_members
            FOR UPDATE USING (
                auth.uid() = user_id OR 
                auth.uid() = family_id
            );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete family members') THEN
        CREATE POLICY "Users can delete family members" ON family_members
            FOR DELETE USING (
                auth.uid() = user_id OR 
                auth.uid() = family_id
            );
    END IF;
END $$;

-- Migration complete
-- PIN functionality has been removed
-- Family sharing functionality remains intact 