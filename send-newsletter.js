#!/usr/bin/env node

/**
 * ChoreStar Newsletter Sender
 * 
 * This script sends the newsletter to your active users via Resend.
 * 
 * Usage:
 * 1. Install dependencies: npm install resend
 * 2. Set your Resend API key: export RESEND_API_KEY="your_api_key"
 * 3. Update the users array with your actual user emails
 * 4. Run: node send-newsletter.js
 */

const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');

// Load your Resend API key
const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!RESEND_API_KEY) {
    console.error('❌ Error: RESEND_API_KEY environment variable not set');
    console.log('Please set it with: export RESEND_API_KEY="your_api_key"');
    process.exit(1);
}

// Initialize Resend
const resend = new Resend(RESEND_API_KEY);

// Newsletter configuration
const NEWSLETTER_CONFIG = {
    subject: 'ChoreStar: New Icon Picker, Demo System & Major Fixes! 🎨✨',
    from: 'ChoreStar <hi@chorestar.app>',
    replyTo: 'hi@chorestar.app'
};

// Your active users (replace with your actual user list)
const ACTIVE_USERS = [
// Active ChoreStar users (auto-updated)
    'korinnayazaryan@gmail.com',
    'castrocorrea@yahoo.com',
    'laurenashleyrussell@gmail.com',
    'bushongecko@gmail.com',
    'breannaacy@gmail.com',
    'bmorales_24@outlook.com',
    'schafferdaisha@gmail.com',
    'jreger0627@gmail.com',
    'Kaylabrianne28@gmail.com',
    'cierrapenwell@ymail.com',
    'noreenc1986@gmail.com',
    'mmeganmarie21@gmail.com',
    'dejusainz@gmail.com',
    'rgaillard6@gmail.com',
    'tejurockz@gmail.com',
    'courtney.mcnallan@gmail.com',
    'bsiegel13@gmail.com',

    // Add any additional users manually below:
    // 'additional@example.com',
];

// Load the newsletter HTML template
function loadNewsletterTemplate() {
    try {
        const templatePath = path.join(__dirname, 'email-templates', 'newsletter-update.html');
        return fs.readFileSync(templatePath, 'utf8');
    } catch (error) {
        console.error('❌ Error loading newsletter template:', error.message);
        process.exit(1);
    }
}

// Send newsletter to a single user
async function sendNewsletterToUser(userEmail, userName = 'Valued User') {
    try {
        const result = await resend.emails.send({
            from: NEWSLETTER_CONFIG.from,
            to: userEmail,
            reply_to: NEWSLETTER_CONFIG.replyTo,
            subject: NEWSLETTER_CONFIG.subject,
            html: loadNewsletterTemplate()
        });

        console.log(`✅ Newsletter sent to ${userEmail} (ID: ${result.data?.id || 'N/A'})`);
        return { success: true, email: userEmail, id: result.data?.id };
    } catch (error) {
        console.error(`❌ Failed to send to ${userEmail}:`, error.message);
        return { success: false, email: userEmail, error: error.message };
    }
}

// Send newsletter to all users
async function sendNewsletterToAllUsers() {
    console.log('🚀 Starting ChoreStar Newsletter Campaign...\n');
    console.log(`📧 Sending to ${ACTIVE_USERS.length} users\n`);
    
    const results = [];
    let successCount = 0;
    let failureCount = 0;
    
    // Send emails with a small delay to avoid rate limiting
    for (let i = 0; i < ACTIVE_USERS.length; i++) {
        const userEmail = ACTIVE_USERS[i];
        console.log(`📤 Sending to ${userEmail}...`);
        
        const result = await sendNewsletterToUser(userEmail);
        results.push(result);
        
        if (result.success) {
            successCount++;
        } else {
            failureCount++;
        }
        
        // Add a small delay between sends (Resend rate limit: ~10 emails/second)
        if (i < ACTIVE_USERS.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        console.log(''); // Empty line for readability
    }
    
    // Summary
    console.log('📊 Newsletter Campaign Summary:');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failureCount}`);
    console.log(`📧 Total: ${ACTIVE_USERS.length}`);
    
    if (failureCount > 0) {
        console.log('\n❌ Failed emails:');
        results.filter(r => !r.success).forEach(r => {
            console.log(`   - ${r.email}: ${r.error}`);
        });
    }
    
    console.log('\n🎉 Newsletter campaign completed!');
}

// Main execution
async function main() {
    try {
        // Validate configuration
        if (ACTIVE_USERS.length === 0) {
            console.error('❌ Error: No users in ACTIVE_USERS array');
            console.log('Please add user emails to the ACTIVE_USERS array in this script');
            process.exit(1);
        }
        
        // Test Resend connection
        console.log('🔍 Testing Resend connection...');
        await resend.emails.send({
            from: NEWSLETTER_CONFIG.from,
            to: 'test@example.com',
            subject: 'Test Connection',
            html: '<p>This is a test email to verify Resend is working.</p>'
        });
        console.log('✅ Resend connection successful!\n');
        
        // Send newsletters
        await sendNewsletterToAllUsers();
        
    } catch (error) {
        console.error('❌ Fatal error:', error.message);
        process.exit(1);
    }
}

// Run if this script is executed directly
if (require.main === module) {
    main();
}

module.exports = {
    sendNewsletterToUser,
    sendNewsletterToAllUsers,
    loadNewsletterTemplate
};
