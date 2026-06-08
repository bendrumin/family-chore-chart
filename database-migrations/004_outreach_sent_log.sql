-- Outreach send log (admin only — accessed via service role)
-- Run in Supabase SQL Editor before using the admin outreach UI in production.

CREATE TABLE IF NOT EXISTS outreach_sent_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign TEXT NOT NULL,
    email TEXT NOT NULL,
    family_name TEXT,
    resend_id TEXT,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (campaign, email)
);

CREATE INDEX IF NOT EXISTS idx_outreach_sent_log_campaign ON outreach_sent_log(campaign);
CREATE INDEX IF NOT EXISTS idx_outreach_sent_log_sent_at ON outreach_sent_log(sent_at DESC);

ALTER TABLE outreach_sent_log ENABLE ROW LEVEL SECURITY;
-- No RLS policies — only service role can read/write
