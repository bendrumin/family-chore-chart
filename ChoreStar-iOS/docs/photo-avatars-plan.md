# Photo Profile Avatars — Design & Implementation Plan

**Status:** planned for v1.1 (alongside push, after App Store acceptance)
**Decision:** **private Supabase Storage bucket + RLS + signed URLs.** Correct &
private by default — these are photographs of children.
**Native:** iOS upload via SwiftUI `PhotosPicker` (PhotosUI). No third-party SDKs.

---

## What already exists (most of this is done)

- `children.avatar_url` and `children.avatar_file` columns already exist.
- Those already **render as images** everywhere: kid page
  ([kid/[childId]/page.tsx](../../chorestar-nextjs/app/kid/[childId]/page.tsx)),
  child list, iOS avatar views.
- Today `avatar_url` only ever holds **external DiceBear** URLs (generated robot/
  adventurer avatars) or presets — there is **no photo upload** and **no Storage
  bucket** on either platform.

**So the only missing piece is: pick a photo → upload to Storage → resolve it for
display.** Everything downstream already handles an image.

> ⚠️ Open item: confirm how `avatar_file` is currently written (the iOS
> `AvatarPickerView.onSelect` passes `(avatarUrl, avatarFile)`). We repurpose
> `avatar_file` to hold the **private storage object path** for uploaded photos —
> verify that doesn't collide with an existing emoji/preset use before wiring.

---

## Storage design (private)

- **Bucket:** `child-avatars`, **private** (not public).
- **Path convention:** `{user_id}/{child_id}/{uuid}.jpg` — the leading `user_id`
  folder is what the RLS policy keys on.
- **RLS on `storage.objects`** (authenticated users touch only their own folder):

  ```sql
  -- SELECT / INSERT / UPDATE / DELETE, one policy each, same USING/WITH CHECK:
  (bucket_id = 'child-avatars'
   AND (storage.foldername(name))[1] = auth.uid()::text)
  ```

- **Source of truth:** store the object **path** in `children.avatar_file`
  (e.g. `child-avatars/{uid}/{cid}/{uuid}.jpg`). Leave `avatar_url` for the
  preset/DiceBear case. Never persist a signed URL in the DB (they expire).

## Signed URLs (how a private photo gets displayed)

- Generate at render time: `storage.from('child-avatars').createSignedUrl(path, ttl)`.
- **Parent (authenticated) contexts:** the authed Supabase client (web) / Swift SDK
  (`storage.from(bucket).createSignedURL(path:expiresIn:)`) mints the URL directly.
- **Kid-mode (kids are NOT authed Supabase users):** the existing service-role kid
  APIs already return child data — `/api/child-pin/verify`, `/api/routines`,
  `kid/[childId]`. Have those endpoints mint a fresh short-lived signed avatar URL
  server-side and include it in the response. Fits the current kid-mode data flow
  (service role bypasses RLS) — no client secret exposure.
- TTL: short-ish (e.g. 1h) and regenerated per load; optionally use Storage image
  transforms (width/height) to serve a downscaled render.

## Rendering change (both platforms)

Avatar resolution becomes: **`avatar_file` (storage path) → signed URL → image**;
else **`avatar_url` (preset/DiceBear) → image**; else **color + initial** fallback.
- iOS: small async resolver that turns a path into a signed URL (cache it), then
  `AsyncImage`.
- Web: resolve server-side in server components / the kid APIs; pass the URL down.

---

## iOS upload flow (native, no permission prompt)

1. SwiftUI **`PhotosPicker`** → `PhotosPickerItem` → load `Data`.
   (`PhotosPicker` is out-of-process → **no `NSPhotoLibraryUsageDescription`** and no
   photo-access prompt.)
2. Downscale/crop to a **512×512 square JPEG** (~0.8 quality) on-device.
3. `supabase.storage.from("child-avatars").upload(path, data, options: .init(
   contentType: "image/jpeg", upsert: true))` at `{uid}/{cid}/{uuid}.jpg`.
4. On success: set `avatar_file = path`, clear `avatar_url`, refresh.
5. Add a **"Photo"** option to `AvatarPickerView` (new tab beside Robots/Emojis) and
   surface it in `AddEditChildView`.

Web parity (later): a file input / drop zone in the add/edit-child modal → browser
Supabase client upload → same path convention + cleanup.

## Cleanup (no orphans, honor deletion)

- On photo **replace**: delete the previous `avatar_file` object.
- On **child delete** / **account delete**: delete that child's/user's avatar objects.

---

## Privacy & compliance checklist (the "keep it correct" part)

- [ ] Bucket **private**, RLS scoped to the owner's folder.
- [ ] Photos uploaded by the **parent** (account holder) of **their own** children —
      the parental-consent model. No child ever uploads under their own identity.
- [ ] **Privacy policy** ([/privacy](../../chorestar-nextjs/app/privacy/page.tsx)):
      add a clause — optional profile photos are stored privately, never shared or
      sold, and are deletable by the parent at any time.
- [ ] Photos are **deletable** (remove object + null the column) and purged on child/
      account deletion.
- [ ] Kid-mode reads use a **short-lived service-role-minted signed URL** — no public
      object, no long-lived link.

## DB / migration

Columns already exist (`avatar_url`, `avatar_file`) — **no schema migration needed**.
Only the Storage bucket + RLS policies are new (SQL, run once).

## Rough effort

| Work | Est. |
|---|---|
| Bucket + RLS policies (SQL) | ~1h |
| iOS `PhotosPicker` upload + downscale + save + cleanup | ~½ day |
| Signed-URL rendering resolver (iOS + kid APIs) | ~½ day |
| Privacy-policy clause | ~15 min |
| Web upload parity | later, ~½ day |
