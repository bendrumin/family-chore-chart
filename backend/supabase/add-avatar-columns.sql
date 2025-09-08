-- Add avatar columns to children table
ALTER TABLE children ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL;
ALTER TABLE children ADD COLUMN IF NOT EXISTS avatar_file TEXT DEFAULT NULL;

-- Update existing children to have NULL values for new columns
UPDATE children SET avatar_url = NULL WHERE avatar_url IS NULL;
UPDATE children SET avatar_file = NULL WHERE avatar_file IS NULL;
