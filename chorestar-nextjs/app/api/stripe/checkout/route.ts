import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe, STRIPE_PRICE_IDS } from '@/lib/stripe'
import type { PlanType } from '@/lib/utils/stripe'
import { trialDaysFor } from '@/lib/billing/trial'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { planType } = (await request.json()) as { planType: PlanType }

    if (!planType || !['monthly', 'annual'].includes(planType)) {
      return NextResponse.json({ error: 'Invalid plan type' }, { status: 400 })
    }

    const priceId = STRIPE_PRICE_IDS[planType]
    if (!priceId) {
      return NextResponse.json(
        { error: 'This plan is not configured yet. Please contact support.' },
        { status: 503 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profile?.subscription_type === 'premium' || profile?.subscription_type === 'lifetime') {
      return NextResponse.json(
        { error: 'You already have an active premium subscription' },
        { status: 400 }
      )
    }

    const trialDays = planType === 'annual' ? trialDaysFor(planType, await trialHistory(user.email, profile)) : null

    const origin = new URL(request.url).origin
    const isRecurring = planType === 'monthly' || planType === 'annual'

    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      client_reference_id: user.id,
      mode: isRecurring ? 'subscription' : 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment/cancel`,
      metadata: {
        userId: user.id,
        planType,
      },
      ...(isRecurring ? {
        subscription_data: {
          ...(trialDays ? { trial_period_days: trialDays } : {}),
          metadata: {
            userId: user.id,
            planType,
          },
        },
      } : {
        payment_intent_data: {
          metadata: {
            userId: user.id,
            planType,
          },
        },
      }),
    })

    if (!session.url) {
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
    }

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Everything that says this family has subscribed before, on any store. The
 * Apple and Google columns (migrations 018, 022) aren't in the generated types.
 */
async function trialHistory(email: string | undefined, profile: unknown) {
  const p = (profile ?? {}) as { apple_original_transaction_id?: string | null; google_purchase_token?: string | null }
  let stripeSubscriptions = 0
  if (email) {
    const customers = await stripe.customers.list({ email, limit: 10 })
    for (const c of customers.data) {
      const subs = await stripe.subscriptions.list({ customer: c.id, status: 'all', limit: 1 })
      stripeSubscriptions += subs.data.length
    }
  }
  return {
    stripeSubscriptions,
    appleOriginalTransactionId: p.apple_original_transaction_id ?? null,
    googlePurchaseToken: p.google_purchase_token ?? null,
  }
}
