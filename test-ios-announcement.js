#!/usr/bin/env node

/**
 * Quick test send for iOS announcement
 * Sends only to bsiegel13@gmail.com for preview
 */

const sgMail = require('@sendgrid/mail');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Load your SendGrid API key
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

if (!SENDGRID_API_KEY) {
    console.error('❌ Error: SENDGRID_API_KEY environment variable not set');
    console.log('Make sure .env.local file exists with SENDGRID_API_KEY');
    process.exit(1);
}

// Initialize SendGrid
sgMail.setApiKey(SENDGRID_API_KEY);

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
    
    const msg = {
        to: 'bsiegel13@gmail.com',
        from: {
            email: 'hi@chorestar.app',
            name: 'ChoreStar Team'
        },
        replyTo: 'hi@chorestar.app',
        subject: '🎉 ChoreStar is Coming to iOS! Your Chore Chart, Now in Your Pocket 📱',
        html: loadNewsletterTemplate(),
        trackingSettings: {
            clickTracking: { enable: true, enableText: true },
            openTracking: { enable: true }
        }
    };

    try {
        const result = await sgMail.send(msg);
        console.log('✅ Test email sent successfully!');
        console.log(`   To: bsiegel13@gmail.com`);
        console.log(`   Status: ${result[0].statusCode}`);
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

