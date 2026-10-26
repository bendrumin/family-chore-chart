-- When a quiet family was last sent a "come back" nudge.
--
-- Read by /api/cron/lapse-nudge (lib/engagement/discovery.ts lapseDue): a
-- family is nudged at most once per lapse, meaning not again until they are
-- active after this timestamp and then go quiet a second time. Null means
-- never nudged. Server-written only, through the service role.
alter table public.family_settings
  add column if not exists lapse_nudged_at timestamptz;
