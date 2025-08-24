// Payment API endpoint for creating Stripe checkout sessions
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

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check if Stripe is properly initialized
    if (!stripe) {
        console.error('Stripe not initialized - missing STRIPE_SECRET_KEY');
        return res.status(500).json({ 
            error: 'Payment system temporarily unavailable',
            details: 'Payment service not configured'
        });
    }

    try {
        const { priceId, successUrl, cancelUrl } = req.body;

        // Validate required fields
        if (!priceId) {
            return res.status(400).json({ error: 'Price ID is required' });
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: successUrl || `${req.headers.origin}?success=true`,
            cancel_url: cancelUrl || `${req.headers.origin}?canceled=true`,
            metadata: {
                userId: req.body.userId || 'unknown'
            }
        });

        res.status(200).json({ id: session.id });
    } catch (error) {
        console.error('Stripe error:', error);
        
        // Provide more specific error messages
        if (error.type === 'StripeInvalidRequestError') {
            return res.status(400).json({ 
                error: 'Invalid payment request',
                details: error.message 
            });
        }
        
        res.status(500).json({ 
            error: 'Payment session creation failed',
            details: 'Please try again later or contact support'
        });
    }
} 