-- 020: Security hardening from the Supabase linter (2026-09-08).
--
-- Everything here was verified against the codebase first:
--   - create_user_profile is called only by the ARCHIVED legacy frontend;
--     live signup goes through the service-role API route.
--   - verify_child_pin has no callers anywhere (kid login verifies through
--     /api/child-pin/verify with the service role).
--   - get_child_routine_stats / get_todays_completed_routine_ids appear only
--     in the generated types; nothing invokes them.
--   - The testflight_waitlist signup route was removed after the iOS launch;
--     nothing legitimate inserts into it anymore.
--
-- ALTER FUNCTION ... SET search_path pins the resolution path without
-- replacing bodies, so the live definitions stay exactly as they are.

-- 1. Pin search_path on every flagged function (lint 0011).
alter function public.update_updated_at_column() set search_path = public, pg_temp;
alter function public.verify_child_pin(text) set search_path = public, pg_temp;
alter function public.create_user_profile(uuid, text, text) set search_path = public, pg_temp;
alter function public.get_todays_completed_routine_ids(uuid) set search_path = public, pg_temp;
alter function public.get_child_routine_stats(uuid, date, date) set search_path = public, pg_temp;

-- 2. SECURITY DEFINER functions with no live callers lose public execution
--    (lints 0028/0029). create_user_profile was the real hole: an anon caller
--    could write a profiles row for an arbitrary user id. PUBLIC holds the
--    default grant, so it must be revoked too, not just anon/authenticated.
revoke execute on function public.create_user_profile(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.verify_child_pin(text) from public, anon, authenticated;
-- Keep the service role able to call them if a server route ever needs to.
grant execute on function public.create_user_profile(uuid, text, text) to service_role;
grant execute on function public.verify_child_pin(text) to service_role;

-- 3. The open anon INSERT policy on the retired waitlist goes (lint 0024).
--    The table and its rows stay (the account-delete purge still reads it).
drop policy if exists "waitlist_public_submit_only" on public.testflight_waitlist;
revoke insert on table public.testflight_waitlist from anon;
