#!/bin/bash

# Family Chore Chart - Quick Start Script
# This script helps you get the application running quickly

set -e

echo "🏠 Family Chore Chart - Quick Start"
echo "=================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "frontend/index.html" ]; then
    echo "❌ Please run this script from the root directory of the project."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
cd frontend
npm install
cd ..

echo ""
echo "✅ Dependencies installed!"
echo ""

# Check if Supabase config needs to be updated
if grep -q "YOUR_SUPABASE_PROJECT_URL" frontend/supabase-config.js; then
    echo "⚠️  IMPORTANT: You need to configure Supabase before running the app."
    echo ""
    echo "Please follow these steps:"
    echo "1. Create a Supabase project at https://supabase.com"
    echo "2. Run the database schema from backend/supabase/schema.sql"
    echo "3. Update frontend/supabase-config.js with your credentials"
    echo ""
    echo "See SETUP.md for detailed instructions."
    echo ""
    
    read -p "Do you want to continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled. Please configure Supabase first."
        exit 1
    fi
fi

echo "🚀 Starting development server..."
echo ""
echo "The app will be available at: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the development server
cd frontend
npm run dev 