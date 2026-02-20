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
    subject: 'New in ChoreStar: Kid Zone, Routines & More 🌟',
    from: 'ChoreStar <hi@chorestar.app>',
    replyTo: 'hi@chorestar.app',
    template: 'newsletter-react-launch.html' // NEW: Updated version launch
};

// Your active users (replace with your actual user list)
const ACTIVE_USERS = [
// Active ChoreStar users (auto-updated)
    'latashamarie455@gmail.com',
    'bsiegel13+2@gmail.com',
    'christine.hazel.murphy@gmail.com',
    'claresse.sheppard@gmail.com',
    'danielle@writersofthelostart.co.uk',
    'shelbibolton@gmail.com',
    'nicholemckenzie3@gmail.com',
    'jamiehoette@gmail.com',
    'dannerysramos43@gmail.com',
    'lilribbit2017@gmail.com',
    'indiracamdzic@aol.com',
    'psmak4@gmail.com',
    'bels2k@yahoo.com',
    'toriwisener@gmail.com',
    'segala0294@gmail.com',
    'm.spinks90@gmail.com',
    'leannemorton86@hotmail.com',
    'teganmarie0724@gmail.com',
    'madtail.79@gmail.com',
    's_yousif22@yahoo.com',
    'waitpingafarm@hotmail.com',
    'darrenmfstuart@gmail.com',
    'kacylaneselby@gmail.com',
    'gallantbrooke99@yahoo.com',
    'manderson130@gmail.com',
    'breweramandajonathon@yahoo.com',
    'vlphotography93@gmail.com',
    'ashpuga@gmail.com',
    'kenli.brown@icloud.com',
    'yaliretamar@gmail.com',
    'sunshne52105@aol.com',
    'jimeneza.mayra25@icloud.com',
    'catherinejones4513@gmail.com',
    'leannetroutmanjane39t@gmail.com',
    'scanner@probe.ly',
    'caitlinbeers104@gmail.com',
    'whitneyjeanewilson@outlook.com',
    'lewis4business@gmail.com',
    'greer.abigail@gmail.com',
    'kayla.lapan04@gmail.com',
    'fleurlou@free.fr',
    'mrivas112@hotmail.com',
    'clarahauptmeier0@gmail.com',
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

    // Add any additional users manually below:
    // 'additional@example.com',
];

// Load the newsletter HTML template
function loadNewsletterTemplate() {
    try {
        const templateName = NEWSLETTER_CONFIG.template || 'newsletter-update.html';
        const templatePath = path.join(__dirname, 'email-templates', templateName);
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
