-- Add reward mode toggle and weekly bonus label to family settings
ALTER TABLE family_settings ADD COLUMN IF NOT EXISTS reward_mode text DEFAULT 'flat';
ALTER TABLE family_settings ADD COLUMN IF NOT EXISTS weekly_bonus_label text;
