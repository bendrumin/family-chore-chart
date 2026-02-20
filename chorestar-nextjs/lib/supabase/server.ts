import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from './database.types'

/**
 * Create Supabase client with service role key (bypasses RLS).
 * Use only in server-side API routes for operations that require
 * no user session (e.g. kid PIN verify, kid token validation).
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_SERVICE_KEY?.trim()
  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY is required for this operation')
  }
  return createSupabaseClient<Database>(url, key, { auth: { persistSession: false } })
}

export async function createClient() {
  const cookieStore = await cookies()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  if (!url || !key) {
    throw new Error("Supabase env vars missing: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY")
  }

  return createServerClient<Database>(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
