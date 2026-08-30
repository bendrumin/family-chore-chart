import { createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { validateKidToken } from '@/lib/utils/kid-auth'
import { signChildAvatarForChild } from '@/lib/utils/child-avatar'

/**
 * GET /api/kid/child — the signed-in kid's own profile, with a fresh avatar URL.
 *
 * Exists because the kid dashboard loads its child from localStorage, captured at
 * PIN verify. That is fine for a name and a colour, but not for an uploaded
 * photo: the bucket is private, so the image is reachable only through a signed
 * URL, and a URL stored in localStorage goes stale while the 8-hour session is
 * still valid. The dashboard calls this on mount to re-mint one.
 *
 * Reading the child from the routines response was the alternative and is wrong:
 * routines embed their child, so a kid with no routines yet would get no child
 * data at all.
 *
 * Authorized by the kid session token, never by a childId in the query — the
 * token itself says which child this is, so one kid cannot fetch another's
 * profile by editing a URL.
 */
export async function GET(request: Request) {
  const session = await validateKidToken(request)
  if (!session) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  try {
    // Service role: kids are not authenticated Supabase users, so RLS on
    // `children` cannot see them either.
    const admin = createServiceRoleClient()
    const { data: child, error } = await admin
      .from('children')
      .select('id, name, avatar_color, avatar_url, avatar_file, user_id')
      .eq('id', session.childId)
      .maybeSingle()

    if (error || !child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 })
    }

    // Fetched separately and tolerantly — see signChildAvatarForChild. Keeps this
    // endpoint working whether or not migration 009 has been applied.
    const avatar_signed_url = await signChildAvatarForChild(session.childId)

    // The family's theme, so kid mode on the kid's own device wears the same
    // colors the parent picked. Kids are not Supabase users, so they cannot
    // read family_settings themselves; the theme rides along here. Best-effort:
    // a settings read failure leaves the kid on the default palette.
    let theme: unknown = null
    try {
      const { data: settings } = await admin
        .from('family_settings')
        .select('custom_theme')
        .eq('user_id', child.user_id)
        .maybeSingle()
      theme = settings?.custom_theme ?? null
    } catch {
      theme = null
    }

    const { user_id: _familyId, ...publicChild } = child
    void _familyId

    return NextResponse.json(
      { child: { ...publicChild, avatar_signed_url }, theme },
      // A signed URL is per-request and short-lived; caching this response would
      // hand out a URL that expires before the cache does.
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('[kid/child] Unexpected error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
