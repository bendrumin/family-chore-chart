#!/usr/bin/env node

/**
 * ChoreStar User Export Script
 * 
 * This script helps you export user data for newsletter campaigns.
 * You can use this to get a list of active users from your database.
 * 
 * Usage:
 * 1. Update the database connection details below
 * 2. Run: node export-users.js
 */

require('dotenv').config({ path: '.env.local' });

// Database connection (update these with your actual database details)
const DATABASE_CONFIG = {
    // For Supabase (recommended)
    supabase: {
        url: process.env.SUPABASE_URL || 'your_supabase_url',
        key: process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || 'your_supabase_key'
    },
    
    // Alternative: Direct PostgreSQL connection
    postgres: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'chorestar',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || ''
    }
};

// Example queries to get user data
const USER_QUERIES = {
    // Get all users with basic info
    allUsers: `
        SELECT 
            id,
            email,
            created_at,
            last_sign_in_at,
            family_id
        FROM auth.users 
        WHERE email_confirmed_at IS NOT NULL
        ORDER BY created_at DESC
    `,
    
    // Get active users (signed in recently)
    activeUsers: `
        SELECT 
            u.id,
            u.email,
            u.created_at,
            u.last_sign_in_at,
            u.family_id
        FROM auth.users u
        WHERE u.email_confirmed_at IS NOT NULL
        AND u.last_sign_in_at > NOW() - INTERVAL '30 days'
        ORDER BY u.last_sign_in_at DESC
    `,
    
    // Get premium users
    premiumUsers: `
        SELECT 
            u.id,
            u.email,
            u.created_at,
            u.last_sign_in_at,
            u.family_id
        FROM auth.users u
        JOIN profiles p ON u.id = p.id
        WHERE u.email_confirmed_at IS NOT NULL
        AND p.subscription_status = 'active'
        ORDER BY u.last_sign_in_at DESC
    `,
    
    // Get users by family
    usersByFamily: `
        SELECT 
            u.id,
            u.email,
            u.created_at,
            u.last_sign_in_at,
            u.family_id,
            f.name as family_name
        FROM auth.users u
        LEFT JOIN families f ON u.family_id = f.id
        WHERE u.email_confirmed_at IS NOT NULL
        ORDER BY f.name, u.created_at
    `
};

// Export functions
function exportToCSV(data, filename) {
    if (!data || data.length === 0) {
        console.log('No data to export');
        return;
    }
    
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => 
            headers.map(header => {
                const value = row[header];
                // Escape commas and quotes in CSV
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',')
        )
    ].join('\n');
    
    const fs = require('fs');
    fs.writeFileSync(filename, csvContent);
    console.log(`✅ Data exported to ${filename}`);
}

function exportToJSON(data, filename) {
    if (!data || data.length === 0) {
        console.log('No data to export');
        return;
    }
    
    const fs = require('fs');
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    console.log(`✅ Data exported to ${filename}`);
}

// Example usage with Supabase
async function exportUsersWithSupabase() {
    try {
        const { createClient } = require('@supabase/supabase-js');
        
        if (!DATABASE_CONFIG.supabase.url || !DATABASE_CONFIG.supabase.key) {
            console.log('❌ Supabase credentials not configured');
            console.log('Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables');
            return;
        }
        
        const supabase = createClient(
            DATABASE_CONFIG.supabase.url,
            DATABASE_CONFIG.supabase.key
        );
        
        console.log('🔍 Fetching users from Supabase...');
        
        // Get all profiles (these are the actual users)
        const { data: users, error } = await supabase
            .from('profiles')
            .select('id, email, family_name, created_at')
            .order('created_at', { ascending: false });
        
        if (error) {
            throw error;
        }
        
        console.log(`✅ Found ${users.length} users`);
        
        // Export to different formats
        exportToCSV(users, 'chorestar-users.csv');
        exportToJSON(users, 'chorestar-users.json');
        
        // Show email list for newsletter
        console.log('\n📧 Email addresses for newsletter:');
        users.forEach((user, index) => {
            console.log(`${index + 1}. ${user.email}`);
        });
        
        // Copy to clipboard (macOS)
        const emails = users.map(u => u.email).join(', ');
        const { exec } = require('child_process');
        exec(`echo "${emails}" | pbcopy`, (error) => {
            if (!error) {
                console.log('\n📋 Email list copied to clipboard!');
            }
        });
        
    } catch (error) {
        console.error('❌ Error exporting users:', error.message);
    }
}

// Example usage with direct PostgreSQL
async function exportUsersWithPostgres() {
    try {
        const { Client } = require('pg');
        
        const client = new Client(DATABASE_CONFIG.postgres);
        await client.connect();
        
        console.log('🔍 Fetching users from PostgreSQL...');
        
        const result = await client.query(USER_QUERIES.allUsers);
        const users = result.rows;
        
        console.log(`✅ Found ${users.length} users`);
        
        // Export to different formats
        exportToCSV(users, 'chorestar-users.csv');
        exportToJSON(users, 'chorestar-users.json');
        
        await client.end();
        
    } catch (error) {
        console.error('❌ Error exporting users:', error.message);
    }
}

// Main execution
async function main() {
    console.log('🚀 ChoreStar User Export Tool\n');
    
    // Try Supabase first (recommended)
    try {
        await exportUsersWithSupabase();
    } catch (error) {
        console.log('Supabase export failed, trying PostgreSQL...');
        try {
            await exportUsersWithPostgres();
        } catch (pgError) {
            console.error('❌ Both export methods failed');
            console.error('Supabase error:', error.message);
            console.error('PostgreSQL error:', pgError.message);
            
            console.log('\n📋 Manual Export Instructions:');
            console.log('1. Go to your Supabase dashboard');
            console.log('2. Navigate to Table Editor > auth.users');
            console.log('3. Filter by email_confirmed_at IS NOT NULL');
            console.log('4. Export the results');
            console.log('5. Copy the email addresses for your newsletter');
        }
    }
}

// Run if this script is executed directly
if (require.main === module) {
    main();
}

module.exports = {
    exportUsersWithSupabase,
    exportUsersWithPostgres,
    exportToCSV,
    exportToJSON
};
