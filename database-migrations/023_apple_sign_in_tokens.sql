-- Sign in with Apple refresh tokens, kept only so account deletion can revoke
-- them (App Review guideline 5.1.1(v)).
--
-- Run once in the Supabase SQL Editor. Idempotent.
--
-- Written by POST /api/auth/ensure-profile after the iOS app's native sign-in
-- exchanges its one-time authorization code, and by /auth/callback when the
-- web OAuth session carries a provider refresh token. Read by
-- /api/account/delete, which revokes before the cascade removes the row.
-- client_id matters: a revoke must name the client the token was issued to
-- (the iOS bundle ID or the web Services ID).

create table if not exists apple_sign_in_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  client_id text not null,
  refresh_token text not null,
  updated_at timestamptz not null default now()
);

-- Service-role only: RLS on with no policies. These tokens never reach a client.
alter table apple_sign_in_tokens enable row level security;
