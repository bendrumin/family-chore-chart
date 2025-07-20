import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { priceId, successUrl, cancelUrl } = req.body;

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                userId: req.body.userId || 'unknown'
            }
        });

        res.status(200).json({ id: session.id });
    } catch (error) {
        console.error('Stripe error:', error);
        res.status(500).json({ error: 'Payment session creation failed' });
    }
} 