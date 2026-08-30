/**
 * Storage bucket names, in a client-safe module.
 *
 * Kept out of lib/utils/child-avatar.ts on purpose: that module imports
 * createServiceRoleClient, so a client component pulling the bucket name from it
 * would drag server-only code into the browser bundle.
 */

/** Private bucket for uploaded child profile photos (migration 008). */
export const CHILD_AVATAR_BUCKET = 'child-avatars'

/** Private bucket for chore proof photos (migration 016). */
export const CHORE_PROOF_BUCKET = 'chore-proofs'
