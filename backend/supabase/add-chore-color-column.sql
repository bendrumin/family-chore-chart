-- Add color column to chores table for premium custom chore colors
ALTER TABLE chores ADD COLUMN color TEXT DEFAULT NULL;

-- Optionally, set a default color for existing chores (optional, can be left as NULL)
-- UPDATE chores SET color = '#ff6b6b' WHERE color IS NULL; 