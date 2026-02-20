-- Family Kid Login Code
-- Adds a unique code per family so kid login is scoped: only children in that family
-- can log in when using the family-specific URL (e.g. /kid-login/abc123)
--
-- Run this in your Supabase SQL Editor or via psql

-- Add kid_login_code to profiles (each profile = one family/parent account)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS kid_login_code VARCHAR(12) UNIQUE;

-- Create index for fast lookups by code
CREATE INDEX IF NOT EXISTS idx_profiles_kid_login_code ON profiles(kid_login_code) WHERE kid_login_code IS NOT NULL;

-- Generate codes for existing profiles that don't have one
-- Uses a random 8-char alphanumeric string
DO $$
DECLARE
  rec RECORD;
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  FOR rec IN SELECT id FROM profiles WHERE kid_login_code IS NULL
  LOOP
    LOOP
      new_code := lower(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
      SELECT EXISTS(SELECT 1 FROM profiles WHERE kid_login_code = new_code) INTO code_exists;
      EXIT WHEN NOT code_exists;
    END LOOP;
    UPDATE profiles SET kid_login_code = new_code WHERE id = rec.id;
  END LOOP;
END $$;

COMMENT ON COLUMN profiles.kid_login_code IS 'Unique code for family-specific kid login URL. Kids use /kid-login/{code} + PIN.';
