-- 025: Shared chores across kids (Premium): weekly rotation and bonus chores.
-- Run once in the Supabase SQL Editor. Idempotent.
--
-- A shared chore is one chores row per kid, tied by rotation_group_id, so
-- every app that already lists a kid's chores (including iOS and Android builds
-- that predate this) shows the right thing with no client change:
--
--   rotate: one copy is active at a time, the kid whose turn it is this week.
--           /api/cron/rotate-chores moves the turn daily (idempotent; the week
--           number and rotation_start_week decide whose turn it is).
--   grab:   every copy is active; the first kid to tick it for a day earns it,
--           and a second kid's tick for that day is refused here.
--
-- Earnings: computeBalance counts a kid's rotation copies whether or not they
-- are active this week, so money from last week's turn never disappears.

alter table public.chores add column if not exists rotation_group_id uuid;
alter table public.chores add column if not exists rotation_mode text;
alter table public.chores add column if not exists rotation_order int;
alter table public.chores add column if not exists rotation_start_week date;

do $$ begin
  alter table public.chores add constraint chores_rotation_mode_check
    check (rotation_mode is null or rotation_mode in ('rotate', 'grab'));
exception when duplicate_object then null; end $$;

create index if not exists chores_rotation_group_idx on public.chores (rotation_group_id)
  where rotation_group_id is not null;

-- A parent turning a shared copy off from an app (web bulk archive) takes it
-- out of the group, so the daily rotation never switches it back on. The
-- rotation job runs as the service role and is unaffected.
create or replace function public.leave_rotation_when_archived()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if public.request_is_app_session()
     and new.rotation_group_id is not null
     and coalesce(old.is_active, true)
     and not coalesce(new.is_active, true) then
    new.rotation_group_id := null;
    new.rotation_mode := null;
    new.rotation_order := null;
    new.rotation_start_week := null;
  end if;
  return new;
end;
$$;

drop trigger if exists leave_rotation_when_archived on public.chores;
create trigger leave_rotation_when_archived
  before update of is_active on public.chores
  for each row execute function public.leave_rotation_when_archived();

-- Bonus chores: first kid to finish earns it. Applies to every writer (kids
-- tick through the service role), and only to ticks that count.
create or replace function public.enforce_bonus_chore_first_claim()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  grp uuid;
begin
  select rotation_group_id into grp
  from public.chores
  where id = new.chore_id and rotation_mode = 'grab';
  if grp is null or coalesce(new.status, 'approved') = 'rejected' then
    return new;
  end if;
  if exists (
    select 1
    from public.chore_completions cc
    join public.chores c on c.id = cc.chore_id
    where c.rotation_group_id = grp
      and c.id <> new.chore_id
      and cc.week_start = new.week_start
      and cc.day_of_week = new.day_of_week
      and coalesce(cc.status, 'approved') <> 'rejected'
  ) then
    raise exception 'Someone already did this bonus chore today.'
      using errcode = 'P0001', hint = 'bonus_already_claimed';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_bonus_chore_first_claim on public.chore_completions;
create trigger enforce_bonus_chore_first_claim
  before insert on public.chore_completions
  for each row execute function public.enforce_bonus_chore_first_claim();

revoke execute on function public.leave_rotation_when_archived() from public, anon, authenticated;
revoke execute on function public.enforce_bonus_chore_first_claim() from public, anon, authenticated;
