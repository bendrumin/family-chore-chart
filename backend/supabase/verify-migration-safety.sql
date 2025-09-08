-- Migration Safety Verification Script
-- Run this BEFORE running the migration to verify it's safe

-- Check 1: Verify children table exists and has expected structure
SELECT 
    'Children table structure check' as check_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'children') 
        THEN 'PASS: children table exists'
        ELSE 'FAIL: children table does not exist'
    END as result;

-- Check 2: Verify existing columns are present
SELECT 
    'Existing columns check' as check_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'children' AND column_name = 'id')
        AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'children' AND column_name = 'name')
        AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'children' AND column_name = 'age')
        AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'children' AND column_name = 'avatar_color')
        THEN 'PASS: All required columns exist'
        ELSE 'FAIL: Missing required columns'
    END as result;

-- Check 3: Check if new columns already exist (to avoid conflicts)
SELECT 
    'New columns conflict check' as check_name,
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'children' AND column_name = 'avatar_url')
        AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'children' AND column_name = 'avatar_file')
        THEN 'PASS: New columns do not exist, safe to add'
        ELSE 'WARN: One or more new columns already exist'
    END as result;

-- Check 4: Count existing children data
SELECT 
    'Data preservation check' as check_name,
    COUNT(*) as total_children,
    COUNT(DISTINCT id) as unique_children,
    MIN(created_at) as oldest_child,
    MAX(created_at) as newest_child
FROM children;

-- Check 5: Verify no data will be lost
SELECT 
    'Data integrity check' as check_name,
    CASE 
        WHEN COUNT(*) = COUNT(DISTINCT id) 
        THEN 'PASS: No duplicate IDs found'
        ELSE 'FAIL: Duplicate IDs found - data integrity issue'
    END as result
FROM children;

-- Check 6: Show current table structure
SELECT 
    'Current table structure' as info,
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'children' 
ORDER BY ordinal_position;
