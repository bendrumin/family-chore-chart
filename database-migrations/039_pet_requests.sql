-- 039: A kid can ask for a Premium Star Pet, and the parent hears about it.
-- Run once in the Supabase SQL Editor. Idempotent. Needs 034 (Star Pets).
--
-- Before this, a free-plan kid tapping the kitty saw "Ask a grown-up" and
-- nothing reached the grown-up. Now the ask is a row here: the parent gets a
-- push and sees it in Needs Your OK with See Premium / Not now. Of the first
-- 14 Premium families, 8 had adopted a pet and 4 picked a Premium species,
-- so this is the upsell kids already want.
--
-- One pending request per kid (asking for another species replaces it).
-- Not now -> dismissed. The family getting Premium -> granted, so the kid can
-- simply adopt it. Server-write only, like 034: kids aren't Supabase users,
-- and parents act through /api/pets/requests.

create table if not exists public.pet_requests (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  species text not null check (species in ('kitty', 'bunny', 'dino', 'panda', 'owl')),
  status text not null default 'pending' check (status in ('pending', 'dismissed', 'granted')),
  requested_at timestamptz not null default now(),
  resolved_at timestamptz
);

create unique index if not exists pet_requests_one_pending
  on public.pet_requests (child_id) where status = 'pending';
create index if not exists pet_requests_child_idx
  on public.pet_requests (child_id, requested_at desc);

alter table public.pet_requests enable row level security;
-- No policies: only the service role (the API routes) reads or writes.
