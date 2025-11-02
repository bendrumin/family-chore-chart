// PayPal Webhook Handler
// Processes PayPal payment events

const { createClient } = require('@supabase/supabase-js');

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

module.exports = async function handler(req, res) {
  console.log('🔔 PayPal webhook received:', {
    method: req.method,
    headers: req.headers,
    body: req.body
  });

  // Handle GET requests for health checks
  if (req.method === 'GET') {
    return res.status(200).json({ 
      message: 'PayPal webhook endpoint is working',
      timestamp: new Date().toISOString(),
      environment: {
        hasSupabase: !!supabase,
        hasWebhookSecret: !!process.env.PAYPAL_WEBHOOK_SECRET
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
    const { event_type, resource } = req.body;

    console.log('📨 Received PayPal webhook event:', event_type, new Date().toISOString());

    // Process different PayPal events
    switch (event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        console.log('💰 Processing payment completed');
        await handlePaymentCompleted(resource);
        break;
        
      case 'PAYMENT.CAPTURE.DENIED':
        console.log('❌ Processing payment denied');
        await handlePaymentDenied(resource);
        break;
        
      case 'PAYMENT.CAPTURE.REFUNDED':
        console.log('🔄 Processing payment refunded');
        await handlePaymentRefunded(resource);
        break;
        
      case 'BILLING.SUBSCRIPTION.CREATED':
        console.log('📝 Processing subscription created');
        await handleSubscriptionCreated(resource);
        break;
        
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        console.log('✅ Processing subscription activated');
        await handleSubscriptionActivated(resource);
        break;
        
      case 'BILLING.SUBSCRIPTION.CANCELLED':
        console.log('🗑️ Processing subscription cancelled');
        await handleSubscriptionCancelled(resource);
        break;
        
      default:
        console.log(`🤷‍♂️ Unhandled PayPal event type: ${event_type}`);
    }

    console.log('✅ PayPal webhook processed successfully');
    res.status(200).json({ received: true });

  } catch (error) {
    console.error('❌ PayPal webhook processing failed:', error);
    res.status(500).json({ 
      error: 'Webhook processing failed',
      details: error.message
    });
  }
};

// Helper functions for processing different PayPal events
async function handlePaymentCompleted(payment) {
  console.log('💰 Processing payment completed:', payment.id);
  
  try {
    // Extract customer info from custom_id (format: chorestar_monthly_userId or chorestar_annual_userId)
    const customId = payment.custom_id;
    const customerId = customId ? customId.split('_')[2] : null;
    
    if (customerId) {
      // Upgrade user to premium - use subscription_type field
      const { error } = await supabase
        .from('profiles')
        .update({ 
          subscription_type: 'premium',
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId);

      if (error) {
        console.error('❌ Failed to upgrade user:', error);
      } else {
        console.log('✅ User upgraded to premium successfully');
      }
    } else {
      console.warn('⚠️ No customer ID found in payment custom_id:', customId);
    }
  } catch (error) {
    console.error('❌ Error processing payment completed:', error);
  }
}

async function handlePaymentDenied(payment) {
  console.log('❌ Processing payment denied:', payment.id);
  
  try {
    const customId = payment.custom_id;
    const customerId = customId ? customId.split('_')[2] : null;
    
    if (customerId) {
      // Keep user as free - subscription_type remains 'free'
      const { error } = await supabase
        .from('profiles')
        .update({ 
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId);

      if (error) {
        console.error('❌ Failed to update user:', error);
      } else {
        console.log('✅ User payment denied - kept as free');
      }
    }
  } catch (error) {
    console.error('❌ Error processing payment denied:', error);
  }
}

async function handlePaymentRefunded(payment) {
  console.log('🔄 Processing payment refunded:', payment.id);
  
  try {
    const customId = payment.custom_id;
    const customerId = customId ? customId.split('_')[2] : null;
    
    if (customerId) {
      // Downgrade user from premium - set subscription_type back to 'free'
      const { error } = await supabase
        .from('profiles')
        .update({ 
          subscription_type: 'free',
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId);

      if (error) {
        console.error('❌ Failed to downgrade user:', error);
      } else {
        console.log('✅ User downgraded from premium successfully');
      }
    }
  } catch (error) {
    console.error('❌ Error processing payment refunded:', error);
  }
}

async function handleSubscriptionCreated(subscription) {
  console.log('📝 Processing subscription created:', subscription.id);
  // Subscription created - user will be upgraded when activated
}

async function handleSubscriptionActivated(subscription) {
  console.log('✅ Processing subscription activated:', subscription.id);
  
  try {
    // Extract customer info - PayPal subscriptions have subscriber field
    const subscriberId = subscription.subscriber?.payer_id || subscription.subscriber?.email_address;
    
    if (subscriberId) {
      // Try to find user by email or upgrade based on subscription ID stored during creation
      // For now, we'll need to store subscription_id in profiles during checkout
      const { error } = await supabase
        .from('profiles')
        .update({ 
          subscription_type: 'premium',
          updated_at: new Date().toISOString()
        })
        .eq('email', subscription.subscriber?.email_address || '');

      if (error) {
        console.error('❌ Failed to activate subscription:', error);
      } else {
        console.log('✅ Subscription activated successfully');
      }
    }
  } catch (error) {
    console.error('❌ Error processing subscription activated:', error);
  }
}

async function handleSubscriptionCancelled(subscription) {
  console.log('🗑️ Processing subscription cancelled:', subscription.id);
  
  try {
    // Downgrade user from premium - find by email or stored subscription ID
    const { error } = await supabase
      .from('profiles')
      .update({ 
        subscription_type: 'free',
        updated_at: new Date().toISOString()
      })
      .eq('email', subscription.subscriber?.email_address || '');

    if (error) {
      console.error('❌ Failed to downgrade user:', error);
    } else {
      console.log('✅ User downgraded from premium successfully');
    }
  } catch (error) {
    console.error('❌ Error processing subscription cancelled:', error);
  }
}
