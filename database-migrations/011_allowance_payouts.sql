-- Allowance payouts — the running "what do I actually owe this kid" balance.
--
-- Run once in the Supabase SQL Editor. Idempotent.
--
-- Earnings were only ever shown per-week, so a parent who didn't hand over cash
-- on Sunday had no record of it: the next week started from zero and the debt
-- quietly vanished. Balance is now derived rather than stored —
--
--     owed = (everything earned, all weeks) - (everything paid out)
--
-- so it keeps accumulating on its own until someone presses "Paid Out", and it
-- self-corrects if a chore from a past week is ticked late. Storing a mutable
-- running total instead would drift the moment history changed underneath it.

create table if not exists allowance_payouts (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  -- What was handed over, in cents. Recorded at the moment of payout so the
  -- history stays truthful even if reward rules change afterwards.
  amount_cents integer not null check (amount_cents >= 0),
  -- Free text: "cash", "added to savings", "bought the Lego". Optional.
  note text,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_allowance_payouts_child
  on allowance_payouts(child_id, paid_at desc);

alter table allowance_payouts enable row level security;

-- A payout is visible and writable by whoever owns the child. Mirrors the
-- pattern used by chores/chore_completions.
drop policy if exists "payouts: owner select" on allowance_payouts;
create policy "payouts: owner select" on allowance_payouts
  for select to authenticated using (
    exists (select 1 from children c where c.id = child_id and c.user_id = auth.uid())
  );

drop policy if exists "payouts: owner insert" on allowance_payouts;
create policy "payouts: owner insert" on allowance_payouts
  for insert to authenticated with check (
    exists (select 1 from children c where c.id = child_id and c.user_id = auth.uid())
  );

-- Deleting a payout puts the money back on the balance, which is what a parent
-- correcting a mistake expects.
drop policy if exists "payouts: owner delete" on allowance_payouts;
create policy "payouts: owner delete" on allowance_payouts
  for delete to authenticated using (
    exists (select 1 from children c where c.id = child_id and c.user_id = auth.uid())
  );
