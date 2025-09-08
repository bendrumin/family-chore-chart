-- SAFE Avatar Migration Script
-- This script safely adds avatar columns without destroying any existing data
-- Run this on your production database to add the new avatar functionality

-- Step 1: Check if columns already exist (safety check)
DO $$
BEGIN
    -- Check if avatar_url column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'children' AND column_name = 'avatar_url'
    ) THEN
        -- Add avatar_url column for DiceBear API URLs
        ALTER TABLE children ADD COLUMN avatar_url TEXT;
        RAISE NOTICE 'Added avatar_url column to children table';
    ELSE
        RAISE NOTICE 'avatar_url column already exists, skipping';
    END IF;
    
    -- Check if avatar_file column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'children' AND column_name = 'avatar_file'
    ) THEN
        -- Add avatar_file column for uploaded files
        ALTER TABLE children ADD COLUMN avatar_file TEXT;
        RAISE NOTICE 'Added avatar_file column to children table';
    ELSE
        RAISE NOTICE 'avatar_file column already exists, skipping';
    END IF;
END $$;

-- Step 2: Add column comments for documentation
COMMENT ON COLUMN children.avatar_url IS 'URL for avatar image from DiceBear API or other external source';
COMMENT ON COLUMN children.avatar_file IS 'File path for uploaded avatar image';

-- Step 3: Create indexes safely (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_children_avatar_url ON children(avatar_url);
CREATE INDEX IF NOT EXISTS idx_children_avatar_file ON children(avatar_file);

-- Step 4: Verify the migration was successful
SELECT 
    'Migration completed successfully!' as status,
    COUNT(*) as total_children,
    COUNT(avatar_url) as children_with_avatar_url,
    COUNT(avatar_file) as children_with_avatar_file
FROM children;

-- Step 5: Show the updated table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'children' 
AND column_name IN ('avatar_url', 'avatar_file', 'avatar_color', 'name', 'age')
ORDER BY column_name;

-- Step 6: Show sample of existing data (first 5 children)
SELECT 
    id,
    name,
    age,
    avatar_color,
    avatar_url,
    avatar_file,
    created_at
FROM children 
ORDER BY created_at 
LIMIT 5;
