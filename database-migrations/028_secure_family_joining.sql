-- 028: Family joining goes through the server. Run once in the Supabase SQL
-- Editor. Idempotent.
--
-- Before this, family_members' INSERT policy only checked that the row was for
-- the caller (auth.uid() = user_id), so any signed-in account could make itself
-- a member of ANY family and, through the 40-odd policies that trust
-- family_members, read and write that family's kids, chores, PIN hashes, goals,
-- rewards, routines and photos. family_codes and family_invites were readable
-- by everyone, which handed out every owner's id and every invite's email.
--
-- Now:
--   * Joining by code is public.join_family_with_code(code): it checks the code,
--     that it isn't your own family, and that the family is Premium (sharing is
--     Premium; families already sharing keep their members), and rate-limits
--     wrong codes. Codes are 8 characters from a 31-letter alphabet.
--   * Emailed invites were already accepted on the server (/api/family/accept,
--     service role); nothing changes there.
--   * Apps may no longer insert or update family_members, or read anyone
--     else's family code or any invite. Leaving a family and an owner removing
--     a member (DELETE) still work as before.
--
-- iOS up to 2.5.1 and Android up to the current build join by inserting
-- directly; after this they get "Code not found" until they update. Three
-- families had ever joined by code when this shipped.

-- ---------------------------------------------------------------------------
-- Wrong-code attempts, for rate limiting (service role only)
-- ---------------------------------------------------------------------------

create table if not exists public.family_join_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  attempted_at timestamptz not null default now()
);
create index if not exists family_join_attempts_user_idx
  on public.family_join_attempts (user_id, attempted_at desc);
alter table public.family_join_attempts enable row level security;
-- No policies: only the function below (security definer) reads or writes it.

-- ---------------------------------------------------------------------------
-- Join by code
-- ---------------------------------------------------------------------------

-- Returns the family owner's id on success, NULL when the code doesn't exist
-- (returned rather than raised so the attempt is kept for rate limiting; a
-- raise would roll it back). Other refusals raise with a hint the apps map to
-- a message: not_signed_in, too_many_attempts, own_family, family_not_premium.
create or replace function public.join_family_with_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  owner_id uuid;
begin
  if uid is null then
    raise exception 'not_signed_in: sign in to join a family'
      using errcode = 'P0001', hint = 'not_signed_in';
  end if;

  if (
    select count(*) from public.family_join_attempts
    where user_id = uid and attempted_at > now() - interval '1 hour'
  ) >= 10 then
    raise exception 'too_many_attempts: too many wrong codes, try again in an hour'
      using errcode = 'P0001', hint = 'too_many_attempts';
  end if;

  select fc.user_id into owner_id
  from public.family_codes fc
  where fc.code = lower(btrim(coalesce(p_code, '')))
  limit 1;

  if owner_id is null then
    insert into public.family_join_attempts (user_id) values (uid);
    -- Old attempts are only needed for the hour-long window.
    delete from public.family_join_attempts
    where user_id = uid and attempted_at < now() - interval '1 day';
    return null;
  end if;

  if owner_id = uid then
    raise exception 'own_family: that is your own family code'
      using errcode = 'P0001', hint = 'own_family';
  end if;

  -- Already a member: nothing to do, and a lapsed family keeps its members.
  if exists (select 1 from public.family_members where user_id = uid and family_id = owner_id) then
    return owner_id;
  end if;

  if not public.family_is_premium(owner_id) then
    raise exception 'family_not_premium: family sharing needs Premium'
      using errcode = 'P0001', hint = 'family_not_premium';
  end if;

  insert into public.family_members (user_id, family_id)
  values (uid, owner_id)
  on conflict (user_id, family_id) do nothing;

  return owner_id;
end;
$$;

revoke execute on function public.join_family_with_code(text) from public, anon;
grant execute on function public.join_family_with_code(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Lock the tables
-- ---------------------------------------------------------------------------

-- family_members: no app inserts or updates (an UPDATE could also move a
-- member's row to another family). SELECT and DELETE are unchanged.
drop policy if exists "Users can insert family members" on public.family_members;
drop policy if exists "Users can update family members" on public.family_members;

-- family_codes: an owner sees only their own code. Lookups by code happen
-- inside join_family_with_code.
drop policy if exists "Users can view own family codes or lookup codes" on public.family_codes;
drop policy if exists "Users can view own family codes" on public.family_codes;
create policy "Users can view own family codes" on public.family_codes
  for select using ((select auth.uid()) = user_id);

-- family_invites: invites are looked up and accepted by the server routes
-- (service role); the owner still manages their own.
drop policy if exists "Allow invite lookup for accepting" on public.family_invites;
