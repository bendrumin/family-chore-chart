-- Apple subscription mapping + App Store Server Notification log.
--
-- Run once in the Supabase SQL Editor. Idempotent.
--
-- Apple-billed subscriptions had no server-side lifecycle: the iOS app only
-- ever upgrades profiles.subscription_type, and Stripe's webhook cannot see
-- Apple, so a subscriber who cancelled in the App Store kept premium forever.
-- The new endpoint /api/apple/notifications receives Apple's signed
-- notifications and downgrades when the entitlement really ends.
--
-- To know WHICH profile a notification belongs to, the app stamps purchases
-- with appAccountToken (= the profile id) from 2.0.1 on, and records the
-- subscription's originalTransactionId here during entitlement sync — which
-- also heals subscribers who bought before the token existed, the first time
-- they launch 2.0.1.
--
-- Deliberately NOT unique: one Apple ID signed into two ChoreStar accounts,
-- or a family-shared subscription, can legitimately map one transaction to
-- several profiles — and on expiry they should all downgrade.

alter table profiles
  add column if not exists apple_original_transaction_id text;

create index if not exists profiles_apple_original_txn_idx
  on profiles (apple_original_transaction_id)
  where apple_original_transaction_id is not null;

-- Audit log of every notification received (matched or not). Unmatched rows
-- ('action' = 'unmatched') are the reconciliation queue: find the family,
-- set their profiles.apple_original_transaction_id, and the next notification
-- maps on its own.
create table if not exists apple_notifications (
  id uuid primary key default gen_random_uuid(),
  notification_type text not null,
  subtype text,
  environment text,
  product_id text,
  original_transaction_id text,
  app_account_token uuid,
  user_id uuid references profiles(id) on delete set null,
  action text not null,
  created_at timestamptz not null default now()
);

create index if not exists apple_notifications_original_txn_idx
  on apple_notifications (original_transaction_id);

-- Service-role only: RLS on with no policies means the anon and authenticated
-- roles can't touch it; the webhook uses the service-role client.
alter table apple_notifications enable row level security;
