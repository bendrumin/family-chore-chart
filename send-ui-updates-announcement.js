#!/usr/bin/env node

/**
 * ChoreStar UI Updates Newsletter
 * 
 * This script sends the UI updates announcement to your active users.
 * 
 * Usage:
 * 1. Install dependencies: npm install resend
 * 2. Set your Resend API key: export RESEND_API_KEY="your_api_key"
 * 3. Run: node send-ui-updates-announcement.js
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

// Newsletter configuration
const NEWSLETTER_CONFIG = {
    subject: '🎨 ChoreStar\'s Massive UI Upgrade is Here! ✨',
    from: 'ChoreStar <hi@chorestar.app>',
    replyTo: 'hi@chorestar.app',
};

// Your active users (exported from Supabase - 35 total users!)
const ACTIVE_USERS = [
    'sathish.jeyam@gmail.com',
    'kimiwaro1@gmail.com',
    'lyndsiesal@yahoo.com',
    'latoyargreen@hotmail.com',
    'jemmarae87@googlemail.com',
    'brandy.williams54@yahoo.com',
    'bjt7@att.net',
    'thewashingt0nhouse1@gmail.com',
    'salefis224@dawhe.com',
    'candaceriddell@yahoo.com',
    'michelle.e430@mail.com',
    'shannah.lynn.home@gmail.com',
    'm.ashley7914@gmail.com',
    'keithkassandra094@gmail.com',
    'jayce@jintra.io',
    'yvettemz1985@gmail.com',
    'tone.macneil@gmail.com',
    'nicole_stowe@yahoo.com',
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
];

// Load the UI updates template
function loadNewsletterTemplate() {
    try {
        const templatePath = path.join(__dirname, 'email-templates', 'ui-updates-announcement.html');
        const template = fs.readFileSync(templatePath, 'utf8');
        return template;
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

        console.log(`✅ UI updates sent to ${userEmail} (ID: ${result.data?.id || 'N/A'})`);
        return { success: true, email: userEmail, id: result.data?.id };
    } catch (error) {
        console.error(`❌ Failed to send to ${userEmail}:`, error.message);
        return { success: false, email: userEmail, error: error.message };
    }
}

// Send newsletter to all users
async function sendNewsletterToAllUsers() {
    console.log('🎨 Starting ChoreStar UI Updates Campaign...\n');
    console.log(`📧 Sending to ${ACTIVE_USERS.length} users\n`);
    
    const results = [];
    let successCount = 0;
    let failureCount = 0;
    
    // Send emails with a small delay to avoid rate limiting
    for (let i = 0; i < ACTIVE_USERS.length; i++) {
        const userEmail = ACTIVE_USERS[i];
        console.log(`📤 [${i + 1}/${ACTIVE_USERS.length}] Sending to ${userEmail}...`);
        
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
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 UI Updates Campaign Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failureCount}`);
    console.log(`📧 Total: ${ACTIVE_USERS.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (failureCount > 0) {
        console.log('\n❌ Failed emails:');
        results.filter(r => !r.success).forEach(r => {
            console.log(`   - ${r.email}: ${r.error}`);
        });
    }
    
    console.log('\n🎉 UI updates campaign completed!');
    console.log(`\n✨ Users can now see all the new features at chorestar.app!`);
}

// Main execution
async function main() {
    try {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎨 ChoreStar UI Updates Announcement');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        // Validate configuration
        if (ACTIVE_USERS.length === 0) {
            console.error('❌ Error: No users in ACTIVE_USERS array');
            console.log('Please add user emails to the ACTIVE_USERS array in this script');
            process.exit(1);
        }
        
        // Show configuration
        console.log('📋 Configuration:');
        console.log(`   Subject: ${NEWSLETTER_CONFIG.subject}`);
        console.log(`   From: ${NEWSLETTER_CONFIG.from}`);
        console.log(`   Reply To: ${NEWSLETTER_CONFIG.replyTo}`);
        console.log(`   Recipients: ${ACTIVE_USERS.length} users\n`);
        
        // Confirmation prompt
        console.log('⚠️  You are about to send the UI updates announcement to all users.');
        console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Send newsletters
        await sendNewsletterToAllUsers();
        
    } catch (error) {
        if (error.message === 'User cancelled') {
            console.log('\n❌ Newsletter sending cancelled by user');
            process.exit(0);
        }
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

