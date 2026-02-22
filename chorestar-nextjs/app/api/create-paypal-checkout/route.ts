import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // PayPal integration is not yet configured.
    // When ready, this route should:
    // 1. Validate the plan type from the request body
    // 2. Create a PayPal order via the PayPal REST API using server-side credentials
    // 3. Return the order ID and approval URL to the client
    // 4. NEVER trust client-sent price data — always use server-side plan prices
    return NextResponse.json(
      { error: 'Payment processing is not yet available. Please check back soon!' },
      { status: 503 }
    )
  } catch (error) {
    console.error('PayPal checkout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
