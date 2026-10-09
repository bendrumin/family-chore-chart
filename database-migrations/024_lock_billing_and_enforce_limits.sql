-- 024: Billing fields are the server's, and the free limits hold in the database.
-- Run once in the Supabase SQL Editor. Idempotent.
--
-- Found 2026-10-09 (docs/PREMIUM.md): "Users can update own profile" covers
-- every column, so a signed-in user could PATCH their own profile to
-- subscription_type = 'premium' or 'lifetime' with nothing but their access
-- token. The free caps (3 kids, 20 active chores, 3 active store items) were
-- only ever checked in the apps.
--
-- 1. profiles: subscription_type, apple_original_transaction_id and
--    google_purchase_token can only be changed by the server (service_role:
--    the Stripe, Apple and Google webhooks, /api/google/verify,
--    /api/apple/verify) or from this SQL editor. When an app session tries,
--    the old value is kept and the rest of the update goes through. Quietly,
--    on purpose: iOS builds up to 2.4 write 'premium' right after a purchase
--    and treat an error as "not upgraded", which would show a paying family
--    "Free" until Apple's notification lands; the server sets the real value.
--
-- 2. children / chores / reward_items: an app session can't go past the free
--    caps unless the family owner is premium or lifetime. Counted exactly as
--    both apps count: every child; active chores across the owner's kids;
--    active store items. Server-side inserts (service_role) are not limited:
--    those routes check for themselves. Goals are already enforced server-side
--    (/api/kid/goals with the service role). Families already over a cap keep
--    what they have; they just can't add more, which is what the apps show.

-- ---------------------------------------------------------------------------
-- 1. Billing fields
-- ---------------------------------------------------------------------------

-- The request's role from PostgREST's JWT claims: 'authenticated' or 'anon' for
-- app sessions, 'service_role' for the server, null in the SQL editor. Read
-- from the claims rather than current_user because inside a SECURITY DEFINER
-- function current_user is the function's owner, not the caller.
create or replace function public.request_is_app_session()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::json->>'role', '')
    in ('authenticated', 'anon');
$$;

create or replace function public.protect_profile_billing_fields()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if not public.request_is_app_session() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.subscription_type := 'free';
    new.apple_original_transaction_id := null;
    new.google_purchase_token := null;
  else
    new.subscription_type := old.subscription_type;
    new.apple_original_transaction_id := old.apple_original_transaction_id;
    new.google_purchase_token := old.google_purchase_token;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_billing_fields on public.profiles;
create trigger protect_profile_billing_fields
  before insert or update on public.profiles
  for each row execute function public.protect_profile_billing_fields();

-- ---------------------------------------------------------------------------
-- 2. Free limits
-- ---------------------------------------------------------------------------

create or replace function public.family_is_premium(owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select subscription_type::text in ('premium', 'lifetime') from public.profiles where id = owner_id),
    false
  );
$$;
revoke execute on function public.family_is_premium(uuid) from public, anon, authenticated;

create or replace function public.enforce_free_child_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.request_is_app_session() or public.family_is_premium(new.user_id) then
    return new;
  end if;
  if (select count(*) from public.children where user_id = new.user_id) >= 3 then
    raise exception 'The free plan includes 3 children. Premium removes the limit.'
      using errcode = 'P0001', hint = 'free_limit_children';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_free_child_limit on public.children;
create trigger enforce_free_child_limit
  before insert on public.children
  for each row execute function public.enforce_free_child_limit();

create or replace function public.enforce_free_chore_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  owner_id uuid;
begin
  if not public.request_is_app_session() or not coalesce(new.is_active, true) then
    return new;
  end if;
  -- Only a chore becoming active can cross the cap: a new active chore, or an
  -- archived one being restored. Edits to an already active chore pass.
  if tg_op = 'UPDATE' and coalesce(old.is_active, true) then
    return new;
  end if;

  select user_id into owner_id from public.children where id = new.child_id;
  if owner_id is null or public.family_is_premium(owner_id) then
    return new;
  end if;

  if (
    select count(*)
    from public.chores c
    join public.children k on k.id = c.child_id
    where k.user_id = owner_id and c.is_active and c.id <> new.id
  ) >= 20 then
    raise exception 'The free plan includes 20 chores. Premium removes the limit.'
      using errcode = 'P0001', hint = 'free_limit_chores';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_free_chore_limit on public.chores;
create trigger enforce_free_chore_limit
  before insert or update of is_active on public.chores
  for each row execute function public.enforce_free_chore_limit();

create or replace function public.enforce_free_store_item_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.request_is_app_session() or not coalesce(new.is_active, true) then
    return new;
  end if;
  if tg_op = 'UPDATE' and coalesce(old.is_active, true) then
    return new;
  end if;
  if public.family_is_premium(new.user_id) then
    return new;
  end if;
  if (
    select count(*) from public.reward_items
    where user_id = new.user_id and is_active and id <> new.id
  ) >= 3 then
    raise exception 'The free plan lists 3 rewards. Premium removes the limit.'
      using errcode = 'P0001', hint = 'free_limit_store_items';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_free_store_item_limit on public.reward_items;
create trigger enforce_free_store_item_limit
  before insert or update of is_active on public.reward_items
  for each row execute function public.enforce_free_store_item_limit();

-- Trigger functions run as the table owner via the trigger, not by callers.
revoke execute on function public.protect_profile_billing_fields() from public, anon, authenticated;
revoke execute on function public.enforce_free_child_limit() from public, anon, authenticated;
revoke execute on function public.enforce_free_chore_limit() from public, anon, authenticated;
revoke execute on function public.enforce_free_store_item_limit() from public, anon, authenticated;
