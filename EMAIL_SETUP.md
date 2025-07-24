# Email Setup Guide for Contact Form Notifications

## Current Status ✅
- Contact form is working and storing submissions in Supabase
- Email API route is deployed and ready
- Contact form will call the email API when submissions are made
- **Gmail support is now configured and ready!**

## To Enable Email Notifications

### Option 1: Gmail (Recommended - Easiest)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
   - **Copy the 16-character password**
3. **Add Environment Variables to Vercel**:
   ```bash
   vercel env add EMAIL_SERVICE
   # Enter: gmail
   
   vercel env add EMAIL_USER
   # Enter: your-gmail@gmail.com
   
   vercel env add EMAIL_PASS
   # Enter: your-app-password-from-step-2
   
   vercel env add ADMIN_EMAIL
   # Enter: bsiegel13@gmail.com
   ```

### Option 2: Zoho Mail (Alternative)

1. **Get your Zoho Mail credentials**:
   - Log into your Zoho Mail account
   - Go to Settings → Mail Accounts → SMTP/IMAP
   - Note your SMTP settings:
     - Host: smtp.zoho.com
     - Port: 587
     - Security: TLS

2. **Generate an App Password** (if needed):
   - In Zoho Mail settings, look for "App Passwords" or "API Tokens"
   - Generate a new app password for SMTP access

3. **Add Environment Variables to Vercel**:
   ```bash
   vercel env add ZOHO_HOST
   # Enter: smtp.zoho.com
   
   vercel env add ZOHO_PORT
   # Enter: 587
   
   vercel env add ZOHO_USER
   # Enter: your-zoho-email@yourdomain.com
   
   vercel env add ZOHO_PASS
   # Enter: your-zoho-app-password
   
   vercel env add ADMIN_EMAIL
   # Enter: bsiegel13@gmail.com
   ```

### Option 3: Resend (Alternative)

1. **Sign up at [resend.com](https://resend.com)**
2. **Get your API key**
3. **Add Environment Variables**:
   ```bash
   vercel env add RESEND_API_KEY
   # Enter: your-resend-api-key
   
   vercel env add ADMIN_EMAIL
   # Enter: bsiegel13@gmail.com
   ```

## Testing the Setup

1. **Submit a test contact form** on your live site
2. **Check Vercel logs** to see if email is being sent
3. **Check your email** at bsiegel13@gmail.com

## Current Behavior

Right now, the contact form:
- ✅ Stores submissions in Supabase database
- ✅ Calls the email API
- ✅ Logs email content to Vercel console
- ⏳ **Needs Gmail credentials to send actual emails**

## Next Steps

1. **Enable 2FA on your Gmail account**
2. **Generate an App Password** for Gmail
3. **Set up the environment variables** using the commands above
4. **Deploy again**

The email API is now configured for Gmail and ready to go - just needs the Gmail credentials configured! 