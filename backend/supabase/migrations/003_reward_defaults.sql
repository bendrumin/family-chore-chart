-- The old default of 7 cents/day was one household's setting that leaked into the
-- schema. New families now choose their reward mode and amount during onboarding
-- (web wizard + iOS first-run); this is only the fallback for a row created
-- without one. Existing rows are NOT changed.
ALTER TABLE family_settings ALTER COLUMN daily_reward_cents SET DEFAULT 100;
