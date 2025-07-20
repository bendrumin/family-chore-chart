// Payment Integration with Stripe
class PaymentManager {
    constructor() {
        this.stripe = Stripe('pk_live_CMPtLmI4NqSpnKcAXbPXte2w00F0PbtPp0');
    }

    async createCheckoutSession() {
        try {
            const response = await fetch('/api/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    priceId: 'price_1Rn5hXBVDszXFoIKPkjkAzaF',
                    successUrl: window.location.href + '?success=true',
                    cancelUrl: window.location.href + '?canceled=true',
                    userId: window.apiClient?.currentUser?.id || 'unknown'
                })
            });

            if (!response.ok) {
                throw new Error('Payment session creation failed');
            }

            const session = await response.json();
            return this.stripe.redirectToCheckout({ sessionId: session.id });
        } catch (error) {
            console.error('Payment error:', error);
            throw error;
        }
    }

    async handleUpgrade() {
        try {
            await this.createCheckoutSession();
        } catch (error) {
            console.error('Upgrade failed:', error);
            // Fallback for demo
            window.app.showToast('Payment integration coming soon! Contact us for early access.', 'info');
        }
    }
}

// Initialize payment manager
window.paymentManager = new PaymentManager(); 