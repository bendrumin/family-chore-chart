import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { getStripe } from '@/lib/stripe'
import { collectRevenue } from '@/lib/admin/revenue'

export const dynamic = 'force-dynamic'

/** What families have paid, across Apple, Stripe and Google Play. */
export async function GET() {
  const { error } = await requireAdminApi()
  if (error) return error

  try {
    const stripe = process.env.STRIPE_SECRET_KEY ? getStripe() : null
    return NextResponse.json(await collectRevenue(createServiceRoleClient(), stripe))
  } catch (err) {
    console.error('Admin revenue error:', err)
    return NextResponse.json({ error: 'Failed to load revenue' }, { status: 500 })
  }
}
