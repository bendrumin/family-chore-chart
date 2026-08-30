-- Goals and the Reward Store: somewhere for the cents to go.
--
-- Run once in the Supabase SQL Editor. Idempotent.
--
-- Kids earned money that went nowhere they could see. A GOAL is a thing a kid
-- is saving for; progress is the unspent balance (everything earned minus
-- everything paid out, see allowance_payouts) measured against the target.
-- Reaching a goal moves no money: the parent still presses "Pay out toward
-- goal", which records a payout tagged with the goal and marks it reached.
--
-- The REWARD STORE is the family's menu of things money cannot buy (screen
-- time, pick dinner, stay up late), priced in cents. A kid requests one; a
-- parent approves, which records a payout tagged with the item and drops the
-- balance. Balance is checked at approval time, not request time.

-- ---------------------------------------------------------------------------
-- goals
-- ---------------------------------------------------------------------------
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 60),
  emoji text,
  target_cents integer not null check (target_cents > 0),
  status text not null default 'active' check (status in ('active', 'reached', 'archived')),
  -- Set when the parent pays out toward the goal.
  reached_at timestamptz,
  -- Set once the "reached your goal" alert has gone to the parent, so it fires once.
  notified_at timestamptz,
  created_by text not null default 'kid' check (created_by in ('kid', 'parent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_goals_child_active on goals (child_id) where status = 'active';

alter table goals enable row level security;

-- Family predicate: the child's owner, or a shared member of that family.
drop policy if exists "goals: family select" on goals;
create policy "goals: family select" on goals for select to authenticated using (
  exists (
    select 1 from children c
    where c.id = child_id
      and (c.user_id = auth.uid()
        or exists (select 1 from family_members fm where fm.user_id = auth.uid() and fm.family_id = c.user_id))
  )
);
drop policy if exists "goals: family insert" on goals;
create policy "goals: family insert" on goals for insert to authenticated with check (
  exists (
    select 1 from children c
    where c.id = child_id
      and (c.user_id = auth.uid()
        or exists (select 1 from family_members fm where fm.user_id = auth.uid() and fm.family_id = c.user_id))
  )
);
drop policy if exists "goals: family update" on goals;
create policy "goals: family update" on goals for update to authenticated using (
  exists (
    select 1 from children c
    where c.id = child_id
      and (c.user_id = auth.uid()
        or exists (select 1 from family_members fm where fm.user_id = auth.uid() and fm.family_id = c.user_id))
  )
);
drop policy if exists "goals: family delete" on goals;
create policy "goals: family delete" on goals for delete to authenticated using (
  exists (
    select 1 from children c
    where c.id = child_id
      and (c.user_id = auth.uid()
        or exists (select 1 from family_members fm where fm.user_id = auth.uid() and fm.family_id = c.user_id))
  )
);

-- ---------------------------------------------------------------------------
-- reward_items (the family's store)
-- ---------------------------------------------------------------------------
create table if not exists reward_items (
  id uuid primary key default gen_random_uuid(),
  -- The family owner's user id (same key family_settings uses).
  user_id uuid not null,
  title text not null check (char_length(title) between 1 and 60),
  emoji text,
  price_cents integer not null check (price_cents > 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_reward_items_family on reward_items (user_id) where is_active;

alter table reward_items enable row level security;

drop policy if exists "reward items: family select" on reward_items;
create policy "reward items: family select" on reward_items for select to authenticated using (
  user_id = auth.uid()
  or exists (select 1 from family_members fm where fm.user_id = auth.uid() and fm.family_id = reward_items.user_id)
);
drop policy if exists "reward items: family insert" on reward_items;
create policy "reward items: family insert" on reward_items for insert to authenticated with check (
  user_id = auth.uid()
  or exists (select 1 from family_members fm where fm.user_id = auth.uid() and fm.family_id = reward_items.user_id)
);
drop policy if exists "reward items: family update" on reward_items;
create policy "reward items: family update" on reward_items for update to authenticated using (
  user_id = auth.uid()
  or exists (select 1 from family_members fm where fm.user_id = auth.uid() and fm.family_id = reward_items.user_id)
);
drop policy if exists "reward items: family delete" on reward_items;
create policy "reward items: family delete" on reward_items for delete to authenticated using (
  user_id = auth.uid()
  or exists (select 1 from family_members fm where fm.user_id = auth.uid() and fm.family_id = reward_items.user_id)
);

-- ---------------------------------------------------------------------------
-- allowance_payouts: what a payout was FOR
-- ---------------------------------------------------------------------------
alter table allowance_payouts
  add column if not exists goal_id uuid references goals(id) on delete set null,
  add column if not exists reward_item_id uuid references reward_items(id) on delete set null;

-- ---------------------------------------------------------------------------
-- reward_redemptions (a kid asked for a store item)
-- ---------------------------------------------------------------------------
create table if not exists reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  reward_item_id uuid not null references reward_items(id) on delete cascade,
  -- Price captured at request time so the history stays truthful if the
  -- parent later reprices the item.
  price_cents integer not null check (price_cents > 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  payout_id uuid references allowance_payouts(id) on delete set null
);

create index if not exists idx_reward_redemptions_pending on reward_redemptions (child_id) where status = 'pending';

alter table reward_redemptions enable row level security;

-- Kids request through the kid API (service role). Parents read, review, delete.
drop policy if exists "redemptions: family select" on reward_redemptions;
create policy "redemptions: family select" on reward_redemptions for select to authenticated using (
  exists (
    select 1 from children c
    where c.id = child_id
      and (c.user_id = auth.uid()
        or exists (select 1 from family_members fm where fm.user_id = auth.uid() and fm.family_id = c.user_id))
  )
);
drop policy if exists "redemptions: family update" on reward_redemptions;
create policy "redemptions: family update" on reward_redemptions for update to authenticated using (
  exists (
    select 1 from children c
    where c.id = child_id
      and (c.user_id = auth.uid()
        or exists (select 1 from family_members fm where fm.user_id = auth.uid() and fm.family_id = c.user_id))
  )
);
drop policy if exists "redemptions: family delete" on reward_redemptions;
create policy "redemptions: family delete" on reward_redemptions for delete to authenticated using (
  exists (
    select 1 from children c
    where c.id = child_id
      and (c.user_id = auth.uid()
        or exists (select 1 from family_members fm where fm.user_id = auth.uid() and fm.family_id = c.user_id))
  )
);
