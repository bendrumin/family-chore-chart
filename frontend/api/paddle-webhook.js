// Paddle Webhook Handler
// Much simpler than Stripe - no signature verification issues!

import { createClient } from '@supabase/supabase-js';

let supabase;

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
  console.log('🔔 Paddle webhook received:', {
    method: req.method,
    headers: req.headers,
    body: req.body
  });

  // Handle GET requests for health checks
  if (req.method === 'GET') {
    return res.status(200).json({ 
      message: 'Paddle webhook endpoint is working',
      timestamp: new Date().toISOString(),
      environment: {
        hasSupabase: !!supabase,
        hasWebhookSecret: !!process.env.PADDLE_WEBHOOK_SECRET
      }
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabase) {
    console.error('❌ Supabase not properly configured');
    return res.status(500).json({ 
      error: 'Service configuration error',
      details: 'Missing Supabase configuration'
    });
  }

  try {
    const { event_type, data } = req.body;

    console.log('📨 Received Paddle webhook event:', event_type, new Date().toISOString());

    // Process different Paddle events
    switch (event_type) {
      case 'transaction.created':
        console.log('🛒 Processing transaction created');
        await handleTransactionCreated(data);
        break;
        
      case 'transaction.updated':
        console.log('🔄 Processing transaction updated');
        await handleTransactionUpdated(data);
        break;
        
      case 'transaction.completed':
        console.log('✅ Processing transaction completed');
        await handleTransactionCompleted(data);
        break;
        
      case 'transaction.payment_failed':
        console.log('💸 Processing payment failed');
        await handlePaymentFailed(data);
        break;
        
      case 'subscription.created':
        console.log('📝 Processing subscription created');
        await handleSubscriptionCreated(data);
        break;
        
      case 'subscription.updated':
        console.log('🔄 Processing subscription updated');
        await handleSubscriptionUpdated(data);
        break;
        
      case 'subscription.canceled':
        console.log('🗑️ Processing subscription canceled');
        await handleSubscriptionCanceled(data);
        break;
        
      default:
        console.log(`🤷‍♂️ Unhandled Paddle event type: ${event_type}`);
    }

    console.log('✅ Paddle webhook processed successfully');
    res.status(200).json({ received: true });

  } catch (error) {
    console.error('❌ Paddle webhook processing failed:', error);
    res.status(500).json({ 
      error: 'Webhook processing failed',
      details: error.message
    });
  }
}

// Helper functions for processing different Paddle events
async function handleTransactionCreated(transaction) {
  console.log('🛒 Processing transaction created:', transaction.id);
  
  try {
    // Update user's subscription status in Supabase
    const { error } = await supabase
      .from('profiles')
      .update({ 
        subscription_status: 'pending',
        paddle_transaction_id: transaction.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', transaction.custom_data?.userId);

    if (error) {
      console.error('❌ Failed to update user subscription:', error);
    } else {
      console.log('✅ User subscription updated successfully');
    }
  } catch (error) {
    console.error('❌ Error processing transaction created:', error);
  }
}

async function handleTransactionCompleted(transaction) {
  console.log('✅ Processing transaction completed:', transaction.id);
  
  try {
    // Upgrade user to premium
    const { error } = await supabase
      .from('profiles')
      .update({ 
        subscription_status: 'active',
        is_premium: true,
        paddle_transaction_id: transaction.id,
        subscription_start_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', transaction.custom_data?.userId);

    if (error) {
      console.error('❌ Failed to upgrade user:', error);
    } else {
      console.log('✅ User upgraded to premium successfully');
    }
  } catch (error) {
    console.error('❌ Error processing transaction completed:', error);
  }
}

async function handleTransactionUpdated(transaction) {
  console.log('🔄 Processing transaction updated:', transaction.id);
  // Add your transaction update logic here
}

async function handlePaymentFailed(transaction) {
  console.log('💸 Processing payment failed:', transaction.id);
  
  try {
    // Update user's subscription status
    const { error } = await supabase
      .from('profiles')
      .update({ 
        subscription_status: 'payment_failed',
        updated_at: new Date().toISOString()
      })
      .eq('id', transaction.custom_data?.userId);

    if (error) {
      console.error('❌ Failed to update user subscription status:', error);
    } else {
      console.log('✅ User subscription status updated to payment_failed');
    }
  } catch (error) {
    console.error('❌ Error processing payment failed:', error);
  }
}

async function handleSubscriptionCreated(subscription) {
  console.log('📝 Processing subscription created:', subscription.id);
  // Add your subscription creation logic here
}

async function handleSubscriptionUpdated(subscription) {
  console.log('🔄 Processing subscription updated:', subscription.id);
  // Add your subscription update logic here
}

async function handleSubscriptionCanceled(subscription) {
  console.log('🗑️ Processing subscription canceled:', subscription.id);
  
  try {
    // Downgrade user from premium
    const { error } = await supabase
      .from('profiles')
      .update({ 
        subscription_status: 'canceled',
        is_premium: false,
        subscription_end_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('paddle_subscription_id', subscription.id);

    if (error) {
      console.error('❌ Failed to downgrade user:', error);
    } else {
      console.log('✅ User downgraded from premium successfully');
    }
  } catch (error) {
    console.error('❌ Error processing subscription canceled:', error);
  }
}
