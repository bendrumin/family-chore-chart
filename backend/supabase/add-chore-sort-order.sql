-- Add sort_order column to chores table for persistent chore ordering
-- This migration adds the sort_order column if it doesn't exist

-- Add sort_order column if it doesn't exist
ALTER TABLE chores ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Create index for better performance when querying by sort order
CREATE INDEX IF NOT EXISTS idx_chores_sort_order ON chores(child_id, sort_order);

-- Update existing chores to have sort_order based on their current order
-- This ensures existing data has proper sort_order values
UPDATE chores 
SET sort_order = subquery.row_number - 1
FROM (
    SELECT 
        id,
        ROW_NUMBER() OVER (PARTITION BY child_id ORDER BY created_at) as row_number
    FROM chores
) AS subquery
WHERE chores.id = subquery.id;

-- Add comment for documentation
COMMENT ON COLUMN chores.sort_order IS 'Sort order for chores within each child (0-based index)';

