// Stripe Webhook Handler for Subscription Events
// This endpoint handles Stripe webhooks to automatically upgrade/downgrade users

let stripe;

// Initialize Stripe only if the secret key is available
try {
    if (process.env.STRIPE_SECRET_KEY) {
        const Stripe = require('stripe');
        stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    } else {
        console.warn('STRIPE_SECRET_KEY environment variable not set');
    }
} catch (error) {
    console.error('Failed to initialize Stripe:', error);
}

// Initialize Supabase client
let supabase;
try {
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (supabaseUrl && supabaseServiceKey) {
        supabase = createClient(supabaseUrl, supabaseServiceKey);
    } else {
        console.warn('Supabase credentials not configured');
    }
} catch (error) {
    console.error('Failed to initialize Supabase:', error);
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Verify webhook signature
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripe || !supabase) {
        console.error('Stripe or Supabase not properly configured');
        return res.status(500).json({ 
            error: 'Service configuration error',
            details: 'Missing required services'
        });
    }

    let event;

    try {
        // Verify webhook signature
        if (webhookSecret) {
            event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        } else {
            // For testing without webhook signature verification
            event = req.body;
            console.warn('⚠️ Webhook signature verification disabled (testing mode)');
        }
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).json({ error: 'Webhook signature verification failed' });
    }

    console.log('📨 Received Stripe webhook event:', event.type);

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(event.data.object);
                break;
                
            case 'customer.subscription.created':
                await handleSubscriptionCreated(event.data.object);
                break;
                
            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(event.data.object);
                break;
                
            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object);
                break;
                
            case 'invoice.payment_succeeded':
                await handlePaymentSucceeded(event.data.object);
                break;
                
            case 'invoice.payment_failed':
                await handlePaymentFailed(event.data.object);
                break;
                
            default:
                console.log(`🤷‍♂️ Unhandled event type: ${event.type}`);
        }

        res.status(200).json({ received: true });
    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).json({ 
            error: 'Webhook processing failed',
            details: error.message 
        });
    }
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
