#!/usr/bin/env node

/**
 * ChoreStar Admin User Export Script
 * 
 * This script uses the service role key to export user data for newsletter purposes.
 * IMPORTANT: Keep your service role key secure and never commit it to version control!
 * 
 * Usage:
 * 1. Set your service role key: export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
 * 2. Run: node admin-export-users.js
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kyzgmhcismrnjlnddyyl.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing required environment variable');
    console.log('Please set your service role key:');
    console.log('  export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"');
    console.log('');
    console.log('✅ Supabase URL is already set:', SUPABASE_URL);
    console.log('⚠️  WARNING: Service role key has admin permissions - keep it secure!');
    process.exit(1);
}

// Create client with service role key (admin permissions)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function exportUsersAdmin() {
    try {
        console.log('🔐 Admin User Export Tool (Service Role)\n');
        console.log('📡 Using Supabase URL:', SUPABASE_URL);
        console.log('⚠️  Using service role key - this bypasses RLS policies\n');
        
        // Get all profiles with service role access
        console.log('📋 Fetching user profiles...');
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (profilesError) {
            throw new Error(`Profiles error: ${profilesError.message}`);
        }
        
        console.log(`✅ Found ${profiles.length} user profiles\n`);
        
        if (profiles.length === 0) {
            console.log('📝 No user profiles found. This might mean:');
            console.log('   - Users haven\'t completed their profile setup');
            console.log('   - Profiles are stored in a different table');
            console.log('   - Users are stored in auth.users only');
            return;
        }
        
        // Display user information
        console.log('👥 User Profiles:');
        profiles.forEach((profile, index) => {
            console.log(`${index + 1}. ID: ${profile.id}`);
            if (profile.email) console.log(`   Email: ${profile.email}`);
            if (profile.full_name) console.log(`   Name: ${profile.full_name}`);
            if (profile.created_at) console.log(`   Created: ${profile.created_at}`);
            if (profile.family_id) console.log(`   Family ID: ${profile.family_id}`);
            console.log('');
        });
        
        // Extract emails for newsletter
        const emails = profiles
            .filter(p => p.email && p.email.trim())
            .map(p => p.email.trim());
        
        if (emails.length > 0) {
            console.log('📧 Emails for Newsletter:');
            emails.forEach((email, index) => {
                console.log(`${index + 1}. ${email}`);
            });
            
            // Copy to clipboard (macOS)
            const emailList = emails.join(', ');
            const { exec } = require('child_process');
            exec(`echo "${emailList}" | pbcopy`, (error) => {
                if (!error) {
                    console.log('\n📋 Email list copied to clipboard!');
                }
            });
            
            // Export to files
            const fs = require('fs');
            
            // Export to JSON
            fs.writeFileSync('chorestar-users.json', JSON.stringify(profiles, null, 2));
            console.log('💾 User data exported to: chorestar-users.json');
            
            // Export emails to CSV
            const csvContent = ['email\n', ...emails.map(email => `${email}\n`)].join('');
            fs.writeFileSync('chorestar-emails.csv', csvContent);
            console.log('💾 Email list exported to: chorestar-emails.csv');
            
            // Update newsletter script
            updateNewsletterScript(emails);
            
        } else {
            console.log('❌ No valid emails found in profiles');
            console.log('This might mean users haven\'t set up their email addresses');
        }
        
        // Try to get auth.users data as well
        console.log('\n🔍 Note: auth.users table is in protected schema');
        console.log('We\'ll work with the profiles table data instead');
        
        console.log('\n🎯 Next Steps:');
        if (emails.length > 0) {
            console.log('1. ✅ User emails exported successfully');
            console.log('2. 📧 Newsletter script updated automatically');
            console.log('3. 🚀 Ready to send newsletters!');
            console.log('');
            console.log('📧 To send newsletter to all users:');
            console.log('   node send-newsletter.js');
        } else {
            console.log('1. ❌ No user emails found in profiles');
            console.log('2. 🔍 Check if users have completed profile setup');
            console.log('3. 📋 Manual export from dashboard might be needed');
        }
        
    } catch (error) {
        console.error('❌ Admin export failed:', error.message);
        console.log('\n🔧 Troubleshooting:');
        console.log('1. Check if service role key is correct');
        console.log('2. Verify Supabase URL is correct');
        console.log('3. Ensure service role key has proper permissions');
    }
}

function updateNewsletterScript(emails) {
    try {
        const fs = require('fs');
        const newsletterPath = 'send-newsletter.js';
        
        if (!fs.existsSync(newsletterPath)) {
            console.log('❌ Newsletter script not found');
            return;
        }
        
        let content = fs.readFileSync(newsletterPath, 'utf8');
        
        // Create the new ACTIVE_USERS array
        const newUsersArray = [
            '// Active ChoreStar users (auto-updated)',
            ...emails.map(email => `    '${email}',`),
            '',
            '    // Add any additional users manually below:',
            '    // \'additional@example.com\','
        ].join('\n');
        
        // Replace the existing ACTIVE_USERS array
        const regex = /const ACTIVE_USERS = \[[\s\S]*?\];/;
        const replacement = `const ACTIVE_USERS = [\n${newUsersArray}\n];`;
        
        if (content.match(regex)) {
            content = content.replace(regex, replacement);
            fs.writeFileSync(newsletterPath, content);
            console.log('✅ Newsletter script updated with user emails!');
            console.log('📧 You can now run: node send-newsletter.js');
        } else {
            console.log('⚠️  Could not update newsletter script automatically');
            console.log('Please manually add the emails to send-newsletter.js');
        }
        
    } catch (error) {
        console.error('❌ Failed to update newsletter script:', error.message);
    }
}

// Run the admin export
exportUsersAdmin();
