# Stripe Webhook Fix Guide

## What I Fixed

✅ **Disabled Vercel's body parser** for the webhook endpoint (signature verification needs raw bytes)  
✅ **Added explicit route** for `/api/stripe-webhook` in `vercel.json`  
✅ **Improved raw body handling** with fallback logic  
✅ **Added signature header validation**

## What YOU Need to Do Now

### 1. Set Environment Variables in Vercel

Your failing URL is a **Preview deployment**: `family-chore-chart-kraz5xzzt-ben-siegels-projects-81682bcc.vercel.app`

Go to **Vercel Dashboard** → **Your Project** → **Settings** → **Environment Variables**

Set these for **ALL environments** (Production, Preview, Development):

```
STRIPE_SECRET_KEY = sk_live_... (your live secret key)
STRIPE_WEBHOOK_SECRET = whsec_... (see step 2 below)
SUPABASE_URL = https://your-project.supabase.co
SUPABASE_SERVICE_KEY = eyJ... (your service role key)
```

**Critical:** Make sure `STRIPE_WEBHOOK_SECRET` is set for **Preview** environments, not just Production!

### 2. Get the Correct Webhook Secret from Stripe

1. Go to **Stripe Dashboard** → **Developers** → **Webhooks**
2. Find your endpoint: `https://family-chore-chart-....vercel.app/api/stripe-webhook`
3. Click on it → **Signing secret** → Click "Reveal"
4. Copy the `whsec_...` value
5. Paste it as `STRIPE_WEBHOOK_SECRET` in Vercel (see step 1)

**Important:** Each webhook endpoint has its own signing secret. Make sure you're copying from the correct endpoint.

### 3. Redeploy

After setting the environment variables:

```bash
git add .
git commit -m "Fix Stripe webhook signature verification"
git push
```

Or trigger a redeploy in Vercel Dashboard.

### 4. Test the Webhook

#### Option A: Using Stripe CLI (Recommended)

```bash
# Install Stripe CLI if you haven't
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward events to your endpoint
stripe listen --forward-to https://your-deployment-url.vercel.app/api/stripe-webhook

# In another terminal, trigger a test event
stripe trigger checkout.session.completed
stripe trigger invoice.payment_succeeded
```

#### Option B: Using Stripe Dashboard

1. Go to **Developers** → **Webhooks** → Your endpoint
2. Click **Send test webhook**
3. Select event type (e.g., `invoice.payment_succeeded`)
4. Click **Send test webhook**
5. Check the response - should be `200 OK` with `{"received":true}`

### 5. Check for Success

After redeploying, go back to **Stripe Dashboard** → **Webhooks** → Your endpoint → **Logs**

You should see:
- ✅ Status `200 OK`
- ✅ Response body: `{"received":true}`

## Common Issues

### Still getting 400 errors?

**Check:** Is your `STRIPE_WEBHOOK_SECRET` exactly the signing secret from Stripe Dashboard?
- No extra spaces
- Must start with `whsec_`
- Must match the specific endpoint URL

**Check:** Are you using the right mode?
- Event shows `"livemode": true` → Use `sk_live_...` and live webhook secret
- Event shows `"livemode": false` → Use `sk_test_...` and test webhook secret

### Getting 500 errors?

**Check:** Are all environment variables set?
```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
SUPABASE_URL
SUPABASE_SERVICE_KEY
```

Visit: `https://your-deployment-url.vercel.app/api/health`

Should show all services as "configured".

### Webhook works in Production but not Preview?

**Fix:** Environment variables must be set for **Preview** deployments too.

In Vercel → Settings → Environment Variables → Select **Preview** checkbox when adding/editing vars.

## What Events Are Handled?

Your webhook currently handles:
- ✅ `checkout.session.completed` - Initial purchase
- ✅ `customer.subscription.created` - New subscription
- ✅ `customer.subscription.updated` - Subscription changes
- ✅ `customer.subscription.deleted` - Cancellation
- ✅ `invoice.payment_succeeded` - Successful payment
- ✅ `invoice.payment_failed` - Failed payment

Make sure these event types are enabled in Stripe Dashboard → Webhooks → Your endpoint → Events to send.

## Need More Help?

Check Vercel function logs:
```bash
vercel logs your-deployment-url
```

Or in Vercel Dashboard → Deployments → Click deployment → Functions → stripe-webhook

