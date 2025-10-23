// Stripe Webhook Handler with Manual Stream Reading
// This approach manually reads the request stream to get the exact raw body

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Disable body parsing completely
export const config = {
  api: {
    bodyParser: false,
  },
};

let stripe;
let supabase;

// Initialize services
try {
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    console.log('✅ Stripe initialized successfully (Stream Handler)');
  }
} catch (error) {
  console.error('❌ Failed to initialize Stripe:', error);
}

try {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (supabaseUrl && supabaseServiceKey) {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('✅ Supabase initialized successfully (Stream Handler)');
  }
} catch (error) {
  console.error('❌ Failed to initialize Supabase:', error);
}

// Manual stream reading function
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    
    req.on('data', (chunk) => {
      console.log('📦 Received chunk:', chunk.length, 'bytes');
      chunks.push(chunk);
    });
    
    req.on('end', () => {
      const rawBody = Buffer.concat(chunks);
      console.log('📊 Stream raw body details:', {
        chunksCount: chunks.length,
        totalLength: rawBody.length,
        firstChars: rawBody.toString('utf8').substring(0, 50),
        lastChars: rawBody.toString('utf8').substring(rawBody.length - 50)
      });
      resolve(rawBody);
    });
    
    req.on('error', (err) => {
      console.error('❌ Stream error:', err);
      reject(err);
    });
  });
}

export default async function handler(req, res) {
  console.log('🔍 Stream webhook request received:', {
    method: req.method,
    headers: {
      'stripe-signature': req.headers['stripe-signature'] ? 'present' : 'missing',
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent']
    }
  });

  // Handle GET requests for health checks
  if (req.method === 'GET') {
    return res.status(200).json({ 
      message: 'Stream Stripe webhook endpoint is working',
      timestamp: new Date().toISOString(),
      environment: {
        hasStripe: !!stripe,
        hasSupabase: !!supabase,
        hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET
      }
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get signature and webhook secret
  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!signature) {
    console.error('❌ Missing Stripe signature header');
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  if (!webhookSecret) {
    console.error('❌ Missing STRIPE_WEBHOOK_SECRET environment variable');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  if (!stripe || !supabase) {
    console.error('❌ Stripe or Supabase not properly configured');
    return res.status(500).json({ 
      error: 'Service configuration error',
      details: 'Missing required services'
    });
  }

  try {
    // Get raw body from stream
    console.log('🔄 Reading raw body from request stream...');
    const rawBody = await getRawBody(req);
    
    console.log('📊 Final raw body details:', {
      type: typeof rawBody,
      isBuffer: Buffer.isBuffer(rawBody),
      length: rawBody.length,
      firstChars: rawBody.toString('utf8').substring(0, 100),
      lastChars: rawBody.toString('utf8').substring(rawBody.length - 100)
    });

    // Additional debugging for signature verification
    console.log('🔍 Stream signature verification debug:', {
      signature,
      webhookSecret: webhookSecret ? 'present' : 'missing',
      webhookSecretLength: webhookSecret ? webhookSecret.length : 0,
      rawBodyLength: rawBody.length,
      rawBodyStart: rawBody.toString('utf8').substring(0, 20),
      rawBodyEnd: rawBody.toString('utf8').substring(rawBody.length - 20)
    });

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    console.log('✅ Stream signature verification successful');

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

    console.log('✅ Stream webhook processed successfully');
    res.status(200).json({ received: true });

  } catch (err) {
    console.error('❌ Stream webhook processing failed:', err.message);
    console.error('Error details:', {
      message: err.message,
      type: err.type,
      code: err.code,
      param: err.param
    });
    
    res.status(400).json({ 
      error: 'Webhook processing failed',
      details: err.message,
      type: err.type || 'unknown'
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
