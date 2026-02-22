import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type Stripe from 'stripe'

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(invoice)
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

async function updateSubscriptionTier(userId: string, tier: 'free' | 'premium' | 'lifetime') {
  const supabase = createServiceRoleClient()
  const { error } = await (supabase as any)
    .from('profiles')
    .update({ subscription_tier: tier })
    .eq('id', userId)

  if (error) {
    console.error(`Failed to update subscription tier to ${tier}:`, error)
    throw error
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId || session.client_reference_id
  const planType = session.metadata?.planType

  if (!userId) {
    console.error('No userId in checkout session metadata')
    return
  }

  if (planType === 'lifetime') {
    await updateSubscriptionTier(userId, 'lifetime')
  } else if (session.mode === 'subscription') {
    await updateSubscriptionTier(userId, 'premium')
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId
  if (!userId) return

  if (subscription.status === 'active') {
    await updateSubscriptionTier(userId, 'premium')
  } else if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
    console.warn(`Subscription ${subscription.id} is ${subscription.status} for user ${userId}`)
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId
  if (!userId) return

  const supabase = createServiceRoleClient()
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('subscription_tier')
    .eq('id', userId)
    .single()

  if (profile?.subscription_tier === 'lifetime') return

  await updateSubscriptionTier(userId, 'free')
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = (invoice as any).subscription as string | null
  if (!subscriptionId) return

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    const userId = subscription.metadata?.userId

    if (userId) {
      console.warn(`Payment failed for user ${userId}, subscription ${subscriptionId}`)
    }
  } catch (err) {
    console.error('Failed to retrieve subscription for failed payment:', err)
  }
}
