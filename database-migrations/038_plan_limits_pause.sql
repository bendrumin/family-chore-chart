-- 038: when a subscription (paid or trial) ends, a family goes back to the
-- free limits: 3 kids, 20 active chores. The extras are PAUSED, never
-- deleted, and come straight back on resubscribe (lib/billing/plan-limits.ts).
-- Families who never subscribed are untouched: grandfathered charts built
-- before the limits existed keep working.

alter table public.children add column if not exists paused_by_plan boolean not null default false;
alter table public.chores add column if not exists paused_by_plan boolean not null default false;

-- A chore the plan paused stays off whatever a client sends (an older iOS
-- build editing it, say). Lifting the pause clears paused_by_plan first.
create or replace function public.keep_plan_paused_chores_off()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.paused_by_plan then
    new.is_active := false;
  end if;
  return new;
end
$$;

drop trigger if exists chores_keep_plan_paused_off on public.chores;
create trigger chores_keep_plan_paused_off
  before insert or update on public.chores
  for each row execute function public.keep_plan_paused_chores_off();

-- The "Premium is ending" email and banner need when a subscription ends
-- and when it was bought, from Apple's own notification.
alter table public.apple_notifications add column if not exists expires_at timestamptz;
alter table public.apple_notifications add column if not exists purchased_at timestamptz;
