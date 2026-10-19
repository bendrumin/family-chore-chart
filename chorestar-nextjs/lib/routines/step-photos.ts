/**
 * Picture steps (migration 032): pure path rules, safe to import anywhere.
 *
 * A step picture lives in the private routine-step-photos bucket at
 * {owner_user_id}/{child_id}/{uuid}.jpg, the same leading-folder shape as
 * chore proofs, so the storage policies key on the family owner. Steps are
 * deleted and re-inserted on every routine save, so the object name is a
 * fresh uuid rather than the step id.
 */

export const ROUTINE_STEP_PHOTO_BUCKET = 'routine-step-photos'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function stepPhotoObjectPath(ownerId: string, childId: string, photoId: string): string {
  return `${ownerId.toLowerCase()}/${childId.toLowerCase()}/${photoId.toLowerCase()}.jpg`
}

/**
 * True when `path` is a well-formed step picture inside this family's folder
 * (and, when given, this child's). The server checks this before saving a
 * path and again before signing one, so a hand-edited row can never make the
 * service role sign another family's object.
 */
export function isStepPhotoPathFor(path: unknown, ownerId: string, childId?: string): path is string {
  if (typeof path !== 'string' || path.length > 300) return false
  const parts = path.split('/')
  if (parts.length !== 3) return false
  const [owner, child, file] = parts
  if (owner !== ownerId.toLowerCase()) return false
  if (!UUID.test(child)) return false
  if (childId && child !== childId.toLowerCase()) return false
  const m = /^([0-9a-f-]{36})\.jpg$/.exec(file)
  return !!m && UUID.test(m[1])
}

/**
 * Which picture paths a save may keep. New paths must sit in this child's
 * folder; on the free plan only paths already on the routine survive (a family
 * that lapsed keeps its pictures, it just can't add new ones).
 */
export function allowedStepImagePath(
  requested: string | null | undefined,
  opts: { ownerId: string; childId: string; premium: boolean; existing: ReadonlySet<string> }
): string | null {
  if (!requested) return null
  if (!isStepPhotoPathFor(requested, opts.ownerId, opts.childId)) return null
  if (opts.premium || opts.existing.has(requested)) return requested
  return null
}

/** Paths that were on the routine before a save and are not after it. */
export function orphanedStepPhotos(before: Iterable<string | null | undefined>, after: Iterable<string | null | undefined>): string[] {
  const keep = new Set<string>()
  for (const p of after) if (p) keep.add(p)
  const out = new Set<string>()
  for (const p of before) if (p && !keep.has(p)) out.add(p)
  return [...out]
}
