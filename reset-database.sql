-- Reset Database Script (Nuclear Option)
-- This script will DROP and RECREATE all tables
-- WARNING: This will permanently delete ALL data
-- Run this in your Supabase SQL Editor

-- Drop all tables in correct order (due to foreign key constraints)
DROP TABLE IF EXISTS chore_completions CASCADE;
DROP TABLE IF EXISTS chores CASCADE;
DROP TABLE IF EXISTS children CASCADE;
DROP TABLE IF EXISTS family_settings CASCADE;
DROP TABLE IF EXISTS family_members CASCADE;
DROP TABLE IF EXISTS family_codes CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop custom types
DROP TYPE IF EXISTS subscription_type CASCADE;

-- Now run the complete schema again
-- Copy and paste the entire contents of backend/supabase/schema.sql here
-- OR run the schema.sql file separately after this

-- Verify tables are recreated
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'children', 'chores', 'chore_completions', 'family_settings', 'family_codes', 'family_members')
ORDER BY table_name; 