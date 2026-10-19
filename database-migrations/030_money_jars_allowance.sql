-- 030: Kid money management (Premium): Spend / Save / Give jars, automatic
-- weekly allowance, interest on Save, fines and pay-a-parent-back, and
-- screen-time minutes as a second reward currency.
-- Run once in the Supabase SQL Editor. Idempotent. Needs 011 (allowance
-- payouts), 017 (goals, store), 024 (request_is_app_session, family_is_premium).
--
-- Nothing here stores a balance. The wallet stays derived on read
-- (chorestar-nextjs/lib/utils/wallet.ts, math in lib/utils/money.ts):
--
--   balance = chore earnings + money_ledger credits
--             - allowance_payouts - money_ledger debits
--
-- JARS are derived too. money_jar_splits is a history of the split a parent
-- chose for a kid, each version dated (family-local) from the day it was set.
-- Every piece of income (a day's chore earnings, a perfect-week bonus, a
-- weekly allowance) is split by the version in force on the day it was earned,
-- so turning jars on never moves money earned before that day: it stays in
-- Spend. Spending is tagged with the jar it came from: allowance_payouts.jar
-- (null = Spend, which is every payout before this migration) and
-- money_ledger.jar.
--
-- WRITES: every new table is written only by the server (service role):
-- /api/money for parents, which checks family membership and Premium, and
-- /api/cron/allowance. App sessions can read their own family's rows (owner
-- or co-parent via family_members, like 017) and nothing else. Kids read
-- through the kid API, which also uses the service role.

-- ---------------------------------------------------------------------------
-- Per-kid money settings: payday, weekly allowance, interest
-- ---------------------------------------------------------------------------
create table if not exists public.child_money_settings (
  child_id uuid primary key references public.children(id) on delete cascade,
  -- 0 = Sunday .. 6 = Saturday, in the family's timezone (family_settings.timezone).
  payday_weekday smallint not null default 6 check (payday_weekday between 0 and 6),
  -- Fixed weekly allowance. 0 = off.
  allowance_cents integer not null default 0 check (allowance_cents between 0 and 100000),
  -- Optional: only pay when the kid finished at least this share of the chores
  -- due in the 7 days before payday. Null = always pay.
  allowance_threshold_pct smallint check (allowance_threshold_pct is null or allowance_threshold_pct between 1 and 100),
  -- The first payday allowance can be paid on, so switching it on midweek
  -- doesn't pay a payday that already passed.
  allowance_started_on date,
  -- Weekly interest on the Save jar, in basis points (100 = 1%). Max 10%.
  interest_bps integer not null default 0 check (interest_bps between 0 and 1000),
  interest_started_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Jar split history
-- ---------------------------------------------------------------------------
create table if not exists public.money_jar_splits (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  -- false = jars off from this day: everything is one balance (Spend).
  enabled boolean not null default true,
  spend_pct smallint not null check (spend_pct between 0 and 100),
  save_pct smallint not null check (save_pct between 0 and 100),
  give_pct smallint not null check (give_pct between 0 and 100),
  -- Family-local date this split starts applying to income.
  effective_on date not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  constraint money_jar_splits_total check (spend_pct + save_pct + give_pct = 100)
);

create index if not exists idx_money_jar_splits_child on public.money_jar_splits (child_id, effective_on, created_at);

-- ---------------------------------------------------------------------------
-- Recurring weekly deductions ("phone bill $2/week")
-- ---------------------------------------------------------------------------
create table if not exists public.money_recurring_deductions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 60),
  amount_cents integer not null check (amount_cents between 1 and 100000),
  -- Take the full amount even when Spend can't cover it (the kid owes the rest).
  allow_negative boolean not null default false,
  is_active boolean not null default true,
  started_on date not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_money_recurring_child on public.money_recurring_deductions (child_id) where is_active;

-- ---------------------------------------------------------------------------
-- The money ledger: everything that moves money besides chores and payouts
-- ---------------------------------------------------------------------------
create table if not exists public.money_ledger (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  kind text not null check (kind in ('allowance', 'interest', 'fine', 'repayment', 'donation', 'transfer')),
  -- Which jar this lands in or comes out of. Null = income split by the jar
  -- split in force on effective_on (weekly allowance).
  jar text check (jar is null or jar in ('spend', 'save', 'give')),
  -- Signed cents: credits positive, deductions negative. A skipped allowance
  -- (threshold missed) is a 0 row, so the kid sees why and the cron doesn't retry.
  amount_cents integer not null check (amount_cents between -100000 and 100000),
  -- Family-local date the money moved (drives the jar split for income).
  effective_on date not null,
  -- Weekly cron rows: the Sunday starting the payday's week. Null for one-offs.
  period_week date,
  -- Which rule a weekly row came from ('' for allowance and interest, the
  -- recurring deduction's id for repayments).
  source_key text not null default '',
  note text check (note is null or char_length(note) <= 200),
  created_by uuid,
  created_at timestamptz not null default now(),
  constraint money_ledger_sign check (
    (kind in ('allowance', 'interest') and amount_cents >= 0)
    or (kind in ('fine', 'repayment', 'donation') and amount_cents <= 0)
    or kind = 'transfer'
  ),
  constraint money_ledger_income_unsplit check (jar is not null or kind = 'allowance')
);

-- Idempotency for /api/cron/allowance: one allowance, one interest payment and
-- one collection per recurring deduction per kid per week, however many times
-- the cron runs.
create unique index if not exists money_ledger_weekly_once
  on public.money_ledger (child_id, kind, period_week, source_key)
  where period_week is not null;

create index if not exists idx_money_ledger_child on public.money_ledger (child_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Payouts say which jar they came out of
-- ---------------------------------------------------------------------------
alter table public.allowance_payouts add column if not exists jar text;
do $$ begin
  alter table public.allowance_payouts add constraint allowance_payouts_jar_check
    check (jar is null or jar in ('spend', 'save', 'give'));
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Screen-time minutes: a second reward currency
-- ---------------------------------------------------------------------------
alter table public.chores add column if not exists reward_minutes integer not null default 0;
alter table public.routines add column if not exists reward_minutes integer not null default 0;
-- Captured when a routine is finished, so changing the reward later doesn't
-- rewrite history.
alter table public.routine_completions add column if not exists minutes_earned integer not null default 0;

do $$ begin
  alter table public.chores add constraint chores_reward_minutes_check check (reward_minutes between 0 and 600);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.routines add constraint routines_reward_minutes_check check (reward_minutes between 0 and 600);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.routine_completions add constraint routine_completions_minutes_check check (minutes_earned between 0 and 600);
exception when duplicate_object then null; end $$;

-- Minutes the parent marked as used ("used 30 min"), or corrected.
create table if not exists public.screen_minutes_ledger (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  kind text not null check (kind in ('used', 'adjustment')),
  amount_minutes integer not null check (amount_minutes between -6000 and 6000 and amount_minutes <> 0),
  note text check (note is null or char_length(note) <= 200),
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_screen_minutes_child on public.screen_minutes_ledger (child_id, created_at desc);

-- Minutes are Premium. The Money settings write them through the server, but
-- chores and routines are also written straight from the apps under RLS, so an
-- app session on a free family can't switch them on. Clearing is always fine.
create or replace function public.enforce_premium_reward_minutes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  owner_id uuid;
begin
  if not public.request_is_app_session() or coalesce(new.reward_minutes, 0) = 0 then
    return new;
  end if;
  if tg_op = 'UPDATE' and coalesce(old.reward_minutes, 0) = new.reward_minutes then
    return new;
  end if;
  select user_id into owner_id from public.children where id = new.child_id;
  if owner_id is null or public.family_is_premium(owner_id) then
    return new;
  end if;
  raise exception 'Screen-time minutes are part of Premium.'
    using errcode = 'P0001', hint = 'premium_minutes';
end;
$$;

drop trigger if exists enforce_premium_reward_minutes on public.chores;
create trigger enforce_premium_reward_minutes
  before insert or update of reward_minutes on public.chores
  for each row execute function public.enforce_premium_reward_minutes();

drop trigger if exists enforce_premium_reward_minutes on public.routines;
create trigger enforce_premium_reward_minutes
  before insert or update of reward_minutes on public.routines
  for each row execute function public.enforce_premium_reward_minutes();

revoke execute on function public.enforce_premium_reward_minutes() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS: the family reads; only the server writes
-- ---------------------------------------------------------------------------
alter table public.child_money_settings enable row level security;
alter table public.money_jar_splits enable row level security;
alter table public.money_recurring_deductions enable row level security;
alter table public.money_ledger enable row level security;
alter table public.screen_minutes_ledger enable row level security;

drop policy if exists "money settings: family select" on public.child_money_settings;
create policy "money settings: family select" on public.child_money_settings for select to authenticated using (
  exists (
    select 1 from public.children c
    where c.id = child_id
      and (c.user_id = auth.uid()
        or exists (select 1 from public.family_members fm where fm.user_id = auth.uid() and fm.family_id = c.user_id))
  )
);

drop policy if exists "jar splits: family select" on public.money_jar_splits;
create policy "jar splits: family select" on public.money_jar_splits for select to authenticated using (
  exists (
    select 1 from public.children c
    where c.id = child_id
      and (c.user_id = auth.uid()
        or exists (select 1 from public.family_members fm where fm.user_id = auth.uid() and fm.family_id = c.user_id))
  )
);

drop policy if exists "recurring deductions: family select" on public.money_recurring_deductions;
create policy "recurring deductions: family select" on public.money_recurring_deductions for select to authenticated using (
  exists (
    select 1 from public.children c
    where c.id = child_id
      and (c.user_id = auth.uid()
        or exists (select 1 from public.family_members fm where fm.user_id = auth.uid() and fm.family_id = c.user_id))
  )
);

drop policy if exists "money ledger: family select" on public.money_ledger;
create policy "money ledger: family select" on public.money_ledger for select to authenticated using (
  exists (
    select 1 from public.children c
    where c.id = child_id
      and (c.user_id = auth.uid()
        or exists (select 1 from public.family_members fm where fm.user_id = auth.uid() and fm.family_id = c.user_id))
  )
);

drop policy if exists "screen minutes: family select" on public.screen_minutes_ledger;
create policy "screen minutes: family select" on public.screen_minutes_ledger for select to authenticated using (
  exists (
    select 1 from public.children c
    where c.id = child_id
      and (c.user_id = auth.uid()
        or exists (select 1 from public.family_members fm where fm.user_id = auth.uid() and fm.family_id = c.user_id))
  )
);

-- No insert / update / delete policies on purpose: with RLS on, app sessions
-- can't write these tables at all. The service role bypasses RLS.
revoke insert, update, delete on public.child_money_settings from anon, authenticated;
revoke insert, update, delete on public.money_jar_splits from anon, authenticated;
revoke insert, update, delete on public.money_recurring_deductions from anon, authenticated;
revoke insert, update, delete on public.money_ledger from anon, authenticated;
revoke insert, update, delete on public.screen_minutes_ledger from anon, authenticated;
