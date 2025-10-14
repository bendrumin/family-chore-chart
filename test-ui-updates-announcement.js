#!/usr/bin/env node

/**
 * Test script for UI Updates Newsletter
 * Sends the newsletter to just your email address for testing
 */

const sgMail = require('@sendgrid/mail');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

if (!SENDGRID_API_KEY) {
    console.error('❌ Error: SENDGRID_API_KEY environment variable not set');
    process.exit(1);
}

sgMail.setApiKey(SENDGRID_API_KEY);

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
        const msg = {
            to: testEmail,
            from: {
                email: 'hi@chorestar.app',
                name: 'ChoreStar Team'
            },
            replyTo: 'hi@chorestar.app',
            subject: '🎨 [TEST] ChoreStar\'s Massive UI Upgrade is Here! ✨',
            html: loadTemplate(),
        };

        const result = await sgMail.send(msg);
        console.log(`✅ Test email sent successfully! (Status: ${result[0].statusCode})`);
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

