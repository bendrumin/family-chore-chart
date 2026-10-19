/**
 * Downscale a camera photo to a JPEG (longest side `max` px) so uploads stay
 * small. Used for chore proof photos and routine step pictures. Browser only;
 * returns null when the image can't be decoded.
 */
export async function preparePhotoJpeg(file: File, max = 1280, quality = 0.82): Promise<Blob | null> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('decode'))
      el.src = url
    })
    const scale = Math.min(1, max / Math.max(img.width, img.height))
    const w = Math.max(1, Math.round(img.width * scale))
    const h = Math.max(1, Math.round(img.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(img, 0, 0, w, h)
    return await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}
