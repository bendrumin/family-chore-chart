#!/usr/bin/env node

/**
 * ChoreStar Newsletter Update Tool
 * 
 * This script makes it easy to update and send newsletters whenever you make changes.
 * 
 * Usage:
 * 1. Update the newsletter template in email-templates/
 * 2. Update the subject line below
 * 3. Run: node update-newsletter.js
 */

const fs = require('fs');
const path = require('path');

// Newsletter configuration - UPDATE THESE WHEN YOU MAKE CHANGES
const NEWSLETTER_CONFIG = {
    subject: 'ChoreStar Just Got a Major Upgrade! 🚀', // UPDATE THIS
    template: 'newsletter-update.html', // UPDATE THIS if you create new templates
    description: 'Major bug fixes, new features, and performance improvements' // UPDATE THIS
};

// Available newsletter templates
const AVAILABLE_TEMPLATES = [
    'newsletter-update.html',
    'newsletter-features.html',
    'newsletter-seasonal.html',
    'newsletter-community.html'
];

function showCurrentStatus() {
    console.log('📧 ChoreStar Newsletter Update Tool\n');
    
    // Check current newsletter script
    try {
        const newsletterContent = fs.readFileSync('send-newsletter.js', 'utf8');
        const userMatch = newsletterContent.match(/const ACTIVE_USERS = \[([\s\S]*?)\];/);
        
        if (userMatch) {
            const users = userMatch[1].match(/'[^']+@[^']+'/g) || [];
            console.log(`👥 Current users: ${users.length} email addresses`);
        }
    } catch (error) {
        console.log('❌ Could not read newsletter script');
    }
    
    // Check available templates
    console.log('\n📋 Available newsletter templates:');
    AVAILABLE_TEMPLATES.forEach(template => {
        const exists = fs.existsSync(path.join('email-templates', template));
        const status = exists ? '✅' : '❌';
        console.log(`  ${status} ${template}`);
    });
    
    console.log('\n🎯 Current newsletter config:');
    console.log(`  Subject: ${NEWSLETTER_CONFIG.subject}`);
    console.log(`  Template: ${NEWSLETTER_CONFIG.template}`);
    console.log(`  Description: ${NEWSLETTER_CONFIG.description}`);
}

function updateNewsletterScript() {
    try {
        const newsletterPath = 'send-newsletter.js';
        let content = fs.readFileSync(newsletterPath, 'utf8');
        
        // Update subject line
        const subjectRegex = /subject: '[^']*'/;
        const newSubject = `subject: '${NEWSLETTER_CONFIG.subject}'`;
        content = content.replace(subjectRegex, newSubject);
        
        // Update description comment
        const descRegex = /\/\/ ChoreStar Just Got a Major Upgrade! 🚀/;
        const newDesc = `// ${NEWSLETTER_CONFIG.description}`;
        content = content.replace(descRegex, newDesc);
        
        fs.writeFileSync(newsletterPath, content);
        console.log('✅ Newsletter script updated with new subject and description');
        
    } catch (error) {
        console.error('❌ Failed to update newsletter script:', error.message);
    }
}

function createNewTemplate(templateName) {
    const templatePath = path.join('email-templates', templateName);
    
    if (fs.existsSync(templatePath)) {
        console.log(`⚠️  Template ${templateName} already exists`);
        return;
    }
    
    const baseTemplate = fs.readFileSync(path.join('email-templates', 'newsletter-update.html'), 'utf8');
    
    // Create a new template based on the current one
    const newTemplate = baseTemplate
        .replace(/ChoreStar Just Got a Major Upgrade!/g, 'ChoreStar Newsletter')
        .replace(/Thanks to your feedback, we've made ChoreStar much better/g, 'Stay updated with the latest ChoreStar news');
    
    fs.writeFileSync(templatePath, newTemplate);
    console.log(`✅ Created new template: ${templateName}`);
}

function showUpdateInstructions() {
    console.log('\n🔄 How to Update Your Newsletter:\n');
    
    console.log('1. 📝 Update Content:');
    console.log('   - Edit email-templates/newsletter-update.html');
    console.log('   - Change colors, text, features, etc.');
    console.log('   - Add new sections or remove old ones');
    
    console.log('\n2. 🏷️  Update Subject Line:');
    console.log('   - Change NEWSLETTER_CONFIG.subject above');
    console.log('   - Run: node update-newsletter.js');
    
    console.log('\n3. 👥 Update User List:');
    console.log('   - Run: node admin-export-users.js');
    console.log('   - This auto-updates when new users sign up');
    
    console.log('\n4. 📤 Send Newsletter:');
    console.log('   - Run: node send-newsletter.js');
    console.log('   - Or run: node update-newsletter.js --send');
    
    console.log('\n5. 🎨 Create New Templates:');
    console.log('   - Run: node update-newsletter.js --new-template seasonal');
    console.log('   - Creates email-templates/newsletter-seasonal.html');
}

function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        showUpdateInstructions();
        return;
    }
    
    if (args.includes('--new-template')) {
        const templateName = args[args.indexOf('--new-template') + 1];
        if (templateName) {
            createNewTemplate(`newsletter-${templateName}.html`);
        } else {
            console.log('❌ Please specify template name: --new-template seasonal');
        }
        return;
    }
    
    if (args.includes('--send')) {
        console.log('📤 Sending newsletter...');
        const { exec } = require('child_process');
        exec('node send-newsletter.js', (error, stdout, stderr) => {
            if (error) {
                console.error('❌ Newsletter send failed:', error);
                return;
            }
            console.log('✅ Newsletter sent successfully!');
            console.log(stdout);
        });
        return;
    }
    
    // Default: show status and update script
    showCurrentStatus();
    updateNewsletterScript();
    
    console.log('\n🎯 Newsletter system ready for updates!');
    console.log('Run: node update-newsletter.js --help for more options');
}

main();
