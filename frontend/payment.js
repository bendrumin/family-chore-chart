// Payment Integration with PayPal
class PaymentManager {
    constructor() {
        this.apiUrl = '/api/create-paypal-checkout';
    }

    async createCheckoutSession(planType = 'monthly') {
        try {
            const customerId = window.apiClient?.currentUser?.id || 'user_' + Date.now();
            const email = window.apiClient?.currentUser?.email || 'user@example.com';
            
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    planType,
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
            const checkout = await this.createCheckoutSession('monthly');
            // Redirect to PayPal checkout
            window.location.href = checkout.approvalUrl;
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