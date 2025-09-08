-- Add avatar URL and file columns to children table
-- This migration adds support for the new icon picker system

-- Add avatar_url column for DiceBear API URLs
ALTER TABLE children 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add avatar_file column for uploaded files
ALTER TABLE children 
ADD COLUMN IF NOT EXISTS avatar_file TEXT;

-- Add comments for documentation
COMMENT ON COLUMN children.avatar_url IS 'URL for avatar image from DiceBear API or other external source';
COMMENT ON COLUMN children.avatar_file IS 'File path for uploaded avatar image';

-- Update existing children to have null values for new columns
UPDATE children 
SET avatar_url = NULL, avatar_file = NULL 
WHERE avatar_url IS NULL AND avatar_file IS NULL;

-- Create index on avatar_url for performance
CREATE INDEX IF NOT EXISTS idx_children_avatar_url ON children(avatar_url);

-- Create index on avatar_file for performance  
CREATE INDEX IF NOT EXISTS idx_children_avatar_file ON children(avatar_file);

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'children' 
AND column_name IN ('avatar_url', 'avatar_file', 'avatar_color')
ORDER BY column_name;
