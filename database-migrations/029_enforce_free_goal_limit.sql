-- 029: The free goal cap holds in the database too.
-- Run once in the Supabase SQL Editor. Idempotent. Needs 024
-- (request_is_app_session, family_is_premium) and 017 (goals).
--
-- Free plan: one active goal per child (FREE_GOAL_LIMIT in
-- chorestar-nextjs/lib/constants/rewards.ts; docs/PREMIUM.md). Kids set goals
-- through /api/kid/goals with the service role, which checks the cap itself,
-- but parents write goals straight from the apps (web Settings > Rewards,
-- iOS) under RLS, so an app session could go past it. Like 024's
-- enforce_free_* triggers: app sessions only, premium/lifetime owners pass,
-- and families already over the cap keep what they have; they just can't add
-- another active goal (or restore an archived one) until one is reached or
-- archived. The web surfaces the error by its hint, free_limit_goals.

create or replace function public.enforce_free_goal_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  owner_id uuid;
begin
  if not public.request_is_app_session() or coalesce(new.status, 'active') <> 'active' then
    return new;
  end if;
  -- Only a goal becoming active can cross the cap: a new active goal, or an
  -- archived/reached one switched back. Edits to an active goal pass.
  if tg_op = 'UPDATE' and coalesce(old.status, 'active') = 'active' then
    return new;
  end if;

  select user_id into owner_id from public.children where id = new.child_id;
  if owner_id is null or public.family_is_premium(owner_id) then
    return new;
  end if;

  if (
    select count(*) from public.goals
    where child_id = new.child_id and status = 'active' and id <> new.id
  ) >= 1 then
    raise exception 'The free plan includes 1 active goal per child. Premium removes the limit.'
      using errcode = 'P0001', hint = 'free_limit_goals';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_free_goal_limit on public.goals;
create trigger enforce_free_goal_limit
  before insert or update of status on public.goals
  for each row execute function public.enforce_free_goal_limit();

revoke execute on function public.enforce_free_goal_limit() from public, anon, authenticated;
