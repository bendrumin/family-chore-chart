import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
  } catch {
    // Sign out errors are non-critical — always redirect to login
  }
  return NextResponse.redirect(new URL('/login', request.url))
}
