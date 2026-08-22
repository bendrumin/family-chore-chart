# Photo Profile Avatars — Shipped

**Status:** shipped (iOS + web)
**Storage:** private Supabase bucket `child-avatars` + column `children.avatar_photo_path`
**Native:** iOS `PhotosPicker` / camera via `AvatarPickerView`; web via `photo-avatar-upload.tsx`

This doc supersedes the older “planned for v1.1” draft. Upload + signed display are live.

---

## Resolution order

1. **`avatar_photo_path`** — private Storage object path → short-lived signed URL at render time  
2. **`avatar_url`** — DiceBear / preset URL  
3. **`avatar_file`** — emoji (iOS)  
4. Color + initials fallback  

Never persist a signed URL in the database (they expire).

---

## Path convention

`{owner_user_id}/{child_id}/{uuid}.jpg` (all lowercase)

- Folder `[1]` is **`children.user_id`** (family owner), not the signed-in co-parent’s uid.
- Storage RLS (migrations `008` + `013`) allows the owner **or** a `family_members` row for that family to read/write that folder.
- iOS and web both build paths from `child.user_id` / `Child.userId`.

---

## Key files

| Piece | Path |
|---|---|
| Bucket + original owner RLS | `database-migrations/008_child_avatar_photos.sql` |
| Column (not `avatar_file`) | `database-migrations/009_child_avatar_photo_path.sql` |
| Co-parent storage RLS | `database-migrations/013_child_avatar_family_member_storage.sql` |
| iOS picker / upload | `ChoreStar/Views/AvatarPickerView.swift`, `SupabaseManager.uploadChildAvatar` |
| iOS display | `ChoreStar/Views/AvatarView.swift` |
| Web upload | `chorestar-nextjs/components/children/photo-avatar-upload.tsx` |
| Web signed display | `chorestar-nextjs/lib/hooks/useChildAvatar.ts` |
| Kid-mode signing | `chorestar-nextjs/lib/utils/child-avatar.ts` |
| Bucket constant | `chorestar-nextjs/lib/constants/storage.ts` |

---

## Privacy

Photographs of children stay in a **private** bucket. Kid mode mints signed URLs server-side with the service role. Account deletion sweeps `{user_id}/` prefixes via `POST /api/account/delete`.

Widgets intentionally do **not** show photos (no network / signing in the extension).

---

## Remaining polish (optional)

- Mid-session kid signed-URL refresh after 1h TTL  
- Align web emoji tab with iOS `avatar_file` storage  
- Ops orphan sweep if anyone deletes users outside the account-delete API  
