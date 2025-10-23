// Paddle Payment Integration
// Much simpler than Stripe!

class PaddlePayment {
  constructor() {
    this.paddleVendorId = process.env.NEXT_PUBLIC_PADDLE_VENDOR_ID;
    this.apiUrl = '/api/create-paddle-checkout';
  }

  async createCheckout(priceId, customerId, email) {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          customerId,
          email
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Paddle checkout creation failed:', error);
      throw error;
    }
  }

  async startCheckout(priceId, customerId, email) {
    try {
      const checkout = await this.createCheckout(priceId, customerId, email);
      
      // Redirect to Paddle checkout
      window.location.href = checkout.checkoutUrl;
      
    } catch (error) {
      console.error('❌ Failed to start Paddle checkout:', error);
      throw error;
    }
  }
}

// Export for use in other files
window.PaddlePayment = PaddlePayment;
