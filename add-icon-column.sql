-- Add icon column to chores table
ALTER TABLE chores ADD COLUMN icon TEXT DEFAULT '📝';

-- Update existing chores to have a default icon
UPDATE chores SET icon = '📝' WHERE icon IS NULL; 