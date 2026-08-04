-- Dedicated column for an uploaded photo's Storage object path.
--
-- Run once in the Supabase SQL Editor. Idempotent. Pairs with migration 008.
--
-- WHY NOT REUSE children.avatar_file:
-- The photo-avatars design doc proposed holding the object path in `avatar_file`,
-- on the basis that the column was unused. It is empty in the DATA (0 of 195
-- rows) but it is NOT unused in CODE — the Emoji tab of the iOS avatar picker
-- writes an emoji there, and AddEditChildView renders it directly as
-- `Text(avatarFile)`. Overloading one column with "either an emoji or a storage
-- path" would mean every read site guessing which it holds.
--
-- So the three avatar sources are now three explicit columns, checked in order:
--   avatar_photo_path  -- uploaded photo (private Storage object -> signed URL)
--   avatar_url         -- DiceBear / preset image URL
--   avatar_file        -- a single emoji, rendered as text
--   (else)             -- avatar_color + initials

alter table public.children
  add column if not exists avatar_photo_path text;

comment on column public.children.avatar_photo_path is
  'Object path in the private child-avatars Storage bucket, {user_id}/{child_id}/{uuid}.jpg. '
  'Never a signed URL — those expire. Null when the child has no uploaded photo.';

-- Nothing else changes: RLS on `children` already scopes rows to the owning
-- parent (and shared family members), and the object itself is guarded by the
-- storage policies from migration 008.
