-- Theme Support Migration Script
-- Adds custom theme storage to family_settings table
-- This allows users to save and load their custom themes across sessions

-- Step 1: Check if column already exists (safety check)
DO $$
BEGIN
    -- Check if custom_theme column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'family_settings' AND column_name = 'custom_theme'
    ) THEN
        -- Add custom_theme column as JSONB for flexible theme data storage
        ALTER TABLE family_settings ADD COLUMN custom_theme JSONB DEFAULT NULL;
        RAISE NOTICE 'Added custom_theme column to family_settings table';
    ELSE
        RAISE NOTICE 'custom_theme column already exists, skipping';
    END IF;
END $$;

-- Step 2: Add column comment for documentation
COMMENT ON COLUMN family_settings.custom_theme IS 'Custom theme preferences stored as JSON: {name, key, vars: {--primary, --primary-dark, --card-bg}}';

-- Step 3: Create index for performance (if querying by theme properties)
-- Note: JSONB indexing is optional but can be useful for complex queries
-- CREATE INDEX IF NOT EXISTS idx_family_settings_theme ON family_settings USING GIN (custom_theme);

-- Step 4: Verify the migration was successful
SELECT 
    'Theme support migration completed successfully!' as status,
    COUNT(*) as total_families,
    COUNT(custom_theme) as families_with_custom_themes
FROM family_settings;

