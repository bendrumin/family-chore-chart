#!/bin/bash

# Vercel Deployment Script with Git Author Fix
# This script ensures the correct Git author email is used for Vercel deployments

echo "🚀 Deploying to Vercel..."

# Set Git author environment variables to override commit author
export GIT_AUTHOR_EMAIL="bendrumin@mac.com"
export GIT_COMMITTER_EMAIL="bendrumin@mac.com"
export GIT_AUTHOR_NAME="bendrumin"
export GIT_COMMITTER_NAME="bendrumin"

# Check if we're in the right directory
if [ ! -f "vercel.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Deploy to Vercel
echo "🚀 Deploying to production..."
vercel --prod

echo ""
echo "✅ Deployment complete!"
