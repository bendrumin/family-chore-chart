-- Per-family toggle for event-driven APNs ("Emma finished all chores").
-- Separate from the iOS local daily reminder. Default true so existing
-- families keep getting buzzes until they opt out in Settings.

ALTER TABLE family_settings
  ADD COLUMN IF NOT EXISTS activity_push_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN family_settings.activity_push_enabled IS
  'When false, skip APNs activity alerts (all-chores-done / routine-complete). Local daily reminders are unaffected.';

-- Shared co-parents already manage chores; let them flip this too.
DROP POLICY IF EXISTS "Family members can update settings" ON family_settings;
CREATE POLICY "Family members can update settings" ON family_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.user_id = auth.uid() AND fm.family_id = family_settings.user_id
    )
  );
