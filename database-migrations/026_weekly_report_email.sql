-- 026: Weekly family report email (Premium, opt-in).
-- Run once in the Supabase SQL Editor. Idempotent.
--
-- Off by default: a parent turns it on in Settings. /api/cron/weekly-report
-- sends each opted-in Premium family last week's summary on Sunday in their
-- timezone, once per week (weekly_report_last_sent). The token makes the
-- one-click unsubscribe link in every email work without signing in.

alter table public.family_settings add column if not exists weekly_report_email boolean not null default false;
alter table public.family_settings add column if not exists weekly_report_last_sent date;
alter table public.family_settings add column if not exists weekly_report_token uuid not null default gen_random_uuid();

create unique index if not exists family_settings_weekly_report_token_idx
  on public.family_settings (weekly_report_token);
