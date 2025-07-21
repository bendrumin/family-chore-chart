-- Clear Database Data Script
-- This script will clear all data from your ChoreStar database
-- Run this in your Supabase SQL Editor

-- Clear all data from tables (in correct order due to foreign key constraints)
DELETE FROM chore_completions;
DELETE FROM chores;
DELETE FROM children;
DELETE FROM family_settings;
DELETE FROM family_members;
DELETE FROM family_codes;
DELETE FROM profiles;

-- Reset any auto-increment sequences (if any)
-- Note: UUID tables don't need sequence resets

-- Verify tables are empty
SELECT 'chore_completions' as table_name, COUNT(*) as row_count FROM chore_completions
UNION ALL
SELECT 'chores' as table_name, COUNT(*) as row_count FROM chores
UNION ALL
SELECT 'children' as table_name, COUNT(*) as row_count FROM children
UNION ALL
SELECT 'family_settings' as table_name, COUNT(*) as row_count FROM family_settings
UNION ALL
SELECT 'family_members' as table_name, COUNT(*) as row_count FROM family_members
UNION ALL
SELECT 'family_codes' as table_name, COUNT(*) as row_count FROM family_codes
UNION ALL
SELECT 'profiles' as table_name, COUNT(*) as row_count FROM profiles; 