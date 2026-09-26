import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type Stripe from 'stripe'
import { tierForCheckout } from '@/lib/utils/subscription'

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
    console.error(`Webhook handler error for event ${event.type} (${event.id}):`, error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

async function updateSubscriptionTier(userId: string, tier: 'free' | 'premium' | 'lifetime') {
  const supabase = createServiceRoleClient()
  const { error } = await (supabase as any)
    .from('profiles')
    .update({ subscription_type: tier })
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

  const tier = tierForCheckout(session.mode, planType)
  if (!tier) {
    console.error(`Checkout ${session.id} granted nothing: mode=${session.mode} planType=${planType}`)
    return
  }
  await updateSubscriptionTier(userId, tier)
}

/**
 * Which profile a subscription belongs to.
 *
 * metadata.userId is set at checkout and is the normal answer, but
 * subscriptions created before that block existed carry nothing, and a
 * handler that gives up silently on those is how one family stayed premium
 * for eleven months after cancelling. Falling back to the customer's email
 * covers the old rows, and anything still unresolved is logged loudly rather
 * than dropped.
 */
async function userIdForSubscription(subscription: Stripe.Subscription): Promise<string | null> {
  const fromMetadata = subscription.metadata?.userId
  if (fromMetadata) return fromMetadata

  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id
  if (!customerId) return null

  try {
    const customer = await stripe.customers.retrieve(customerId)
    const email = !customer.deleted ? customer.email : null
    if (!email) return null
    const supabase = createServiceRoleClient()
    const { data } = await (supabase as any)
      .from('profiles')
      .select('id')
      .ilike('email', email)
      .maybeSingle()
    return data?.id ?? null
  } catch (error) {
    console.error(`Could not resolve a user for subscription ${subscription.id}:`, error)
    return null
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = await userIdForSubscription(subscription)
  if (!userId) {
    console.error(`subscription.updated ${subscription.id}: no user found, tier unchanged`)
    return
  }

  if (subscription.status === 'active') {
    await updateSubscriptionTier(userId, 'premium')
  } else if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
    console.warn(`Subscription ${subscription.id} is ${subscription.status} for user ${userId}`)
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = await userIdForSubscription(subscription)
  if (!userId) {
    console.error(`subscription.deleted ${subscription.id}: no user found, SOMEONE IS STILL PREMIUM`)
    return
  }

  const supabase = createServiceRoleClient()
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('subscription_type')
    .eq('id', userId)
    .single()

  if (profile?.subscription_type === 'lifetime') return

  await updateSubscriptionTier(userId, 'free')
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = (invoice as any).subscription as string | null
  if (!subscriptionId) return

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const userId = await userIdForSubscription(subscription)

  if (userId) {
    console.warn(`Payment failed for user ${userId}, subscription ${subscriptionId}`)
  }
}
