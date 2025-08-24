#!/bin/bash

# ChoreStar Vercel Deployment Script
echo "🚀 Deploying ChoreStar to Vercel..."

# Check if we're in the right directory
if [ ! -f "vercel.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Install API dependencies
echo "📦 Installing API dependencies..."
cd frontend/api
npm install
cd ../..

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check environment variables
echo "🔍 Checking environment variables..."
echo "Note: Make sure you have set the following in your Vercel dashboard:"
echo "  - STRIPE_SECRET_KEY"
echo "  - EMAIL_SERVICE"
echo "  - EMAIL_USER"
echo "  - EMAIL_PASS"
echo "  - ADMIN_EMAIL"
echo ""

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

echo ""
echo "✅ Deployment complete!"
echo "🔍 Check your API health at: https://your-domain.vercel.app/api/health"
echo "📧 Test contact form at: https://your-domain.vercel.app/api/send-contact-email"
echo "💳 Test payment endpoint at: https://your-domain.vercel.app/api/create-checkout-session"
