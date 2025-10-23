// Stripe Webhook Handler with Raw Body Handling
// This version handles the raw body properly for signature verification

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

let stripe;
let supabase;

// Initialize Stripe
try {
    if (process.env.STRIPE_SECRET_KEY) {
        stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        console.log('✅ Stripe initialized successfully');
    } else {
        console.warn('❌ STRIPE_SECRET_KEY environment variable not set');
    }
} catch (error) {
    console.error('❌ Failed to initialize Stripe:', error);
}

// Initialize Supabase
try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (supabaseUrl && supabaseServiceKey) {
        supabase = createClient(supabaseUrl, supabaseServiceKey);
        console.log('✅ Supabase initialized successfully');
    } else {
        console.warn('❌ Supabase credentials not configured');
    }
} catch (error) {
    console.error('❌ Failed to initialize Supabase:', error);
}

// Get raw body from request
async function getRawBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', (chunk) => {
            body += chunk.toString();
        });
        req.on('end', () => {
            resolve(Buffer.from(body, 'utf8'));
        });
        req.on('error', reject);
    });
}

export default async function handler(req, res) {
    console.log('🔍 Raw webhook request received:', {
        method: req.method,
        headers: {
            'stripe-signature': req.headers['stripe-signature'] ? 'present' : 'missing',
            'content-type': req.headers['content-type'],
            'user-agent': req.headers['user-agent']
        }
    });

    // Test endpoint
    if (req.method === 'GET') {
        return res.status(200).json({ 
            message: 'Raw Stripe webhook endpoint is working',
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
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

    if (!sig) {
        console.error('Missing Stripe signature header');
        return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    if (!webhookSecret) {
        console.error('Missing STRIPE_WEBHOOK_SECRET environment variable');
        return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    if (!stripe || !supabase) {
        console.error('Stripe or Supabase not properly configured');
        return res.status(500).json({ 
            error: 'Service configuration error',
            details: 'Missing required services'
        });
    }

    let event;

    try {
        // Get raw body
        const rawBody = await getRawBody(req);
        console.log('📊 Raw body details:', {
            type: typeof rawBody,
            isBuffer: Buffer.isBuffer(rawBody),
            length: rawBody.length,
            firstChars: rawBody.toString('utf8').substring(0, 50)
        });

        // Verify webhook signature
        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
        console.log('✅ Signature verification successful');

    } catch (err) {
        console.error('❌ Webhook processing failed:', err.message);
        console.error('Error details:', {
            message: err.message,
            type: err.type,
            code: err.code,
            param: err.param
        });
        return res.status(400).json({ 
            error: 'Webhook processing failed',
            details: err.message,
            type: err.type || 'unknown'
        });
    }

    console.log('📨 Received Stripe webhook event:', event.type, new Date().toISOString());

    try {
        console.log(`🔄 Processing event: ${event.type}`);
        
        // Handle different event types
        switch (event.type) {
            case 'checkout.session.completed':
                console.log('Processing checkout.session.completed');
                // Add your handler logic here
                break;
                
            case 'customer.subscription.created':
                console.log('Processing customer.subscription.created');
                // Add your handler logic here
                break;
                
            case 'customer.subscription.updated':
                console.log('Processing customer.subscription.updated');
                // Add your handler logic here
                break;
                
            case 'customer.subscription.deleted':
                console.log('Processing customer.subscription.deleted');
                // Add your handler logic here
                break;
                
            case 'invoice.payment_succeeded':
                console.log('Processing invoice.payment_succeeded');
                // Add your handler logic here
                break;
                
            case 'invoice.payment_failed':
                console.log('Processing invoice.payment_failed');
                // Add your handler logic here
                break;
                
            case 'customer.updated':
                console.log('Processing customer.updated');
                // Add your handler logic here
                break;
                
            default:
                console.log(`🤷‍♂️ Unhandled event type: ${event.type}`);
        }

        console.log('✅ Webhook processed successfully');
        res.status(200).json({ received: true });
    } catch (error) {
        console.error('❌ Error processing webhook:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            error: 'Webhook processing failed',
            details: error.message,
            stack: error.stack
        });
    }
}
