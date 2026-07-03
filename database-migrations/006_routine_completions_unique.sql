-- Migration 006: Prevent duplicate routine completions
--
-- Enforces one completion per (routine, child, day). Without this, two
-- concurrent POSTs to /api/routines/[routineId]/complete can both pass the
-- "already completed today?" check before either inserts, producing duplicate
-- rows and awarding points_earned twice for the same routine/day.
--
-- Safe to run multiple times.

-- 1) Remove any existing duplicates, keeping the earliest completion per day.
DELETE FROM routine_completions rc
USING routine_completions dup
WHERE rc.routine_id = dup.routine_id
  AND rc.child_id   = dup.child_id
  AND rc.date       = dup.date
  AND rc.ctid       > dup.ctid;

-- 2) Enforce uniqueness going forward so the DB rejects a concurrent double-insert.
CREATE UNIQUE INDEX IF NOT EXISTS idx_routine_completions_unique_daily
  ON routine_completions (routine_id, child_id, date);
