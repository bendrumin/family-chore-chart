// Final Stripe Webhook Handler - Bypass all Vercel body parsing
// This version uses a completely different approach to get the raw body

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

export default async function handler(req, res) {
    console.log('🔍 Final webhook request received:', {
        method: req.method,
        headers: {
            'stripe-signature': req.headers['stripe-signature'] ? 'present' : 'missing',
            'content-type': req.headers['content-type'],
            'user-agent': req.headers['user-agent']
        },
        hasBody: !!req.body,
        bodyType: typeof req.body
    });

    // Test endpoint
    if (req.method === 'GET') {
        return res.status(200).json({ 
            message: 'Final Stripe webhook endpoint is working',
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
        // Try to get raw body using different methods
        let rawBody;
        
        // Method 1: Check if we have a raw body property
        if (req.rawBody) {
            rawBody = req.rawBody;
            console.log('✅ Using req.rawBody');
        }
        // Method 2: Check if body is already a buffer
        else if (Buffer.isBuffer(req.body)) {
            rawBody = req.body;
            console.log('✅ Using req.body as Buffer');
        }
        // Method 3: If body is a string, convert to buffer
        else if (typeof req.body === 'string') {
            rawBody = Buffer.from(req.body, 'utf8');
            console.log('✅ Converted req.body string to Buffer');
        }
        // Method 4: If body is an object, stringify and convert to buffer
        else if (req.body && typeof req.body === 'object') {
            const jsonString = JSON.stringify(req.body);
            rawBody = Buffer.from(jsonString, 'utf8');
            console.log('⚠️ Reconstructed from parsed JSON object');
        }
        // Method 5: Try to read from the request stream manually
        else {
            console.log('⚠️ Attempting manual stream reading');
            const chunks = [];
            
            // Set up manual stream reading
            req.on('data', (chunk) => {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            });
            
            await new Promise((resolve, reject) => {
                req.on('end', resolve);
                req.on('error', reject);
            });
            
            rawBody = Buffer.concat(chunks);
            console.log('✅ Read from manual stream');
        }

        console.log('📊 Final raw body details:', {
            type: typeof rawBody,
            isBuffer: Buffer.isBuffer(rawBody),
            length: rawBody.length,
            firstChars: rawBody.toString('utf8').substring(0, 50),
            lastChars: rawBody.toString('utf8').substring(rawBody.length - 50)
        });

        // Additional debugging
        console.log('🔍 Signature debug:', {
            signature: sig,
            webhookSecretLength: webhookSecret.length,
            webhookSecretStart: webhookSecret.substring(0, 10),
            rawBodyLength: rawBody.length
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
