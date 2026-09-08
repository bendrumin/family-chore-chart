-- 019: Vacation mode. A family-wide pause window during which nothing is due,
-- so streaks, perfect days, and weekly stats simply skip the days (the same
-- "nothing due" rule that already carries weekday-only kids over weekends).
--
-- Two pieces:
--   1. The live switch lives on family_settings (vacation_starts_on/ends_on)
--      so every existing fetch path on web, iOS, and kid mode sees it with
--      zero new plumbing or RLS work.
--   2. vacation_periods keeps the history, because streak math looks back in
--      time and must know that a week in July was a trip, not a collapse.

alter table family_settings
  add column if not exists vacation_starts_on date,
  add column if not exists vacation_ends_on date;

alter table family_settings
  add constraint family_settings_vacation_range
  check (
    (vacation_starts_on is null and vacation_ends_on is null)
    or (vacation_starts_on is not null and vacation_ends_on is not null
        and vacation_ends_on >= vacation_starts_on)
  );

create table if not exists vacation_periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  created_at timestamptz not null default now(),
  constraint vacation_periods_range check (ends_on >= starts_on)
);

create index if not exists vacation_periods_user_idx
  on vacation_periods (user_id, starts_on);

alter table vacation_periods enable row level security;

-- Owner: full control. Mirrors the family_settings owner policies.
create policy "vacation owner select" on vacation_periods
  for select using (auth.uid() = user_id);
create policy "vacation owner insert" on vacation_periods
  for insert with check (auth.uid() = user_id);
create policy "vacation owner update" on vacation_periods
  for update using (auth.uid() = user_id);
create policy "vacation owner delete" on vacation_periods
  for delete using (auth.uid() = user_id);

-- Family members (co-parents) can read the history for their family's stats.
create policy "vacation member select" on vacation_periods
  for select using (
    exists (
      select 1 from family_members fm
      where fm.family_id = vacation_periods.user_id
        and fm.user_id = auth.uid()
    )
  );
