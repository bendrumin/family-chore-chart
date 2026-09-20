-- Google Play Billing mapping + Real-time Developer Notification log.
--
-- Run once in the Supabase SQL Editor. Idempotent. Mirrors 018 (Apple).
--
-- The Android shell buys Premium through Play Billing. /api/google/verify
-- links the purchase token to the signed-in profile right after purchase;
-- /api/google/notifications (Pub/Sub push) then follows the subscription's
-- lifecycle and downgrades when the entitlement really ends.

alter table profiles
  add column if not exists google_purchase_token text;

create index if not exists profiles_google_purchase_token_idx
  on profiles (google_purchase_token)
  where google_purchase_token is not null;

-- Audit log of every notification received (matched or not). 'unmatched'
-- rows are the reconciliation queue, same as apple_notifications.
create table if not exists google_notifications (
  id uuid primary key default gen_random_uuid(),
  notification_type text not null,
  subtype text,
  product_id text,
  purchase_token text,
  user_id uuid references profiles(id) on delete set null,
  action text not null,
  created_at timestamptz not null default now()
);

create index if not exists google_notifications_token_idx
  on google_notifications (purchase_token);

-- Service-role only: RLS on with no policies.
alter table google_notifications enable row level security;
