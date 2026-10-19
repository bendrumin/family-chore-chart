'use client'

import { preparePhotoJpeg } from '@/lib/utils/prepare-photo'
import type { RoutineDraft } from '@/lib/ai/build-routine'

/**
 * Browser calls for the routine upgrades (migration 032). Plain fetch, same
 * auth as the rest of the app: the parent's session cookie, or the kid token
 * in kid mode.
 */

export type UploadResult = { ok: true; path: string; url: string | null } | { ok: false; premiumRequired?: boolean; error: string }

/** Downscale and upload a step picture for this child (Premium). */
export async function uploadStepPhoto(file: File, childId: string): Promise<UploadResult> {
  const jpeg = await preparePhotoJpeg(file, 1280)
  if (!jpeg) return { ok: false, error: "Couldn't read that photo. Try a JPEG or PNG." }
  const form = new FormData()
  form.append('file', jpeg, 'step.jpg')
  form.append('childId', childId)
  try {
    const res = await fetch('/api/routines/step-photo', { method: 'POST', body: form })
    const data = await res.json().catch(() => ({}))
    if (res.status === 403 && data?.error === 'premium_required') return { ok: false, premiumRequired: true, error: 'Premium required' }
    if (!res.ok || !data?.path) return { ok: false, error: data?.error || 'Could not upload the photo' }
    return { ok: true, path: data.path, url: data.url ?? null }
  } catch {
    return { ok: false, error: 'Could not upload the photo' }
  }
}

export type BuildResult =
  | { ok: true; draft: RoutineDraft; source: 'ai' | 'templates' }
  | { ok: false; premiumRequired?: boolean; error: string }

/** "Build with AI": a draft routine for the builder (Premium). */
export async function requestRoutineDraft(body: {
  goal: string
  childId?: string
  routineType?: RoutineDraft['type'] | null
}): Promise<BuildResult> {
  try {
    const res = await fetch('/api/ai/build-routine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (res.status === 403 && data?.error === 'premium_required') return { ok: false, premiumRequired: true, error: 'Premium required' }
    if (!res.ok || !data?.draft) return { ok: false, error: data?.error || 'Could not build a routine right now' }
    return { ok: true, draft: data.draft as RoutineDraft, source: data.source === 'ai' ? 'ai' : 'templates' }
  } catch {
    return { ok: false, error: 'Could not build a routine right now' }
  }
}

export type ProgressReport =
  | { stepIndex: number; stepsTotal: number; stepTitle?: string | null }
  | { clear: true }

/**
 * Tell the server which step the kid is on (live parent view). Fire and
 * forget: never awaited by the player, never surfaces an error. `keepalive`
 * lets the exit report land while the page navigates away.
 */
export function sendRoutineProgress(routineId: string, childId: string, report: ProgressReport, kidToken?: string | null): void {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (kidToken) headers.Authorization = `Bearer ${kidToken}`
    void fetch(`/api/routines/${routineId}/progress`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ childId, ...report }),
      credentials: 'include',
      keepalive: true,
    }).catch(() => {})
  } catch {
    // live view is a nicety
  }
}
