-- ROLLBACK Avatar Migration Script
-- Use this ONLY if you need to undo the avatar migration
-- WARNING: This will remove the new avatar columns and any data in them

-- Step 1: Backup any avatar data before removal (optional)
-- Uncomment the following lines if you want to backup the data first
/*
CREATE TABLE IF NOT EXISTS avatar_data_backup AS
SELECT 
    id,
    name,
    avatar_url,
    avatar_file,
    NOW() as backup_timestamp
FROM children 
WHERE avatar_url IS NOT NULL OR avatar_file IS NOT NULL;
*/

-- Step 2: Drop the indexes first (required before dropping columns)
DROP INDEX IF EXISTS idx_children_avatar_url;
DROP INDEX IF EXISTS idx_children_avatar_file;

-- Step 3: Remove the avatar columns
ALTER TABLE children DROP COLUMN IF EXISTS avatar_url;
ALTER TABLE children DROP COLUMN IF EXISTS avatar_file;

-- Step 4: Verify rollback was successful
SELECT 
    'Rollback completed successfully!' as status,
    COUNT(*) as total_children_remaining
FROM children;

-- Step 5: Show the restored table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'children' 
AND column_name IN ('avatar_url', 'avatar_file', 'avatar_color', 'name', 'age')
ORDER BY column_name;

-- Note: If you created a backup table, you can restore the data with:
-- UPDATE children SET avatar_url = backup.avatar_url, avatar_file = backup.avatar_file
-- FROM avatar_data_backup backup WHERE children.id = backup.id;
