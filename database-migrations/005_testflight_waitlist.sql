-- TestFlight Waitlist
-- Stores email signups for the iOS TestFlight beta.
-- Used by the /api/testflight-signup endpoint.
--
-- Run this in your Supabase SQL Editor or via psql

CREATE TABLE IF NOT EXISTS testflight_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT,
  source TEXT DEFAULT 'direct',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT testflight_waitlist_email_unique UNIQUE (email)
);

-- Index for quick lookups by email
CREATE INDEX IF NOT EXISTS idx_testflight_waitlist_email ON testflight_waitlist(email);

-- RLS: only service-role can insert/read (no public access)
ALTER TABLE testflight_waitlist ENABLE ROW LEVEL SECURITY;

-- No public policies — the API route uses the service-role client to bypass RLS

COMMENT ON TABLE testflight_waitlist IS 'Email signups for iOS TestFlight beta access.';
