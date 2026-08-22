-- Let shared family members upload/read/replace/delete child photos in the
-- FAMILY OWNER's storage folder ({owner_user_id}/{child_id}/...).
--
-- Migration 008 keyed every policy on auth.uid() == folder[1]. That works for
-- the owner, but co-parents either failed RLS (web uses children.user_id as the
-- folder) or wrote into their own folder (older iOS) where the owner could not
-- mint a signed URL. Align both platforms on the owner's folder + these policies.

-- Helper predicate reused below: caller owns the folder OR is a family_members
-- row for that family_id (= folder name / children.user_id).

drop policy if exists "child avatars: owner can read" on storage.objects;
create policy "child avatars: owner can read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'child-avatars'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from family_members fm
        where fm.user_id = auth.uid()
          and fm.family_id::text = (storage.foldername(name))[1]
      )
    )
  );

drop policy if exists "child avatars: owner can upload" on storage.objects;
create policy "child avatars: owner can upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'child-avatars'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from family_members fm
        where fm.user_id = auth.uid()
          and fm.family_id::text = (storage.foldername(name))[1]
      )
    )
  );

drop policy if exists "child avatars: owner can replace" on storage.objects;
create policy "child avatars: owner can replace"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'child-avatars'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from family_members fm
        where fm.user_id = auth.uid()
          and fm.family_id::text = (storage.foldername(name))[1]
      )
    )
  )
  with check (
    bucket_id = 'child-avatars'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from family_members fm
        where fm.user_id = auth.uid()
          and fm.family_id::text = (storage.foldername(name))[1]
      )
    )
  );

drop policy if exists "child avatars: owner can delete" on storage.objects;
create policy "child avatars: owner can delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'child-avatars'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from family_members fm
        where fm.user_id = auth.uid()
          and fm.family_id::text = (storage.foldername(name))[1]
      )
    )
  );
