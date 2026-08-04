'use client'

import { useChildAvatar, type ChildAvatarSource } from '@/lib/hooks/useChildAvatar'

/**
 * The *inside* of an avatar circle: photo, preset image, emoji, or initial.
 *
 * Deliberately renders only the content and not the circle, so the existing
 * wrappers — each with its own size, gradient and ring — keep their styling
 * untouched. Three places had open-coded
 * `child.avatar_url ? <img> : initial`, which showed nothing for an uploaded
 * photo and nothing for an emoji avatar either, since the emoji lives in
 * avatar_file and none of them read it.
 *
 * A component rather than a bare hook because both call sites are inside a
 * .map() over children, and hooks cannot be called per iteration.
 */
export function ChildAvatarContent({
  child,
  name,
}: {
  child: ChildAvatarSource
  name: string
}) {
  const { imageUrl, emoji } = useChildAvatar(child)

  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={name}
        className="h-full w-full object-cover"
        // A signed URL expires; if it does mid-session the alt text would show,
        // so fall back to hiding the broken image and letting the coloured
        // circle behind it carry the avatar.
        onError={(e) => {
          e.currentTarget.style.display = 'none'
        }}
      />
    )
  }

  if (emoji) {
    return <span aria-hidden>{emoji}</span>
  }

  return <>{name.charAt(0).toUpperCase()}</>
}
