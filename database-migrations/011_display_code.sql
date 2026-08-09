-- Fridge display codes.
--
-- Run once in the Supabase SQL Editor. Idempotent.
--
-- A read-only, no-login view of today's chores, meant to be left open on a
-- kitchen screen (smart fridge, wall tablet, old iPad). Those devices run
-- ancient browsers that cannot survive the React dashboard, so /display/<code>
-- is served as plain HTML by a route handler with no client JavaScript at all.
--
-- The code is a bearer credential in a URL: anyone holding it can read the
-- family's first names and chore names. That is the same exposure as the chore
-- chart taped to the fridge, which is the thing being replaced. It is kept
-- separate from profiles.kid_login_code so it can be rotated on its own — a
-- screen in a kitchen is far more likely to be photographed than a kid's PIN.

alter table profiles add column if not exists display_code text unique;

-- Partial index: most families will never enable this, so only index the ones
-- that have a code rather than carrying a null for every row.
create index if not exists idx_profiles_display_code
  on profiles(display_code) where display_code is not null;

-- No RLS policy is added on purpose. The display route reads with the service
-- role after looking the code up, exactly like the kid-mode endpoints; the
-- anon key must never be able to enumerate this column.
