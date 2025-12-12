#!/bin/bash

# Security Fix Script
# Run this to address critical security vulnerabilities

echo "🔒 Starting security fixes..."

# 1. Update frontend nodemailer
echo "📦 Updating nodemailer in frontend..."
cd frontend
npm update nodemailer
cd ..

# 2. Run npm audit fix (non-breaking)
echo "🔍 Running npm audit fix..."
npm audit fix

# 3. Check for remaining issues
echo "📊 Remaining vulnerabilities:"
npm audit --audit-level=moderate

echo ""
echo "✅ Security fixes complete!"
echo ""
echo "⚠️  Manual fixes still needed:"
echo "   1. Review innerHTML usage (see SECURITY_AUDIT_REPORT.md)"
echo "   2. Move session data from localStorage to httpOnly cookies"
echo "   3. Add input sanitization"
echo "   4. Consider updating Vercel if breaking changes are acceptable"

