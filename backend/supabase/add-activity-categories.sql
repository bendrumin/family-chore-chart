-- Add Activity Categories Migration
-- This migration updates the chores table to support the new category system

-- Step 1: Create an enum type for activity categories
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_category') THEN
        CREATE TYPE activity_category AS ENUM (
            'household_chores',
            'learning_education',
            'physical_activity',
            'creative_time',
            'games_play',
            'reading',
            'family_time',
            'custom'
        );
    END IF;
END $$;

-- Step 2: Migrate existing 'General' and 'category' data to 'household_chores'
-- First, update all existing chores to use 'household_chores'
UPDATE chores 
SET category = 'household_chores' 
WHERE category = 'General' OR category IS NULL;

-- Step 3: Add a temporary column with the new enum type
ALTER TABLE chores ADD COLUMN category_new activity_category DEFAULT 'household_chores';

-- Step 4: Migrate data from old category column to new enum column
UPDATE chores
SET category_new = CASE 
    WHEN category ILIKE '%household%' OR category ILIKE '%chore%' OR category = 'household_chores' THEN 'household_chores'::activity_category
    WHEN category ILIKE '%learn%' OR category ILIKE '%education%' OR category ILIKE '%homework%' THEN 'learning_education'::activity_category
    WHEN category ILIKE '%physical%' OR category ILIKE '%exercise%' OR category ILIKE '%sport%' THEN 'physical_activity'::activity_category
    WHEN category ILIKE '%creative%' OR category ILIKE '%art%' OR category ILIKE '%music%' THEN 'creative_time'::activity_category
    WHEN category ILIKE '%game%' OR category ILIKE '%play%' THEN 'games_play'::activity_category
    WHEN category ILIKE '%read%' OR category ILIKE '%book%' THEN 'reading'::activity_category
    WHEN category ILIKE '%family%' THEN 'family_time'::activity_category
    ELSE 'household_chores'::activity_category
END;

-- Step 5: Drop the old category column and rename the new one
ALTER TABLE chores DROP COLUMN category;
ALTER TABLE chores RENAME COLUMN category_new TO category;

-- Step 6: Update the index
DROP INDEX IF EXISTS idx_chores_category;
CREATE INDEX idx_chores_category ON chores(category);

-- Step 7: Add comments for documentation
COMMENT ON COLUMN chores.category IS 'Activity category: household_chores (default), learning_education, physical_activity, creative_time, games_play, reading, family_time, or custom';
COMMENT ON TYPE activity_category IS 'Enum for activity categories in the chore system';

-- Step 8: Verify the migration
DO $$
DECLARE
    chore_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO chore_count FROM chores WHERE category = 'household_chores';
    RAISE NOTICE 'Migration complete. % chores set to household_chores category.', chore_count;
END $$;

