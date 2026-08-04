-- Private Storage bucket for child profile photos.
--
-- Run once in the Supabase SQL Editor. Idempotent.
--
-- These are photographs of children, so the bucket is PRIVATE and every read
-- goes through a short-lived signed URL. Note a PUBLIC bucket named `avatars`
-- already exists in this project and is referenced by nothing in either
-- codebase — it is not used for this, and a public bucket would let anyone
-- holding a URL fetch a child's photo indefinitely.
--
-- Design: ChoreStar-iOS/docs/photo-avatars-plan.md

-- ---------------------------------------------------------------------------
-- Bucket
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'child-avatars',
  'child-avatars',
  false,                                  -- private; reads require a signed URL
  2097152,                                -- 2 MB ceiling; uploads are downscaled to 512x512 JPEG
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public             = false,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- RLS — a parent may touch only their own folder
-- ---------------------------------------------------------------------------
-- Path convention: {user_id}/{child_id}/{uuid}.jpg
-- The leading folder is the owner's auth uid, which is what these policies key
-- on. storage.foldername(name) splits the object path into segments.
--
-- Kid mode is intentionally NOT granted access here: kids are not authenticated
-- Supabase users, so their avatar URLs are minted server-side with the service
-- role (which bypasses RLS) by the existing kid endpoints.

drop policy if exists "child avatars: owner can read" on storage.objects;
create policy "child avatars: owner can read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'child-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "child avatars: owner can upload" on storage.objects;
create policy "child avatars: owner can upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'child-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "child avatars: owner can replace" on storage.objects;
create policy "child avatars: owner can replace"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'child-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'child-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "child avatars: owner can delete" on storage.objects;
create policy "child avatars: owner can delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'child-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- No schema migration needed
-- ---------------------------------------------------------------------------
-- children.avatar_url and children.avatar_file already exist and already render
-- as images on both platforms. `avatar_file` is currently set on 0 of 195 rows,
-- so it is free to hold the storage object path. `avatar_url` keeps its existing
-- job of holding a DiceBear/preset URL (156 rows).
--
-- Resolution order becomes:
--   avatar_file (storage path -> signed URL)  ->  avatar_url (preset)  ->  color + initial
--
-- A signed URL is never persisted to the database: they expire.
