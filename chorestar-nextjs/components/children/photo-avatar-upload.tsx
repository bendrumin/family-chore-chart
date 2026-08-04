'use client'

import { useRef, useState } from 'react'
import { Camera, Loader2, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CHILD_AVATAR_BUCKET } from '@/lib/constants/storage'
import { useChildAvatar } from '@/lib/hooks/useChildAvatar'
import { toast } from 'sonner'

/**
 * Photo avatar upload for the web edit-child modal.
 *
 * Until now capture was iOS-only: web could DISPLAY an uploaded photo but a
 * laptop-first parent had no way to add one. Same pipeline as iOS — centre-crop
 * to a square, downscale to 512, JPEG — but in a canvas.
 *
 * The parent is an authenticated Supabase user, so the browser uploads straight
 * to Storage under the migration-008 owner policies; no server hop. JS UUIDs
 * are lowercase, so the case trap that bit Swift can't occur here — but the
 * path is still lowercased defensively, because the policy comparison is
 * case-sensitive and "defensively identical" beats "accidentally different".
 *
 * `capture` is deliberately NOT set on the file input: on phones the bare input
 * offers camera or library, and on laptops it's a file picker. Setting
 * capture="user" would force phones straight into the camera.
 */

const AVATAR_PX = 512

interface PhotoAvatarUploadProps {
  child: {
    id: string
    user_id: string
    name: string
    avatar_url?: string | null
    avatar_file?: string | null
    avatar_photo_path?: string | null
  }
  /** Called after the row changed (upload or removal) so the parent refetches. */
  onChanged: () => void
}

/** Centre-crop + downscale to a 512x512 JPEG blob. Mirrors the iOS pipeline. */
async function prepareAvatarJpeg(file: File): Promise<Blob | null> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = reject
      el.src = url
    })

    const side = Math.min(img.naturalWidth, img.naturalHeight)
    const sx = (img.naturalWidth - side) / 2
    const sy = (img.naturalHeight - side) / 2

    const canvas = document.createElement('canvas')
    canvas.width = AVATAR_PX
    canvas.height = AVATAR_PX
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    // drawImage respects EXIF orientation in every current browser, so the
    // sideways-camera-photo problem iOS had to solve by hand doesn't apply.
    ctx.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_PX, AVATAR_PX)

    return await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', 0.82)
    )
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function PhotoAvatarUpload({ child, onChanged }: PhotoAvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<'upload' | 'remove' | null>(null)
  const { imageUrl } = useChildAvatar(child)
  const hasPhoto = Boolean(child.avatar_photo_path)

  const handleFile = async (file: File) => {
    setBusy('upload')
    try {
      const jpeg = await prepareAvatarJpeg(file)
      if (!jpeg) {
        toast.error("That image couldn't be read. Try another one.")
        return
      }

      const supabase = createClient()
      const path = `${child.user_id.toLowerCase()}/${child.id.toLowerCase()}/${crypto.randomUUID()}.jpg`

      const { error: uploadError } = await supabase.storage
        .from(CHILD_AVATAR_BUCKET)
        .upload(path, jpeg, { contentType: 'image/jpeg', upsert: true })
      if (uploadError) throw uploadError

      // Point the row at the new object; clear the preset so the resolution
      // order (photo -> preset -> emoji -> initial) lands on the photo.
      const { error: rowError } = await supabase
        .from('children')
        .update({ avatar_photo_path: path, avatar_url: null })
        .eq('id', child.id)
      if (rowError) throw rowError

      // Old object last: removing it first would leave the child with no
      // avatar at all if the upload failed. Best-effort.
      if (child.avatar_photo_path && child.avatar_photo_path !== path) {
        void supabase.storage.from(CHILD_AVATAR_BUCKET).remove([child.avatar_photo_path])
      }

      toast.success(`📸 New photo for ${child.name}!`)
      onChanged()
    } catch (error) {
      console.error('Photo upload failed:', error)
      toast.error("Couldn't upload that photo. Please try again.")
    } finally {
      setBusy(null)
    }
  }

  const handleRemove = async () => {
    if (!child.avatar_photo_path) return
    setBusy('remove')
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('children')
        .update({ avatar_photo_path: null })
        .eq('id', child.id)
      if (error) throw error
      void supabase.storage.from(CHILD_AVATAR_BUCKET).remove([child.avatar_photo_path])
      toast.success('Photo removed')
      onChanged()
    } catch (error) {
      console.error('Photo removal failed:', error)
      toast.error("Couldn't remove the photo. Please try again.")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex items-center gap-4">
      {/* Current state, so the buttons have context */}
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-purple-200 dark:border-purple-800 bg-gray-100 dark:bg-gray-800 grid place-items-center text-xl font-bold text-gray-500">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={child.name} className="h-full w-full object-cover" />
        ) : (
          child.name.charAt(0).toUpperCase()
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) void handleFile(file)
          }}
        />
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-xl border-2 border-purple-300 dark:border-purple-700 px-4 py-2 text-sm font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors disabled:opacity-50"
        >
          {busy === 'upload' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          {hasPhoto ? 'Change Photo' : 'Upload Photo'}
        </button>

        {hasPhoto && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void handleRemove()}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
          >
            {busy === 'remove' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Remove
          </button>
        )}
      </div>
    </div>
  )
}
