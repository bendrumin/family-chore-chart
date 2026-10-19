-- 031: Family challenges (Premium): siblings team up for a shared reward.
-- Run once in the Supabase SQL Editor. Idempotent. Needs 024
-- (request_is_app_session, family_is_premium) and 025 (chores.rotation_mode,
-- for bonus-chore challenges).
--
-- A CHALLENGE is a cooperative goal for 2+ kids in a date window: "50 chores
-- together this week -> pizza night", "bedtime routine 5 nights each -> movie
-- night". Only the definition is stored. Progress is never stored: every app
-- derives it from chore_completions (approved ticks, dated week_start +
-- day_of_week) and routine_completions inside the window, with the same pure
-- functions (chorestar-nextjs/lib/challenges/progress.ts), so a late tick or a
-- sent-back tick moves the bar by itself.
--
-- When the target is hit the parent hands over the reward and presses
-- "Reward delivered" (POST /api/challenges/[id]/deliver, service role). If the
-- challenge carries reward_cents, that route also writes one
-- family_challenge_rewards row per participating kid: a ledger the wallet adds
-- to everything earned (lib/utils/wallet.ts computeBalance), exactly like
-- allowance_payouts is subtracted. Deleting the challenge keeps the credits.

-- ---------------------------------------------------------------------------
-- family_challenges
-- ---------------------------------------------------------------------------
create table if not exists public.family_challenges (
  id uuid primary key default gen_random_uuid(),
  -- The family owner's user id (same key family_settings and reward_items use).
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 60),
  emoji text check (emoji is null or char_length(emoji) <= 16),
  -- What the kids win together: "Pizza night", "Movie night".
  reward_text text not null check (char_length(reward_text) between 1 and 80),
  -- Optional money on top, credited to EACH participating kid on delivery.
  reward_cents integer not null default 0 check (reward_cents between 0 and 100000),
  -- What counts: approved chore check-offs, or routine completions.
  metric text not null check (metric in ('chores', 'routines')),
  -- 'team': everyone's count adds up to target. 'each': every kid reaches target.
  mode text not null default 'team' check (mode in ('team', 'each')),
  target integer not null check (target between 1 and 1000),
  -- Chores only: 'bonus' counts just bonus chores (025 rotation_mode = 'grab').
  chore_filter text not null default 'any' check (chore_filter in ('any', 'bonus')),
  -- Routines only: count one routine type, or any routine when null.
  routine_type text check (routine_type is null or routine_type in ('morning', 'bedtime', 'afterschool', 'custom')),
  child_ids uuid[] not null check (cardinality(child_ids) between 2 and 12),
  -- Calendar dates in the family's timezone (family_settings.timezone), inclusive.
  starts_on date not null,
  ends_on date not null,
  status text not null default 'active' check (status in ('active', 'delivered', 'cancelled')),
  delivered_at timestamptz,
  delivered_by uuid,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint family_challenges_window_check check (ends_on >= starts_on and ends_on - starts_on <= 92)
);

create index if not exists idx_family_challenges_family
  on public.family_challenges (user_id, status, ends_on desc);
create index if not exists idx_family_challenges_children
  on public.family_challenges using gin (child_ids);

alter table public.family_challenges enable row level security;

-- Family predicate: the owner, or a co-parent who joined through family_members.
drop policy if exists "challenges: family select" on public.family_challenges;
create policy "challenges: family select" on public.family_challenges for select to authenticated using (
  user_id = auth.uid()
  or exists (select 1 from public.family_members fm where fm.user_id = auth.uid() and fm.family_id = family_challenges.user_id)
);
drop policy if exists "challenges: family insert" on public.family_challenges;
create policy "challenges: family insert" on public.family_challenges for insert to authenticated with check (
  user_id = auth.uid()
  or exists (select 1 from public.family_members fm where fm.user_id = auth.uid() and fm.family_id = family_challenges.user_id)
);
drop policy if exists "challenges: family update" on public.family_challenges;
create policy "challenges: family update" on public.family_challenges for update to authenticated using (
  user_id = auth.uid()
  or exists (select 1 from public.family_members fm where fm.user_id = auth.uid() and fm.family_id = family_challenges.user_id)
);
drop policy if exists "challenges: family delete" on public.family_challenges;
create policy "challenges: family delete" on public.family_challenges for delete to authenticated using (
  user_id = auth.uid()
  or exists (select 1 from public.family_members fm where fm.user_id = auth.uid() and fm.family_id = family_challenges.user_id)
);

-- App sessions (web, iOS, Android under RLS) are held to the rules here; the
-- server (service role) checks for itself in /api/challenges:
--   * creating a challenge needs Premium (premium or lifetime owner). Not
--     grandfathered: a new feature, like shared chores. Existing challenges
--     stay editable and cancellable after a lapse.
--   * every participant is a child of this family.
--   * 'delivered' is set only by the deliver route, which credits the money.
create or replace function public.enforce_family_challenge_rules()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.request_is_app_session() then
    return new;
  end if;

  if tg_op = 'INSERT' and not public.family_is_premium(new.user_id) then
    raise exception 'Family challenges are part of Premium.'
      using errcode = 'P0001', hint = 'premium_required_challenges';
  end if;

  if tg_op = 'INSERT' or new.child_ids is distinct from old.child_ids then
    if exists (
      select 1 from unnest(new.child_ids) as k(id)
      where not exists (select 1 from public.children c where c.id = k.id and c.user_id = new.user_id)
    ) then
      raise exception 'Every kid in a challenge must be in this family.'
        using errcode = 'P0001', hint = 'challenge_child_not_in_family';
    end if;
  end if;

  if new.status = 'delivered' and (tg_op = 'INSERT' or old.status is distinct from 'delivered') then
    raise exception 'Mark a reward delivered from the app''s Reward delivered button.'
      using errcode = 'P0001', hint = 'challenge_deliver_via_server';
  end if;
  if tg_op = 'UPDATE' then
    -- Delivery is final from an app session; the server can still correct it.
    if old.status = 'delivered' and new.status is distinct from 'delivered' then
      raise exception 'A delivered challenge stays delivered.'
        using errcode = 'P0001', hint = 'challenge_already_delivered';
    end if;
    new.delivered_at := old.delivered_at;
    new.delivered_by := old.delivered_by;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists enforce_family_challenge_rules on public.family_challenges;
create trigger enforce_family_challenge_rules
  before insert or update on public.family_challenges
  for each row execute function public.enforce_family_challenge_rules();

revoke execute on function public.enforce_family_challenge_rules() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- family_challenge_rewards: the money a delivered challenge credited
-- ---------------------------------------------------------------------------
-- One row per kid per challenge. computeBalance adds these to everything
-- earned (balance = chore earnings + challenge credits - payouts). Written
-- only by the server (/api/challenges/[id]/deliver); families read them.
create table if not exists public.family_challenge_rewards (
  id uuid primary key default gen_random_uuid(),
  -- Kept when the challenge is deleted: money a kid was given doesn't vanish.
  challenge_id uuid references public.family_challenges(id) on delete set null,
  child_id uuid not null references public.children(id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  -- The challenge's title and reward at the time, for history.
  note text,
  credited_at timestamptz not null default now(),
  created_by uuid
);

create unique index if not exists idx_family_challenge_rewards_once
  on public.family_challenge_rewards (challenge_id, child_id);
create index if not exists idx_family_challenge_rewards_child
  on public.family_challenge_rewards (child_id);

alter table public.family_challenge_rewards enable row level security;

drop policy if exists "challenge rewards: family select" on public.family_challenge_rewards;
create policy "challenge rewards: family select" on public.family_challenge_rewards for select to authenticated using (
  exists (
    select 1 from public.children c
    where c.id = child_id
      and (c.user_id = auth.uid()
        or exists (select 1 from public.family_members fm where fm.user_id = auth.uid() and fm.family_id = c.user_id))
  )
);
-- No insert/update/delete policies: app sessions can't mint money.
