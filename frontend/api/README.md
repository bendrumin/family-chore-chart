# ChoreStar API Endpoints

This directory contains the serverless API endpoints for ChoreStar.

## Dependencies

The API endpoints require the following Node.js packages:
- `stripe` - For payment processing
- `nodemailer` - For sending contact form emails

## Environment Variables

### Required for Payments (Stripe)
- `STRIPE_SECRET_KEY` - Your Stripe secret key for processing payments

### Required for Contact Form Emails
- `EMAIL_SERVICE` - Email service provider (e.g., 'gmail', 'zoho')
- `EMAIL_USER` - Email address for sending emails
- `EMAIL_PASS` - Email password or app-specific password
- `ADMIN_EMAIL` - Email address to receive contact form submissions

### Optional for Zoho Mail
- `ZOHO_HOST` - Zoho SMTP host (default: smtp.zoho.com)
- `ZOHO_PORT` - Zoho SMTP port (default: 587)
- `ZOHO_USER` - Zoho email username
- `ZOHO_PASS` - Zoho email password

## Vercel Deployment

1. Install dependencies:
   ```bash
   cd frontend/api
   npm install
   ```

2. Set environment variables in Vercel dashboard:
   - Go to your project settings
   - Navigate to Environment Variables
   - Add all required variables listed above

3. Deploy to Vercel:
   ```bash
   vercel --prod
   ```

## Error Handling

The API endpoints include robust error handling to prevent crashes:
- Graceful fallbacks when dependencies are missing
- Proper HTTP status codes and error messages
- Console logging for debugging
- User-friendly error responses

## Testing

Test the endpoints locally:
```bash
# Test payment endpoint
curl -X POST http://localhost:3000/api/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{"priceId":"test_price"}'

# Test contact form endpoint
curl -X POST http://localhost:3000/api/send-contact-email \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","subject":"Test","message":"Test message"}'
```
