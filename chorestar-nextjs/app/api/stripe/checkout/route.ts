import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe, STRIPE_PRICE_IDS } from '@/lib/stripe'
import type { PlanType } from '@/lib/utils/stripe'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { planType } = (await request.json()) as { planType: PlanType }

    if (!planType || !['monthly', 'annual', 'lifetime'].includes(planType)) {
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
      .select('subscription_tier')
      .eq('id', user.id)
      .single()

    if (profile?.subscription_tier === 'premium' || profile?.subscription_tier === 'lifetime') {
      return NextResponse.json(
        { error: 'You already have an active premium subscription' },
        { status: 400 }
      )
    }

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
