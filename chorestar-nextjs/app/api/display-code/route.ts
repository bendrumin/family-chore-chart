import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * The family's fridge-display code — the credential in /display/<code>.
 *
 * GET  returns the existing code, creating one on first ask.
 * POST rotates it, which immediately dead-ends every screen showing the old URL.
 *
 * Longer than the 8-char kid login code (12 hex chars) because this one is
 * meant to sit on a screen in a room other people walk through, and there is no
 * second factor behind it the way a kid PIN backs the login code.
 */

function generateCode(): string {
  return crypto.randomBytes(6).toString('hex')
}

/** Writes a unique code, retrying on the (vanishingly unlikely) collision. */
async function assignCode(userId: string): Promise<string | null> {
  const admin = createServiceRoleClient()
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- display_code is newer than the generated types
    const { error } = await (admin as any)
      .from('profiles')
      .update({ display_code: code })
      .eq('id', userId)
    if (!error) return code
  }
  return null
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- display_code is newer than the generated types
    const { data: profile, error } = await (supabase as any)
      .from('profiles')
      .select('display_code')
      .eq('id', user.id)
      .single()

    if (error) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    let code: string | null = profile?.display_code ?? null
    if (!code) {
      code = await assignCode(user.id)
      if (!code) {
        return NextResponse.json({ error: 'Could not create a display link' }, { status: 500 })
      }
    }

    return NextResponse.json({ code })
  } catch (error) {
    console.error('[display-code] GET failed:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const code = await assignCode(user.id)
    if (!code) {
      return NextResponse.json({ error: 'Could not rotate the display link' }, { status: 500 })
    }
    return NextResponse.json({ code })
  } catch (error) {
    console.error('[display-code] POST failed:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
