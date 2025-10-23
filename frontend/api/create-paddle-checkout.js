// Paddle Checkout Session Creator
// Much simpler than Stripe - no webhook signature issues!

import { Paddle } from '@paddle/paddle-node-sdk';

let paddle;

// Initialize Paddle
try {
  if (process.env.PADDLE_API_KEY) {
    paddle = new Paddle(process.env.PADDLE_API_KEY);
    console.log('✅ Paddle initialized successfully');
  } else {
    console.warn('❌ PADDLE_API_KEY environment variable not set');
  }
} catch (error) {
  console.error('❌ Failed to initialize Paddle:', error);
}

export default async function handler(req, res) {
  console.log('🛒 Paddle checkout request received:', {
    method: req.method,
    body: req.body
  });

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!paddle) {
    return res.status(500).json({ 
      error: 'Paddle not configured',
      details: 'Missing PADDLE_API_KEY environment variable'
    });
  }

  try {
    const { priceId, customerId, email } = req.body;

    if (!priceId) {
      return res.status(400).json({ error: 'Missing priceId' });
    }

    // Create Paddle checkout session
    const checkoutSession = await paddle.transactions.create({
      items: [
        {
          priceId: priceId,
          quantity: 1
        }
      ],
      customerId: customerId || undefined,
      customerEmail: email || undefined,
      customData: {
        userId: customerId,
        source: 'family-chore-chart'
      },
      // Paddle handles tax calculation automatically
      allowCustomerDetails: true,
      // Redirect URLs
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://family-chore-chart.vercel.app'}/payment/success`,
      failureUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://family-chore-chart.vercel.app'}/payment/cancel`
    });

    console.log('✅ Paddle checkout session created:', checkoutSession.id);

    res.status(200).json({
      checkoutUrl: checkoutSession.checkoutUrl,
      transactionId: checkoutSession.id
    });

  } catch (error) {
    console.error('❌ Paddle checkout creation failed:', error);
    res.status(500).json({ 
      error: 'Checkout creation failed',
      details: error.message
    });
  }
}
