// PayPal Checkout Session Creator
// Simple PayPal integration for ChoreStar subscriptions

const { PayPalApi } = require('@paypal/paypal-server-sdk');

let paypalApi;

// Initialize PayPal
try {
  if (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
    paypalApi = new PayPalApi({
      clientId: process.env.PAYPAL_CLIENT_ID,
      clientSecret: process.env.PAYPAL_CLIENT_SECRET,
      environment: process.env.PAYPAL_ENVIRONMENT || 'sandbox' // 'sandbox' or 'live'
    });
    console.log('✅ PayPal initialized successfully');
  } else {
    console.warn('❌ PayPal credentials not configured');
  }
} catch (error) {
  console.error('❌ Failed to initialize PayPal:', error);
}

module.exports = async function handler(req, res) {
  console.log('💳 PayPal checkout request received:', {
    method: req.method,
    body: req.body
  });

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!paypalApi) {
    return res.status(500).json({ 
      error: 'PayPal not configured',
      details: 'Missing PayPal credentials'
    });
  }

  try {
    const { planType, customerId, email } = req.body;

    if (!planType) {
      return res.status(400).json({ error: 'Missing planType' });
    }

    // Define pricing based on plan type
    let amount, description;
    if (planType === 'monthly') {
      amount = '4.99';
      description = 'ChoreStar Premium - Monthly Subscription';
    } else if (planType === 'annual') {
      amount = '49.99';
      description = 'ChoreStar Premium - Annual Subscription';
    } else if (planType === 'lifetime') {
      amount = '149.99';
      description = 'ChoreStar Premium - Lifetime Access';
    } else {
      return res.status(400).json({ error: 'Invalid plan type' });
    }

    // Create PayPal order
    const orderRequest = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'USD',
            value: amount
          },
          description: description,
          custom_id: `chorestar_${planType}_${customerId}`,
          invoice_id: `chorestar_${Date.now()}`
        }
      ],
      application_context: {
        brand_name: 'ChoreStar',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://family-chore-chart.vercel.app'}/payment/success`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://family-chore-chart.vercel.app'}/payment/cancel`
      }
    };

    const order = await paypalApi.orders.create(orderRequest);
    
    console.log('✅ PayPal order created:', order.id);

    // Find approval URL
    const approvalUrl = order.links.find(link => link.rel === 'approve')?.href;
    
    if (!approvalUrl) {
      throw new Error('No approval URL found in PayPal response');
    }

    res.status(200).json({
      orderId: order.id,
      approvalUrl: approvalUrl,
      planType: planType,
      amount: amount
    });

  } catch (error) {
    console.error('❌ PayPal checkout creation failed:', error);
    res.status(500).json({ 
      error: 'Checkout creation failed',
      details: error.message
    });
  }
};
