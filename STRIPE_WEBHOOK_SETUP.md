# 🔗 Stripe Webhook Setup Guide

## Problem Identified
Currently, when customers pay for premium subscriptions, they only get upgraded to premium if they return to your site with the `?success=true` URL parameter. If they close the browser or don't return, **they remain on the free tier even though they paid**.

## Solution: Stripe Webhooks
I've created a webhook endpoint (`/api/stripe-webhook`) that automatically upgrades customers to premium when Stripe processes their payment, regardless of whether they return to your site.

---

## 🚀 Quick Setup Steps

### 1. Deploy the Webhook
The webhook file is already created at `frontend/api/stripe-webhook.js`. Deploy your app to Vercel:

```bash
vercel --prod
```

### 2. Configure Stripe Webhook
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Set endpoint URL to: `https://your-domain.vercel.app/api/stripe-webhook`
4. Select these events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

### 3. Add Environment Variables
In your Vercel dashboard, add these environment variables:

```
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_from_stripe
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
```

**⚠️ Important:** Use the **Service Role Key** from Supabase (not the anon key) as it has admin permissions to update user profiles.

---

## 🔧 Manual Fix for Current Customer

For your current customer `candaceriddell@yahoo.com`, you can manually upgrade them using the script I created:

### Option 1: Use the Manual Script
```bash
# Set environment variables
export SUPABASE_URL="your_supabase_url"
export SUPABASE_SERVICE_KEY="your_service_role_key"

# Install dependencies if needed
npm install @supabase/supabase-js

# Run the script
node manual-upgrade-customer.js
```

### Option 2: Direct Database Update
If you have access to your Supabase dashboard:

1. Go to Supabase Dashboard → Table Editor → `profiles`
2. Find the row with email `candaceriddell@yahoo.com`
3. Change `subscription_type` from `free` to `premium`
4. Save the changes

---

## 🎯 How It Works

### Before (Current System)
```
Customer pays → Stripe checkout → Redirected to site with ?success=true → 
JavaScript runs → Updates database → Premium access
```
**Problem:** If customer doesn't return or closes browser, they stay on free tier.

### After (With Webhook)
```
Customer pays → Stripe processes payment → Stripe sends webhook → 
Webhook automatically updates database → Premium access immediately
```
**Result:** Customer gets premium access regardless of what they do after payment.

---

## 🧪 Testing the Webhook

### Test with Stripe CLI (Recommended)
1. Install Stripe CLI: `stripe login`
2. Forward events to local development:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe-webhook
   ```
3. Create a test payment and verify the webhook processes it

### Test Events
The webhook handles these key events:
- ✅ `checkout.session.completed` - When customer completes payment
- ✅ `customer.subscription.created` - New subscription
- ✅ `customer.subscription.updated` - Subscription changes
- ✅ `customer.subscription.deleted` - Subscription cancelled
- ✅ `invoice.payment_succeeded` - Recurring payment success
- ✅ `invoice.payment_failed` - Payment failure

---

## 🛡️ Security Features

- **Signature Verification:** Validates webhooks are from Stripe
- **Error Handling:** Comprehensive error handling and logging
- **Idempotency:** Safe to receive duplicate events
- **Database Safety:** Uses Supabase service role for secure updates

---

## 📊 Monitoring

After setup, you can monitor:
- **Stripe Dashboard:** See webhook delivery status
- **Vercel Logs:** View webhook processing logs
- **Supabase Logs:** Monitor database updates

---

## ⚡ Immediate Action Required

1. **Deploy the webhook:** `vercel --prod`
2. **Set up Stripe webhook** pointing to your deployed endpoint
3. **Add environment variables** in Vercel
4. **Manually upgrade current customer** using the script or database

Once this is set up, all future customers will be automatically upgraded to premium immediately after payment, ensuring they get the features they paid for!

---

## 🆘 Troubleshooting

### Webhook Not Firing
- Check Stripe webhook logs in dashboard
- Verify endpoint URL is correct
- Ensure environment variables are set

### Database Not Updating
- Check Supabase service role key permissions
- Verify user exists in auth.users table
- Check Vercel function logs

### Customer Still Not Premium
- Check if profile exists in profiles table
- Verify subscription_type column value
- Run manual upgrade script as backup
