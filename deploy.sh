#!/bin/bash

# ChoreStar Deployment Script
# This script helps deploy the optimized ChoreStar application

echo "🚀 Starting ChoreStar Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Not in ChoreStar root directory. Please run this script from the project root."
    exit 1
fi

# Step 1: Test the current database state
print_status "Step 1: Testing current database state..."
if command -v node &> /dev/null; then
    node test-migration.js
    if [ $? -eq 0 ]; then
        print_success "Database tests passed - no migration needed!"
    else
        print_warning "Database tests failed - migration may be needed"
        echo ""
        read -p "Do you want to run the database migration? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_status "Please run the migration script in your Supabase SQL editor:"
            echo "   backend/supabase/apply-missing-schema.sql"
            echo ""
            read -p "Press Enter after running the migration..."
        fi
    fi
else
    print_warning "Node.js not found. Skipping database tests."
fi

# Step 2: Kill any existing servers
print_status "Step 2: Stopping any existing servers..."
pkill -f "serve.*3000" 2>/dev/null || true
pkill -f "vercel.*dev" 2>/dev/null || true
pkill -f "node.*serve" 2>/dev/null || true
print_success "Stopped existing servers"

# Step 3: Install dependencies
print_status "Step 3: Installing dependencies..."
if [ -f "package.json" ]; then
    npm install
    if [ $? -eq 0 ]; then
        print_success "Dependencies installed"
    else
        print_error "Failed to install dependencies"
        exit 1
    fi
fi

if [ -f "frontend/package.json" ]; then
    cd frontend
    npm install
    if [ $? -eq 0 ]; then
        print_success "Frontend dependencies installed"
    else
        print_error "Failed to install frontend dependencies"
        exit 1
    fi
    cd ..
fi

# Step 4: Copy optimization script to frontend
print_status "Step 4: Setting up optimizations..."
if [ -f "optimize-app.js" ]; then
    cp optimize-app.js frontend/optimize-app.js
    print_success "Optimization script copied to frontend"
    
    # Update index.html to include optimization script
    if ! grep -q "optimize-app.js" frontend/index.html; then
        # Add the script before the closing body tag
        sed -i.bak 's|</body>|    <script src="optimize-app.js"></script>\n</body>|' frontend/index.html
        print_success "Optimization script linked in index.html"
    else
        print_status "Optimization script already linked"
    fi
else
    print_warning "Optimization script not found"
fi

# Step 5: Choose deployment method
echo ""
print_status "Step 5: Choose deployment method:"
echo "1) Local development server (port 3000)"
echo "2) Vercel development server"
echo "3) Just prepare files (no server)"
echo ""
read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        print_status "Starting local development server..."
        cd frontend
        if command -v npx &> /dev/null; then
            npx serve . -p 3000
        else
            print_error "npx not found. Please install Node.js"
            exit 1
        fi
        ;;
    2)
        print_status "Starting Vercel development server..."
        if command -v vercel &> /dev/null; then
            vercel dev
        else
            print_error "Vercel CLI not found. Install with: npm i -g vercel"
            exit 1
        fi
        ;;
    3)
        print_success "Files prepared for deployment"
        print_status "You can now deploy to your preferred platform:"
        echo "  - Vercel: vercel --prod"
        echo "  - Netlify: netlify deploy --prod"
        echo "  - Manual: Upload frontend/ folder to your web server"
        ;;
    *)
        print_error "Invalid choice"
        exit 1
        ;;
esac

print_success "Deployment complete! 🎉"
echo ""
print_status "Next steps:"
echo "1. Test the Demo button functionality"
echo "2. Verify family data loads without errors"
echo "3. Test contact form submissions"
echo "4. Check that all existing functionality works"
echo ""
print_status "If you encounter any issues:"
echo "1. Check the browser console for errors"
echo "2. Verify database migration was applied"
echo "3. Check the migration test report: migration-test-report.json"
