-- Device push tokens for APNs (iOS remote notifications).
--
-- Run once in the Supabase SQL Editor. Idempotent.
-- Design: ChoreStar-iOS/docs/push-notifications-plan.md (direct APNs, no
-- third-party sender).
--
-- The flagship trigger is "kid finished a routine / all chores → notify the
-- parent". Tokens are written by the signed-in parent app; sends happen
-- server-side (Next.js APNs client over HTTP/2), which reads with the service
-- role. Distinct from push_subscriptions, which holds WEB push endpoints.

create table if not exists device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- APNs device token, hex. Unique: the same device re-registering after a
  -- reinstall or user switch must MOVE the token, not duplicate it.
  token text not null unique,
  platform text not null default 'ios',
  -- 'development' for Xcode/debug installs, 'production' for TestFlight and the
  -- App Store. APNs has separate gateways and a token from one is invalid on
  -- the other — sending to the wrong one returns BadDeviceToken, so the sender
  -- picks the gateway per token from this column.
  environment text not null default 'production',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_device_push_tokens_user on device_push_tokens(user_id);

alter table device_push_tokens enable row level security;

drop policy if exists "push tokens: owner select" on device_push_tokens;
create policy "push tokens: owner select" on device_push_tokens
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "push tokens: owner insert" on device_push_tokens;
create policy "push tokens: owner insert" on device_push_tokens
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "push tokens: owner update" on device_push_tokens;
create policy "push tokens: owner update" on device_push_tokens
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "push tokens: owner delete" on device_push_tokens;
create policy "push tokens: owner delete" on device_push_tokens
  for delete to authenticated using (auth.uid() = user_id);

-- Server-side sending needs these Vercel env vars (names only, values in the
-- dashboard): APNS_TEAM_ID, APNS_KEY_ID, APNS_PRIVATE_KEY (the .p8 contents),
-- and optionally APNS_TOPIC (defaults to com.chorestar.ChoreStar). Until they
-- are set, the sender no-ops and nothing breaks.
