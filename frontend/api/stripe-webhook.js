// Stripe Webhook Handler for Subscription Events
// This endpoint handles Stripe webhooks to automatically upgrade/downgrade users

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Vercel webhook configuration - try different approach
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '1mb',
        },
    },
};

let stripe;
let supabase;

// Initialize Stripe only if the secret key is available
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

// Initialize Supabase client
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
    console.log('🔍 Webhook request received:', {
        method: req.method,
        headers: {
            'stripe-signature': req.headers['stripe-signature'] ? 'present' : 'missing',
            'content-type': req.headers['content-type'],
            'user-agent': req.headers['user-agent']
        },
        hasRawBody: !!req.rawBody,
        hasBody: !!req.body
    });

    // Add a simple test endpoint
    if (req.method === 'GET') {
        return res.status(200).json({ 
            message: 'Stripe webhook endpoint is working',
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

    // Verify webhook signature
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim(); // Remove whitespace

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
        // Get raw body for signature verification
        let rawBody;
        
        console.log('🔍 Body parsing debug:', {
            hasRawBody: !!req.rawBody,
            hasBody: !!req.body,
            bodyType: typeof req.body,
            bodyIsBuffer: Buffer.isBuffer(req.body),
            bodyIsString: typeof req.body === 'string',
            bodyLength: req.body ? req.body.length : 0
        });
        
        if (req.rawBody) {
            // Vercel provides rawBody when bodyParser is disabled
            rawBody = req.rawBody;
            console.log('✅ Using req.rawBody for signature verification');
        } else if (Buffer.isBuffer(req.body)) {
            // Body is already a Buffer
            rawBody = req.body;
            console.log('✅ Using req.body as Buffer for signature verification');
        } else if (typeof req.body === 'string') {
            // Body is a string, convert to Buffer
            rawBody = Buffer.from(req.body, 'utf8');
            console.log('✅ Converted req.body string to Buffer for signature verification');
        } else if (req.body && typeof req.body === 'object') {
            // Vercel parsed the JSON, we need to reconstruct the raw body
            // This is a workaround for Vercel's body parsing
            const jsonString = JSON.stringify(req.body);
            rawBody = Buffer.from(jsonString, 'utf8');
            console.log('⚠️ Reconstructed raw body from parsed JSON (Vercel workaround)');
        } else {
            // Fallback: try to read from request stream
            console.log('⚠️ Attempting to read raw body from request stream');
            const chunks = [];
            for await (const chunk of req) {
                chunks.push(chunk);
            }
            rawBody = Buffer.concat(chunks);
            console.log('✅ Read raw body from request stream');
        }
        
        console.log('📊 Raw body details:', {
            type: typeof rawBody,
            isBuffer: Buffer.isBuffer(rawBody),
            length: rawBody.length,
            firstChars: rawBody.toString('utf8').substring(0, 50)
        });
        
        // Verify webhook signature
        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
        console.log('✅ Signature verification successful');
        
        // TODO: Implement proper signature verification for Vercel
        // The issue is that Vercel's body parsing corrupts the raw bytes
        // needed for signature verification
    } catch (err) {
        console.error('Webhook processing failed:', err.message);
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

// Reads the raw request body as a Buffer for signature verification
async function getRawBody(req) {
    // Vercel provides the raw body in req.body when bodyParser: false
    // But we need to ensure it's a Buffer
    if (req.body) {
        if (Buffer.isBuffer(req.body)) {
            return req.body;
        }
        if (typeof req.body === 'string') {
            return Buffer.from(req.body, 'utf8');
        }
        // If it's an object, stringify it
        return Buffer.from(JSON.stringify(req.body), 'utf8');
    }

    // Fallback: read from stream
    return await new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (chunk) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

async function handleCheckoutCompleted(session) {
    console.log('✅ Checkout completed:', session.id);
    
    try {
        // Get customer email from Stripe
        const customer = await stripe.customers.retrieve(session.customer);
        const customerEmail = customer.email;
        
        if (!customerEmail) {
            console.error('❌ No customer email found in checkout session');
            return;
        }
        
        console.log(`👤 Customer email: ${customerEmail}`);
        
        // Find user in Supabase by email
        const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
        
        if (usersError) {
            throw new Error(`Error fetching users: ${usersError.message}`);
        }
        
        const user = users.users.find(u => u.email === customerEmail);
        
        if (!user) {
            console.error(`❌ User not found in database: ${customerEmail}`);
            return;
        }
        
        // Update subscription status to premium
        await upgradeUserToPremium(user.id, customerEmail);
        
    } catch (error) {
        console.error('Error handling checkout completion:', error);
        throw error;
    }
}

async function handleSubscriptionCreated(subscription) {
    console.log('🆕 Subscription created:', subscription.id);
    await updateUserSubscriptionStatus(subscription, 'premium');
}

async function handleSubscriptionUpdated(subscription) {
    console.log('🔄 Subscription updated:', subscription.id);
    
    const status = subscription.status;
    let subscriptionType = 'free';
    
    if (status === 'active' || status === 'trialing') {
        subscriptionType = 'premium';
    }
    
    await updateUserSubscriptionStatus(subscription, subscriptionType);
}

async function handleSubscriptionDeleted(subscription) {
    console.log('❌ Subscription deleted:', subscription.id);
    await updateUserSubscriptionStatus(subscription, 'free');
}

async function handlePaymentSucceeded(invoice) {
    console.log('💳 Payment succeeded:', invoice.id);
    
    if (invoice.subscription) {
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        await updateUserSubscriptionStatus(subscription, 'premium');
    }
}

async function handlePaymentFailed(invoice) {
    console.log('💳 Payment failed:', invoice.id);
    // Could implement logic to handle failed payments (grace period, etc.)
}

async function handleCustomerUpdated(customer) {
    console.log('👤 Customer updated:', customer.id);
    
    // You can add logic here to handle customer updates
    // For example, sync customer data to your database
    // or update user profiles based on customer changes
    
    console.log(`Customer ${customer.id} was updated`);
}

async function updateUserSubscriptionStatus(subscription, subscriptionType) {
    try {
        // Get customer email from Stripe
        const customer = await stripe.customers.retrieve(subscription.customer);
        const customerEmail = customer.email;
        
        if (!customerEmail) {
            console.error('❌ No customer email found');
            return;
        }
        
        // Find user in Supabase
        const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
        
        if (usersError) {
            throw new Error(`Error fetching users: ${usersError.message}`);
        }
        
        const user = users.users.find(u => u.email === customerEmail);
        
        if (!user) {
            console.error(`❌ User not found: ${customerEmail}`);
            return;
        }
        
        if (subscriptionType === 'premium') {
            await upgradeUserToPremium(user.id, customerEmail);
        } else {
            await downgradeUserToFree(user.id, customerEmail);
        }
        
    } catch (error) {
        console.error('Error updating user subscription status:', error);
        throw error;
    }
}

async function upgradeUserToPremium(userId, email) {
    try {
        console.log(`⬆️ Upgrading ${email} to premium...`);
        
        // Check if profile exists
        const { data: existingProfile, error: checkError } = await supabase
            .from('profiles')
            .select('subscription_type')
            .eq('id', userId)
            .single();
            
        if (checkError && checkError.code !== 'PGRST116') {
            throw checkError;
        }
        
        if (!existingProfile) {
            // Create profile if it doesn't exist
            const { error: createError } = await supabase
                .from('profiles')
                .insert({
                    id: userId,
                    email: email,
                    family_name: email.split('@')[0] + "'s Family",
                    subscription_type: 'premium'
                });
                
            if (createError) {
                throw createError;
            }
            
            console.log(`✅ Created premium profile for ${email}`);
        } else {
            // Update existing profile
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ subscription_type: 'premium' })
                .eq('id', userId);
                
            if (updateError) {
                throw updateError;
            }
            
            console.log(`✅ Upgraded ${email} to premium`);
        }
        
    } catch (error) {
        console.error(`❌ Error upgrading user to premium:`, error);
        throw error;
    }
}

async function downgradeUserToFree(userId, email) {
    try {
        console.log(`⬇️ Downgrading ${email} to free...`);
        
        const { error } = await supabase
            .from('profiles')
            .update({ subscription_type: 'free' })
            .eq('id', userId);
            
        if (error) {
            throw error;
        }
        
        console.log(`✅ Downgraded ${email} to free`);
        
    } catch (error) {
        console.error(`❌ Error downgrading user to free:`, error);
        throw error;
    }
}
