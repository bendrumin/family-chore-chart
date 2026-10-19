-- 032: Routine upgrades for younger kids and kids with ADHD.
-- Run once in the Supabase SQL Editor. Idempotent. Needs 007 (family_members)
-- for the co-parent policies.
--
--   1. Picture steps (Premium): routine_steps.image_path points at a photo in
--      the private routine-step-photos bucket, shown big in the player so
--      pre-readers can follow along. The emoji/icon stays as the fallback.
--   2. Read-aloud (free): routines.auto_read_aloud makes the player speak each
--      step title as it appears (browser SpeechSynthesis; nothing is stored).
--   3. Whole-routine timer (Premium): routines.target_duration_seconds is an
--      optional "finish by" total. Gentle by design: there is no fail state.
--   4. Live parent view (Premium): routine_progress holds one row per routine
--      a kid is in the middle of, written by the kid API (service role) as the
--      kid moves through steps and deleted on finish or exit.
--
-- Premium is checked by the API routes (uploads go only through
-- /api/routines/step-photo, which checks the plan). The columns themselves are
-- not trigger-guarded: a stray value from a free family is harmless, because
-- the player only honours the finish-by timer for Premium families and photo
-- URLs are only ever signed for objects inside the family's own folder.

-- ---------------------------------------------------------------------------
-- 1. routine_steps.image_path
-- ---------------------------------------------------------------------------
alter table public.routine_steps
  add column if not exists image_path text;

alter table public.routine_steps drop constraint if exists routine_steps_image_path_len;
alter table public.routine_steps add constraint routine_steps_image_path_len
  check (image_path is null or char_length(image_path) <= 300);

comment on column public.routine_steps.image_path is
  'Object path in the private routine-step-photos bucket: {owner_user_id}/{child_id}/{uuid}.jpg. Null = use the icon.';

-- ---------------------------------------------------------------------------
-- 2 + 3. routines: read-aloud and finish-by
-- ---------------------------------------------------------------------------
alter table public.routines
  add column if not exists auto_read_aloud boolean not null default false,
  add column if not exists target_duration_seconds integer;

alter table public.routines drop constraint if exists routines_target_duration_range;
alter table public.routines add constraint routines_target_duration_range
  check (target_duration_seconds is null or target_duration_seconds between 60 and 7200);

comment on column public.routines.auto_read_aloud is
  'Player reads each step title aloud as it appears (SpeechSynthesis, on device).';
comment on column public.routines.target_duration_seconds is
  'Optional finish-by total for the whole routine (Premium). No fail state; finishing early is celebrated.';

-- ---------------------------------------------------------------------------
-- 4. routine_progress: who is mid-routine right now
-- ---------------------------------------------------------------------------
create table if not exists public.routine_progress (
  routine_id uuid primary key references public.routines(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  current_step_index integer not null default 0 check (current_step_index >= 0),
  steps_total integer not null check (steps_total >= 1),
  current_step_title text check (current_step_title is null or char_length(current_step_title) <= 200),
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_routine_progress_child on public.routine_progress (child_id);
create index if not exists idx_routine_progress_updated on public.routine_progress (updated_at);

comment on table public.routine_progress is
  'One row per routine a kid is currently running. Written only by the server (service role) from the routine player; rows older than ~30 minutes are treated as abandoned.';

alter table public.routine_progress enable row level security;

-- Read: the family owner and co-parents, the same shape as the routine
-- policies (001 + 007). No insert/update/delete policies: app sessions never
-- write here, the kid API does with the service role.
drop policy if exists "Users can view routine progress for own children" on public.routine_progress;
create policy "Users can view routine progress for own children" on public.routine_progress
  for select using (
    exists (
      select 1 from public.children c
      where c.id = routine_progress.child_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "Family members can view routine progress" on public.routine_progress;
create policy "Family members can view routine progress" on public.routine_progress
  for select using (
    exists (
      select 1 from public.children c
      join public.family_members fm on fm.family_id = c.user_id
      where c.id = routine_progress.child_id and fm.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Storage: private bucket for step pictures
-- ---------------------------------------------------------------------------
-- Same shape as chore-proofs (016) and child-avatars (008/013): private,
-- signed URLs only, the first folder is the family owner's user id. Parents
-- upload through /api/routines/step-photo with the service role; these
-- policies cover direct access by the owner and co-parents.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'routine-step-photos',
  'routine-step-photos',
  false,
  5242880,                                -- 5 MB; clients downscale first
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public             = false,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "routine step photos: family can read" on storage.objects;
create policy "routine step photos: family can read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'routine-step-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.family_members fm
        where fm.user_id = auth.uid()
          and fm.family_id::text = (storage.foldername(name))[1]
      )
    )
  );

drop policy if exists "routine step photos: family can upload" on storage.objects;
create policy "routine step photos: family can upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'routine-step-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.family_members fm
        where fm.user_id = auth.uid()
          and fm.family_id::text = (storage.foldername(name))[1]
      )
    )
  );

drop policy if exists "routine step photos: family can delete" on storage.objects;
create policy "routine step photos: family can delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'routine-step-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.family_members fm
        where fm.user_id = auth.uid()
          and fm.family_id::text = (storage.foldername(name))[1]
      )
    )
  );
