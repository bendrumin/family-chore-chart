-- Add notes column to chores table
ALTER TABLE chores ADD COLUMN notes TEXT DEFAULT '';

-- Update existing chores to have empty notes
UPDATE chores SET notes = '' WHERE notes IS NULL; 