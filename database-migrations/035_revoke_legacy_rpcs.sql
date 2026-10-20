-- Close two legacy SECURITY DEFINER functions that anonymous callers can reach.
--
-- Run once in the Supabase SQL Editor. Safe: nothing in the web, iOS or
-- Android clients calls either function. Verified 2026-10-19 by grepping every
-- client for the names; the only reference is the generated database.types.ts,
-- which mirrors the database rather than using it.
--
-- WHY THIS MATTERS
--
-- public.verify_child_pin(p_pin text) is SECURITY DEFINER and was executable by
-- the `anon` role through /rest/v1/rpc/verify_child_pin. It takes a PIN and
-- nothing else, then searches EVERY family:
--
--     SELECT c.id, c.name FROM child_pins cp
--     JOIN children c ON c.id = cp.child_id
--     WHERE cp.pin_hash = crypt(p_pin, cp.pin_hash);
--
-- No family scoping and no rate limit, so 10,000 unauthenticated requests
-- (the whole 4-digit space) would return the id and name of every child whose
-- PIN is set. Real kid login never used this: it goes through
-- /api/child-pin/verify, which resolves the family code server-side with the
-- service role.
--
-- public.create_user_profile(uuid, text, text) is SECURITY DEFINER and inserts
-- into profiles with ON CONFLICT (id) DO NOTHING. Anonymous callers could
-- create rows for arbitrary ids and emails, and because of the DO NOTHING a
-- squatted row would silently win over the real one written at signup.
-- Profiles are created by lib/auth/signup-profile.ts with the service role.
--
-- Revoking rather than dropping: reversible in one statement if some forgotten
-- caller turns up, and it removes the exposure immediately either way.

-- FROM PUBLIC, not just anon. Postgres grants EXECUTE to PUBLIC by default, so
-- revoking the named roles alone leaves the function reachable, which is
-- exactly what happened on the first attempt: the ACL still read "=X/postgres"
-- and anonymous calls still executed.
revoke execute on function public.verify_child_pin(text) from public, anon, authenticated;
revoke execute on function public.create_user_profile(uuid, text, text) from public, anon, authenticated;

-- Both also lacked a pinned search_path, which lets a caller's search_path
-- influence resolution inside a SECURITY DEFINER body.
alter function public.verify_child_pin(text) set search_path = public;
alter function public.create_user_profile(uuid, text, text) set search_path = public;

-- Applied to production 2026-10-19. Anonymous calls now return 401 / 42501,
-- and kid login still works (POST /api/child-pin/verify with the demo family
-- returned 200), because that path uses the service role and never the RPC.
--
-- Verify afterwards: this should return no rows.
--   select p.proname, r.rolname
--   from pg_proc p
--   join pg_namespace n on n.oid = p.pronamespace
--   cross join lateral (values ('anon'),('authenticated')) as r(rolname)
--   where n.nspname = 'public'
--     and p.proname in ('verify_child_pin','create_user_profile')
--     and has_function_privilege(r.rolname, p.oid, 'EXECUTE');
