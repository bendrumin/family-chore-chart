-- 027: What opens the paywall, so the founder hub can show what sells Premium.
-- Run once in the Supabase SQL Editor. Idempotent.
--
-- One row each time a parent sees the paywall, with the trigger: a limit
-- (limit_children, limit_chores, limit_store_items), a gated feature
-- (gate_themes, gate_sharing, gate_export, gate_analytics, shared_chores,
-- routine_templates, weekly_report) or a button (settings_upgrade,
-- home_upgrade). Apps insert their own rows; only the service role reads.

create table if not exists public.paywall_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source text not null check (char_length(source) between 1 and 40),
  platform text not null check (platform in ('ios', 'web', 'android')),
  created_at timestamptz not null default now()
);

create index if not exists paywall_events_created_idx on public.paywall_events (created_at desc);

alter table public.paywall_events enable row level security;

drop policy if exists "Parents record their own paywall views" on public.paywall_events;
create policy "Parents record their own paywall views" on public.paywall_events
  for insert to authenticated
  with check (user_id = auth.uid());
