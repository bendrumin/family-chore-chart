// Payment Integration with Paddle
class PaymentManager {
    constructor() {
        this.apiUrl = '/api/create-paddle-checkout';
    }

    async createCheckoutSession(priceId = 'pro_01k88sgf2e0gd4maaxq3asx6zy') {
        try {
            const customerId = window.apiClient?.currentUser?.id || 'user_' + Date.now();
            const email = window.apiClient?.currentUser?.email || 'user@example.com';
            
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    priceId,
                    customerId,
                    email
                })
            });

            if (!response.ok) {
                throw new Error('Payment session creation failed');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Payment error:', error);
            throw error;
        }
    }

    async handleUpgrade() {
        try {
            const checkout = await this.createCheckoutSession();
            // Redirect to Paddle checkout
            window.location.href = checkout.checkoutUrl;
        } catch (error) {
            console.error('Upgrade failed:', error);
            
            // Try to show toast if app is available
            if (window.app && typeof window.app.showToast === 'function') {
                window.app.showToast('Payment system is currently unavailable. Please try again later or contact support.', 'error');
            } else {
                // Fallback error message
                alert('Payment system is currently unavailable. Please try again later or contact support.');
            }
        }
    }
}

// Initialize payment manager
window.paymentManager = new PaymentManager(); 