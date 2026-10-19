-- 034: Star Pets (Premium, with a free teaser): every kid can adopt a pet
-- that grows from what they already do.
-- Run once in the Supabase SQL Editor. Idempotent. Needs 007 (family_members)
-- for the co-parent policies. Does not touch 030 (money) or 031 (challenges).
--
-- Only the CHOICES are stored. Growth is never stored: XP, level, stage, the
-- rare star form and the pet's mood are DERIVED on every read from rows that
-- already exist (approved chore_completions, routine_completions, delivered
-- family_challenges, the perfect-day streak) by the pure functions in
-- chorestar-nextjs/lib/pets/, counting only from the day the pet was adopted.
-- A sent-back tick or a deleted completion moves the pet by itself, and no
-- action is ever counted twice.
--
--   child_pets           one row per kid: species, name, what is equipped, and
--                        the parent's per-kid on/off switch.
--   child_pet_cosmetics  monthly drop items a kid collected (level unlocks are
--                        derived from the level, so they are not stored).
--
-- WRITES: server only (service role). Kids act through /api/kid/pet with their
-- kid session token; parents switch pets on/off through /api/pets, which
-- checks family membership. Premium (all species, stages past "kid",
-- cosmetics, monthly drops) is enforced in those routes. App sessions can
-- read their own family's rows (owner or co-parent, like 017 and 031) and
-- write nothing.

-- ---------------------------------------------------------------------------
-- child_pets
-- ---------------------------------------------------------------------------
create table if not exists public.child_pets (
  child_id uuid primary key references public.children(id) on delete cascade,
  -- Null until the kid adopts. A row with species null exists only to carry
  -- the parent's "pets off" switch for a kid who never adopted.
  species text check (species is null or species in ('pup', 'kitty', 'bunny', 'dino', 'panda', 'owl')),
  name text check (name is null or char_length(btrim(name)) between 1 and 20),
  -- Family-local date (family_settings.timezone) the pet was adopted. XP
  -- counts from this day, so a long-time user starts with a baby too.
  adopted_on date,
  -- Equipped cosmetics (ids from lib/pets/catalog.ts). Null = nothing.
  hat text check (hat is null or char_length(hat) <= 40),
  accessory text check (accessory is null or char_length(accessory) <= 40),
  habitat text check (habitat is null or char_length(habitat) <= 40),
  -- Parent switch, per kid. Off hides the pet everywhere; nothing is deleted.
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint child_pets_adopted_has_name check (species is null or (name is not null and adopted_on is not null))
);

-- ---------------------------------------------------------------------------
-- child_pet_cosmetics: collected monthly drops
-- ---------------------------------------------------------------------------
create table if not exists public.child_pet_cosmetics (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  item_id text not null check (char_length(item_id) between 1 and 40),
  -- 'drop' today; room for other sources later (e.g. a gift from a parent).
  source text not null default 'drop' check (source in ('drop')),
  -- The drop's month, YYYY-MM, family-local.
  drop_month text check (drop_month is null or drop_month ~ '^\d{4}-\d{2}$'),
  collected_at timestamptz not null default now()
);

create unique index if not exists idx_child_pet_cosmetics_once
  on public.child_pet_cosmetics (child_id, item_id);

-- ---------------------------------------------------------------------------
-- RLS: the family reads; only the server writes
-- ---------------------------------------------------------------------------
alter table public.child_pets enable row level security;
alter table public.child_pet_cosmetics enable row level security;

drop policy if exists "pets: family select" on public.child_pets;
create policy "pets: family select" on public.child_pets for select to authenticated using (
  exists (
    select 1 from public.children c
    where c.id = child_id
      and (c.user_id = auth.uid()
        or exists (select 1 from public.family_members fm where fm.user_id = auth.uid() and fm.family_id = c.user_id))
  )
);

drop policy if exists "pet cosmetics: family select" on public.child_pet_cosmetics;
create policy "pet cosmetics: family select" on public.child_pet_cosmetics for select to authenticated using (
  exists (
    select 1 from public.children c
    where c.id = child_id
      and (c.user_id = auth.uid()
        or exists (select 1 from public.family_members fm where fm.user_id = auth.uid() and fm.family_id = c.user_id))
  )
);

-- No insert / update / delete policies on purpose: with RLS on, app sessions
-- can't write these tables at all. The service role bypasses RLS.
revoke insert, update, delete on public.child_pets from anon, authenticated;
revoke insert, update, delete on public.child_pet_cosmetics from anon, authenticated;

comment on table public.child_pets is
  'Star Pets (034): a kid''s pet choice, name, equipped cosmetics and the parent on/off switch. XP, level, stage and mood are derived (lib/pets), never stored. Server-write only.';
comment on table public.child_pet_cosmetics is
  'Star Pets (034): monthly drop cosmetics a kid collected. Level unlocks are derived. Server-write only.';
