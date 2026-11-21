-- 040: shared rate limits, and the TestFlight waitlist closed to the public.
--
-- lib/utils/rate-limit.ts counted attempts in each server's memory when no
-- Redis was configured, so on Vercel every instance had its own count and the
-- kid PIN limit (5 per 15 minutes) was really 5 per instance. These counters
-- live in Postgres instead and are shared by every instance. Server-only: RLS
-- is on with no policies, and only the service role can call the function.

create table if not exists public.rate_limits (
  key text primary key,
  count integer not null default 0,
  reset_at timestamptz not null
);

alter table public.rate_limits enable row level security;

create index if not exists rate_limits_reset_at_idx on public.rate_limits (reset_at);

-- Counts one attempt for p_key in a window of p_window_ms and returns the
-- count and when the window ends. An expired window starts over at 1.
create or replace function public.rate_limit_hit(p_key text, p_window_ms integer)
returns table (count integer, reset_at timestamptz)
language sql
set search_path = public
as $$
  insert into public.rate_limits as r (key, count, reset_at)
  values (p_key, 1, now() + make_interval(secs => p_window_ms / 1000.0))
  on conflict (key) do update set
    count = case when r.reset_at <= now() then 1 else r.count + 1 end,
    reset_at = case when r.reset_at <= now() then now() + make_interval(secs => p_window_ms / 1000.0) else r.reset_at end
  returning r.count, r.reset_at;
$$;

revoke all on function public.rate_limit_hit(text, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer) to service_role;

-- The TestFlight signup form was removed after the iOS launch; nothing should
-- be able to add rows any more. The table and its emails stay (account delete
-- still purges from it).
drop policy if exists waitlist_public_submit_only on public.testflight_waitlist;
