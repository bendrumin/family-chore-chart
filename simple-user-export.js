#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Supabase credentials not set');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function exportUsers() {
    try {
        console.log('🔍 Trying to get user data from Supabase...\n');
        
        // Try different approaches to get user data
        
        console.log('📋 Method 1: Check profiles table...');
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*');
        
        if (profilesError) {
            console.log('❌ Profiles error:', profilesError.message);
        } else {
            console.log(`✅ Found ${profiles.length} profiles`);
            if (profiles.length > 0) {
                console.log('Sample profile:', profiles[0]);
            }
        }
        
        console.log('\n📋 Method 2: Check if there are any public tables...');
        try {
            const { data: tables, error: tablesError } = await supabase
                .rpc('get_tables');
            
            if (tablesError) {
                console.log('❌ Could not get tables list');
            } else {
                console.log('✅ Available tables:', tables);
            }
        } catch (e) {
            console.log('❌ Tables function not available');
        }
        
        console.log('\n📋 Method 3: Try to access auth.users with service role...');
        console.log('Note: This might not work with anon key');
        
        // If we can't get users automatically, provide manual instructions
        console.log('\n📋 Manual Export Instructions:');
        console.log('1. Go to your Supabase dashboard');
        console.log('2. Navigate to Authentication → Users');
        console.log('3. Look for users with confirmed emails');
        console.log('4. Copy their email addresses');
        console.log('5. Add them to send-newsletter.js ACTIVE_USERS array');
        
        // If we found profiles, try to extract emails
        if (profiles && profiles.length > 0) {
            console.log('\n📧 Emails found in profiles:');
            const emails = profiles
                .filter(p => p.email)
                .map(p => p.email);
            
            if (emails.length > 0) {
                emails.forEach((email, index) => {
                    console.log(`${index + 1}. ${email}`);
                });
                
                console.log('\n📋 Copy these emails to your newsletter script!');
            } else {
                console.log('No emails found in profiles');
            }
        }
        
    } catch (error) {
        console.error('❌ Export failed:', error.message);
        console.log('\n📋 Manual Export Instructions:');
        console.log('1. Go to your Supabase dashboard');
        console.log('2. Navigate to Authentication → Users');
        console.log('3. Look for users with confirmed emails');
        console.log('4. Copy their email addresses');
        console.log('5. Add them to send-newsletter.js ACTIVE_USERS array');
    }
}

exportUsers();
