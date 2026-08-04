'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CHILD_AVATAR_BUCKET } from '@/lib/constants/storage'

/**
 * Resolves whichever avatar a child actually has, in priority order:
 *
 *   avatar_photo_path -> uploaded photo (private object, signed on demand)
 *   avatar_url        -> DiceBear / preset image URL
 *   avatar_file       -> a single emoji, rendered as text
 *   (neither)         -> caller falls back to colour + initial
 *
 * Three separate places on the web dashboard each open-coded
 * `child.avatar_url ? <img> : initial`, which meant an uploaded photo showed
 * nothing and an emoji avatar ALSO showed nothing — the emoji lives in
 * avatar_file, which none of them looked at.
 *
 * On web the parent is an authenticated Supabase user, so the browser client can
 * sign the URL itself under the migration-008 policies. That is the opposite of
 * kid mode, where the server has to mint it because a kid has no JWT.
 */

/** Signed URLs live ~1h; re-sign a minute early. Module-level so several
 *  components rendering the same child don't each mint their own. */
const signedCache = new Map<string, { url: string; expires: number }>()
const SIGN_TTL_SECONDS = 60 * 60

export interface ChildAvatarSource {
  avatar_url?: string | null
  avatar_file?: string | null
  avatar_photo_path?: string | null
}

export interface ResolvedAvatar {
  /** Use as an <img src> or background-image. Null when there is no image. */
  imageUrl: string | null
  /** A single emoji to render as text. Null unless that's the chosen avatar. */
  emoji: string | null
}

async function signPhotoPath(path: string): Promise<string | null> {
  const cached = signedCache.get(path)
  if (cached && cached.expires > Date.now() + 60_000) return cached.url

  try {
    const supabase = createClient()
    const { data, error } = await supabase.storage
      .from(CHILD_AVATAR_BUCKET)
      .createSignedUrl(path, SIGN_TTL_SECONDS)
    if (error || !data?.signedUrl) return null

    signedCache.set(path, { url: data.signedUrl, expires: Date.now() + SIGN_TTL_SECONDS * 1000 })
    return data.signedUrl
  } catch {
    // An avatar is decoration — never let it throw into a render path.
    return null
  }
}

export function useChildAvatar(child: ChildAvatarSource | null | undefined): ResolvedAvatar {
  const photoPath = child?.avatar_photo_path ?? null
  const presetUrl = child?.avatar_url ?? null
  const emojiFile = child?.avatar_file ?? null

  // Seed from the cache so an already-signed photo renders on first paint
  // instead of flashing the initial.
  const [signed, setSigned] = useState<string | null>(() => {
    if (!photoPath) return null
    const hit = signedCache.get(photoPath)
    return hit && hit.expires > Date.now() + 60_000 ? hit.url : null
  })

  useEffect(() => {
    if (!photoPath) {
      setSigned(null)
      return
    }
    let active = true
    void signPhotoPath(photoPath).then(url => {
      if (active) setSigned(url)
    })
    return () => {
      active = false
    }
  }, [photoPath])

  // A photo that hasn't signed yet falls through to the preset rather than
  // showing nothing, so an avatar never blanks out mid-resolve.
  const imageUrl = signed || presetUrl || null
  return {
    imageUrl,
    emoji: !imageUrl && emojiFile ? emojiFile : null,
  }
}
