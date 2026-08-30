-- Parent approval mode and photo proof for chore completions.
--
-- Run once in the Supabase SQL Editor. Idempotent.
--
-- Until now a kid's tick was final: it counted toward the perfect day and the
-- allowance the instant it landed. Families who want a look first get an
-- optional approval step. Off by default (the first-run promise is "kids do
-- it themselves"); when on, kid-path ticks land as 'pending' and count only
-- once a parent approves. A chore can also ask for a photo, which always goes
-- through review because a photo is meant to be looked at.
--
-- Rejected ticks are DELETED by the app rather than kept, so in practice only
-- 'pending' and 'approved' rows exist. The 'rejected' value stays legal for
-- future use.

-- ---------------------------------------------------------------------------
-- chore_completions: review state + optional proof photo
-- ---------------------------------------------------------------------------
alter table chore_completions
  add column if not exists status text not null default 'approved',
  add column if not exists proof_path text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid;

alter table chore_completions drop constraint if exists chore_completions_status_valid;
alter table chore_completions add constraint chore_completions_status_valid
  check (status in ('pending', 'approved', 'rejected'));

-- The "Needs your OK" tray reads pending rows constantly; everything else is
-- approved, so a partial index keeps it tiny.
create index if not exists idx_chore_completions_pending
  on chore_completions (chore_id) where status = 'pending';

comment on column chore_completions.status is
  'pending = waiting for a parent; approved = counts toward earnings and streaks.';
comment on column chore_completions.proof_path is
  'Object path in the private chore-proofs bucket: {owner_user_id}/{child_id}/{completion_id}.jpg';

-- ---------------------------------------------------------------------------
-- family_settings: the approval toggle
-- ---------------------------------------------------------------------------
alter table family_settings
  add column if not exists require_approval boolean not null default false;

comment on column family_settings.require_approval is
  'When true, chores kids check off wait for a parent before they count.';

-- ---------------------------------------------------------------------------
-- chores: per-chore photo requirement
-- ---------------------------------------------------------------------------
alter table chores
  add column if not exists requires_photo boolean not null default false;

comment on column chores.requires_photo is
  'Kids attach a photo when checking this off; the completion waits for review.';

-- ---------------------------------------------------------------------------
-- Storage: private bucket for proof photos
-- ---------------------------------------------------------------------------
-- Same shape as child-avatars (migrations 008/013): private, signed URLs only,
-- path {owner_user_id}/{child_id}/{completion_id}.jpg. Kids upload through the
-- kid API with the service role (no RLS); parents and co-parents read and
-- delete under these policies.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chore-proofs',
  'chore-proofs',
  false,
  5242880,                                -- 5 MB; clients downscale first
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public             = false,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "chore proofs: family can read" on storage.objects;
create policy "chore proofs: family can read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'chore-proofs'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from family_members fm
        where fm.user_id = auth.uid()
          and fm.family_id::text = (storage.foldername(name))[1]
      )
    )
  );

drop policy if exists "chore proofs: family can upload" on storage.objects;
create policy "chore proofs: family can upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'chore-proofs'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from family_members fm
        where fm.user_id = auth.uid()
          and fm.family_id::text = (storage.foldername(name))[1]
      )
    )
  );

drop policy if exists "chore proofs: family can delete" on storage.objects;
create policy "chore proofs: family can delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'chore-proofs'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from family_members fm
        where fm.user_id = auth.uid()
          and fm.family_id::text = (storage.foldername(name))[1]
      )
    )
  );
