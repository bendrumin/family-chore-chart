#!/usr/bin/env node

/**
 * Quick test send for iOS announcement
 * Sends only to bsiegel13@gmail.com for preview
 */

const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Load your Resend API key
const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!RESEND_API_KEY) {
    console.error('❌ Error: RESEND_API_KEY environment variable not set');
    console.log('Make sure .env.local file exists with RESEND_API_KEY');
    process.exit(1);
}

// Initialize Resend
const resend = new Resend(RESEND_API_KEY);

// Load the iOS announcement template
function loadNewsletterTemplate() {
    const templatePath = path.join(__dirname, 'email-templates', 'ios-app-announcement.html');
    let template = fs.readFileSync(templatePath, 'utf8');
    
    // Update to use reply for beta access
    template = template.replace(
        'href="https://testflight.apple.com/join/your-testflight-link"',
        'href="mailto:hi@chorestar.app?subject=iOS Beta Access Request"'
    );
    template = template.replace(
        'Get Early Access',
        'Request Beta Access'
    );
    
    return template;
}

async function sendTestEmail() {
    console.log('📱 Sending iOS Announcement Test Email...\n');
    
    try {
        const result = await resend.emails.send({
            from: 'ChoreStar <hi@chorestar.app>',
            to: 'bsiegel13@gmail.com',
            reply_to: 'hi@chorestar.app',
            subject: '🎉 ChoreStar is Coming to iOS! Your Chore Chart, Now in Your Pocket 📱',
            html: loadNewsletterTemplate()
        });
        
        console.log('✅ Test email sent successfully!');
        console.log(`   To: bsiegel13@gmail.com`);
        console.log(`   ID: ${result.data?.id || 'N/A'}`);
        console.log('\n📬 Check your inbox!');
    } catch (error) {
        console.error('❌ Failed to send test email:', error.message);
        if (error.response) {
            console.error('   Details:', error.response.body);
        }
        process.exit(1);
    }
}

sendTestEmail();

