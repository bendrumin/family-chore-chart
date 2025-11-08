#!/usr/bin/env node

/**
 * Test script for UI Updates Newsletter
 * Sends the newsletter to just your email address for testing
 */

const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!RESEND_API_KEY) {
    console.error('❌ Error: RESEND_API_KEY environment variable not set');
    process.exit(1);
}

const resend = new Resend(RESEND_API_KEY);

// Load template
function loadTemplate() {
    const templatePath = path.join(__dirname, 'email-templates', 'ui-updates-announcement.html');
    return fs.readFileSync(templatePath, 'utf8');
}

// Send test email
async function sendTestEmail() {
    const testEmail = 'bsiegel13@gmail.com'; // Your email
    
    console.log('🧪 Testing UI Updates Newsletter...\n');
    console.log(`📧 Sending test email to: ${testEmail}\n`);
    
    try {
        const result = await resend.emails.send({
            from: 'ChoreStar <hi@chorestar.app>',
            to: testEmail,
            reply_to: 'hi@chorestar.app',
            subject: '🎨 [TEST] ChoreStar\'s Massive UI Upgrade is Here! ✨',
            html: loadTemplate()
        });
        
        console.log(`✅ Test email sent successfully! (ID: ${result.data?.id || 'N/A'})`);
        console.log(`\n📬 Check your inbox at ${testEmail}`);
        console.log(`\n💡 If it looks good, run: node send-ui-updates-announcement.js`);
    } catch (error) {
        console.error('❌ Failed to send test email:', error.message);
        if (error.response) {
            console.error('Response:', error.response.body);
        }
    }
}

sendTestEmail();

