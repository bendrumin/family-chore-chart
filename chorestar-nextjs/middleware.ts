import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Maintenance mode (MAINTENANCE_MODE=1 + redeploy): everything rewrites to
  // the static /maintenance page and APIs answer 503, BEFORE any Supabase
  // call below — during a database upgrade even the auth refresh would hang.
  // Webhook callers (Apple, Stripe) treat 503 + Retry-After as "try again
  // later", which is exactly right while the database is down.
  if (process.env.MAINTENANCE_MODE === '1') {
    const { pathname } = request.nextUrl
    if (pathname.startsWith('/api/')) {
      return new NextResponse(JSON.stringify({ error: 'maintenance' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '600' },
      })
    }
    if (pathname !== '/maintenance') {
      const url = request.nextUrl.clone()
      url.pathname = '/maintenance'
      return NextResponse.rewrite(url)
    }
    return NextResponse.next()
  }
  // Outside maintenance, the page redirects home rather than 404ing.
  if (request.nextUrl.pathname === '/maintenance') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // In middleware, request cookies are read-only. Only write cookies on the response.
  // This follows the Supabase SSR middleware pattern for Next.js.
  let supabaseResponse = NextResponse.next()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  // If env vars are missing (common in preview misconfiguration), don't crash middleware.
  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect dashboard routes
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect logged-in users away from auth pages
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|js|json|ico|xml|txt)$).*)',
  ],
}
