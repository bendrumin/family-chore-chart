-- Add category column to chores table
ALTER TABLE chores ADD COLUMN category TEXT DEFAULT 'General';

-- Add index for better performance
CREATE INDEX idx_chores_category ON chores(category);

-- Update existing chores to have a default category
UPDATE chores SET category = 'General' WHERE category IS NULL; 