-- 033: Family calendar feed (Premium). Run once in the Supabase SQL Editor.
-- Idempotent.
--
-- A parent turns on a secret iCalendar subscription URL in Settings > Family
-- and adds it to Apple Calendar, Google Calendar, Outlook or a wall calendar.
-- GET /api/calendar/<token>.ics serves the family's chores and routines.
--
-- One feed per scope: the whole family (child_id null) or one kid. The token
-- is 32 random bytes as base64url (256 bits). It is the only credential a
-- calendar app has, so it is stored as-is (the parent needs to copy the URL
-- again later) and readable only by the family owner; the route looks it up
-- with the service role. Regenerating replaces the token, which kills the old
-- URL at once. Co-parents manage feeds through /api/calendar/feeds, which
-- checks family membership and writes with the service role.
--
-- A family that stops being Premium keeps its rows: the feed answers with an
-- empty calendar and one "needs Premium" note, and starts working again by
-- itself on renewal.

create table if not exists public.calendar_feeds (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.profiles (id) on delete cascade,
  child_id uuid references public.children (id) on delete cascade,
  token text not null,
  -- The browser zone of whoever turned it on; used when family_settings.timezone
  -- is unset or UTC (it defaults to UTC and has no editor yet).
  timezone text check (timezone is null or char_length(timezone) between 1 and 64),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  last_fetched_at timestamptz,
  constraint calendar_feeds_token_format check (token ~ '^[A-Za-z0-9_-]{43}$')
);

create unique index if not exists calendar_feeds_token_idx
  on public.calendar_feeds (token);

-- One feed per family per scope (null child = whole family).
create unique index if not exists calendar_feeds_scope_idx
  on public.calendar_feeds (family_id, coalesce(child_id, '00000000-0000-0000-0000-000000000000'::uuid));

alter table public.calendar_feeds enable row level security;

-- Owner only. The token never reaches co-parents' clients except through the
-- server route, and never reaches kids.
drop policy if exists "Owners read their calendar feeds" on public.calendar_feeds;
create policy "Owners read their calendar feeds" on public.calendar_feeds
  for select using ((select auth.uid()) = family_id);

drop policy if exists "Owners add calendar feeds" on public.calendar_feeds;
create policy "Owners add calendar feeds" on public.calendar_feeds
  for insert with check (
    (select auth.uid()) = family_id
    -- Inline rather than family_is_premium(), whose EXECUTE is revoked from
    -- app roles (024). The owner can read their own profile.
    and exists (
      select 1 from public.profiles p
      where p.id = family_id and p.subscription_type::text in ('premium', 'lifetime')
    )
    and (
      child_id is null
      or exists (select 1 from public.children c where c.id = child_id and c.user_id = (select auth.uid()))
    )
  );

drop policy if exists "Owners update their calendar feeds" on public.calendar_feeds;
create policy "Owners update their calendar feeds" on public.calendar_feeds
  for update using ((select auth.uid()) = family_id)
  with check (
    (select auth.uid()) = family_id
    -- Inline rather than family_is_premium(), whose EXECUTE is revoked from
    -- app roles (024). The owner can read their own profile.
    and exists (
      select 1 from public.profiles p
      where p.id = family_id and p.subscription_type::text in ('premium', 'lifetime')
    )
    and (
      child_id is null
      or exists (select 1 from public.children c where c.id = child_id and c.user_id = (select auth.uid()))
    )
  );

-- Turning a feed off is always allowed, Premium or not.
drop policy if exists "Owners delete their calendar feeds" on public.calendar_feeds;
create policy "Owners delete their calendar feeds" on public.calendar_feeds
  for delete using ((select auth.uid()) = family_id);

comment on table public.calendar_feeds is
  'Secret iCalendar feed URLs (Premium). Token is the bearer credential for GET /api/calendar/<token>.ics; service role reads by token.';
