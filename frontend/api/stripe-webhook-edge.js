// Stripe Webhook Handler using Vercel Edge Runtime
// This approach uses the Edge Runtime to get better control over raw body handling

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Edge runtime configuration
export const config = {
  runtime: 'edge',
};

let stripe;
let supabase;

// Initialize services
try {
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    console.log('✅ Stripe initialized successfully (Edge Runtime)');
  }
} catch (error) {
  console.error('❌ Failed to initialize Stripe:', error);
}

try {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (supabaseUrl && supabaseServiceKey) {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('✅ Supabase initialized successfully (Edge Runtime)');
  }
} catch (error) {
  console.error('❌ Failed to initialize Supabase:', error);
}

export default async function handler(request) {
  console.log('🔍 Edge webhook request received:', {
    method: request.method,
    url: request.url,
    headers: Object.fromEntries(request.headers.entries())
  });

  // Handle GET requests for health checks
  if (request.method === 'GET') {
    return new Response(JSON.stringify({ 
      message: 'Edge Stripe webhook endpoint is working',
      timestamp: new Date().toISOString(),
      environment: {
        hasStripe: !!stripe,
        hasSupabase: !!supabase,
        hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Get signature and webhook secret
  const signature = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!signature) {
    console.error('❌ Missing Stripe signature header');
    return new Response(JSON.stringify({ error: 'Missing stripe-signature header' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!webhookSecret) {
    console.error('❌ Missing STRIPE_WEBHOOK_SECRET environment variable');
    return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!stripe || !supabase) {
    console.error('❌ Stripe or Supabase not properly configured');
    return new Response(JSON.stringify({ 
      error: 'Service configuration error',
      details: 'Missing required services'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Get raw body from request
    const rawBody = await request.arrayBuffer();
    const bodyBuffer = Buffer.from(rawBody);
    
    console.log('📊 Edge raw body details:', {
      type: typeof bodyBuffer,
      isBuffer: Buffer.isBuffer(bodyBuffer),
      length: bodyBuffer.length,
      firstChars: bodyBuffer.toString('utf8').substring(0, 100)
    });

    // Additional debugging for signature verification
    console.log('🔍 Edge signature verification debug:', {
      signature,
      webhookSecret: webhookSecret ? 'present' : 'missing',
      webhookSecretLength: webhookSecret ? webhookSecret.length : 0,
      rawBodyLength: bodyBuffer.length,
      rawBodyStart: bodyBuffer.toString('utf8').substring(0, 20),
      rawBodyEnd: bodyBuffer.toString('utf8').substring(bodyBuffer.length - 20)
    });

    // Verify webhook signature (Edge Runtime requires async)
    const event = await stripe.webhooks.constructEventAsync(bodyBuffer, signature, webhookSecret);
    console.log('✅ Edge signature verification successful');

    console.log('📨 Received Stripe webhook event:', event.type, new Date().toISOString());

    // Process the event
    console.log(`🔄 Processing event: ${event.type}`);
    
    switch (event.type) {
      case 'checkout.session.completed':
        console.log('Processing checkout.session.completed');
        await handleCheckoutCompleted(event.data.object);
        break;
        
      case 'customer.subscription.created':
        console.log('Processing customer.subscription.created');
        await handleSubscriptionCreated(event.data.object);
        break;
        
      case 'customer.subscription.updated':
        console.log('Processing customer.subscription.updated');
        await handleSubscriptionUpdated(event.data.object);
        break;
        
      case 'customer.subscription.deleted':
        console.log('Processing customer.subscription.deleted');
        await handleSubscriptionDeleted(event.data.object);
        break;
        
      case 'invoice.payment_succeeded':
        console.log('Processing invoice.payment_succeeded');
        await handlePaymentSucceeded(event.data.object);
        break;
        
      case 'invoice.payment_failed':
        console.log('Processing invoice.payment_failed');
        await handlePaymentFailed(event.data.object);
        break;
        
      case 'customer.updated':
        console.log('Processing customer.updated');
        await handleCustomerUpdated(event.data.object);
        break;
        
      default:
        console.log(`🤷‍♂️ Unhandled event type: ${event.type}`);
    }

    console.log('✅ Edge webhook processed successfully');
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('❌ Edge webhook processing failed:', err.message);
    console.error('Error details:', {
      message: err.message,
      type: err.type,
      code: err.code,
      param: err.param
    });
    
    return new Response(JSON.stringify({ 
      error: 'Webhook processing failed',
      details: err.message,
      type: err.type || 'unknown'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Helper functions for processing different event types
async function handleCheckoutCompleted(session) {
  console.log('🛒 Processing checkout session completed:', session.id);
  // Add your checkout completion logic here
}

async function handleSubscriptionCreated(subscription) {
  console.log('📝 Processing subscription created:', subscription.id);
  // Add your subscription creation logic here
}

async function handleSubscriptionUpdated(subscription) {
  console.log('🔄 Processing subscription updated:', subscription.id);
  // Add your subscription update logic here
}

async function handleSubscriptionDeleted(subscription) {
  console.log('🗑️ Processing subscription deleted:', subscription.id);
  // Add your subscription deletion logic here
}

async function handlePaymentSucceeded(invoice) {
  console.log('💰 Processing payment succeeded:', invoice.id);
  // Add your payment success logic here
}

async function handlePaymentFailed(invoice) {
  console.log('💸 Processing payment failed:', invoice.id);
  // Add your payment failure logic here
}

async function handleCustomerUpdated(customer) {
  console.log('👤 Processing customer updated:', customer.id);
  // Add your customer update logic here
}
