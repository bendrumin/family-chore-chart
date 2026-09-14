-- 021: Signup attribution. One jsonb column on profiles, written only by the
-- service-role signup route: {utm_source, utm_medium, utm_campaign,
-- utm_content, utm_term, referrer, landing, platform, captured_at}.
-- First-touch: the web stores the first thing it saw in localStorage and
-- sends it along at account creation. No RLS change (no client write path),
-- no backfill possible for existing accounts.

alter table profiles
  add column if not exists signup_source jsonb;
