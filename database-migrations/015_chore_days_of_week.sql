-- Chore scheduling: which days of the week a chore applies to.
--
-- Run once in the Supabase SQL Editor. Idempotent.
--
-- Until now every chore was due every day. "Take out the trash on Tuesday" and
-- "piano on Mon, Wed, Fri" could not be expressed, and a chore that legitimately
-- had no work on a given day still broke that day's perfect-day check.
--
-- days_of_week is a set of 0..6 (Sunday = 0 .. Saturday = 6), the same
-- convention as chore_completions.day_of_week and JavaScript's Date.getDay().
-- Existing chores default to all seven days, so nothing changes for a family
-- until they edit a chore.

alter table chores
  add column if not exists days_of_week smallint[]
    not null default '{0,1,2,3,4,5,6}';

-- A chore has to apply to at least one day, and only real weekdays.
alter table chores drop constraint if exists chores_days_of_week_valid;
alter table chores add constraint chores_days_of_week_valid
  check (
    cardinality(days_of_week) > 0
    and days_of_week <@ '{0,1,2,3,4,5,6}'::smallint[]
  );

comment on column chores.days_of_week is
  'Days the chore is due, 0=Sunday .. 6=Saturday. Defaults to every day.';
