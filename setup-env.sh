#!/bin/bash

# ChoreStar Environment Setup Script
# This script helps you set up environment variables for local development

echo "🚀 ChoreStar Environment Setup"
echo "================================"

# Check if .env file exists
if [ -f .env ]; then
    echo "⚠️  .env file already exists. Backing up to .env.backup"
    cp .env .env.backup
fi

# Create .env file
echo "📝 Creating .env file..."

cat > .env << EOF
# ChoreStar Environment Variables
# Generated on $(date)

# SendGrid Configuration (for newsletters and contact form emails)
SENDGRID_API_KEY=your_sendgrid_api_key_here

# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Email Configuration
ADMIN_EMAIL=bsiegel13@gmail.com

# Stripe Configuration (add your keys here)
# STRIPE_SECRET_KEY=your_stripe_secret_key_here
# STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
EOF

echo "✅ .env file created successfully!"
echo ""
echo "🔧 Next steps:"
echo "1. For Vercel deployment, run: vercel env add SENDGRID_API_KEY"
echo "2. Enter your SendGrid API key when prompted"
echo "3. Deploy with: vercel --prod"
echo ""
echo "📧 Your SendGrid API key is already configured in the .env file"
echo "🔒 Remember: Never commit .env files to git!"
