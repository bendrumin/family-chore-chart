#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Supabase credentials not set');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkDatabase() {
    try {
        console.log('🔍 Checking Supabase database structure...\n');
        
        // Try to get user profiles
        console.log('📋 Checking profiles table...');
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .limit(5);
        
        if (profilesError) {
            console.log('❌ Profiles table error:', profilesError.message);
        } else {
            console.log('✅ Profiles table found, sample data:');
            console.log(profiles);
        }
        
        console.log('\n📋 Checking families table...');
        const { data: families, error: familiesError } = await supabase
            .from('families')
            .select('*')
            .limit(5);
        
        if (familiesError) {
            console.log('❌ Families table error:', familiesError.message);
        } else {
            console.log('✅ Families table found, sample data:');
            console.log(families);
        }
        
        // Try to get auth users (this might not work with anon key)
        console.log('\n📋 Checking auth.users (might fail with anon key)...');
        try {
            const { data: authUsers, error: authError } = await supabase
                .from('auth.users')
                .select('*')
                .limit(5);
            
            if (authError) {
                console.log('❌ Auth users error:', authError.message);
            } else {
                console.log('✅ Auth users found, sample data:');
                console.log(authUsers);
            }
        } catch (e) {
            console.log('❌ Auth users access failed:', e.message);
        }
        
        // List all tables in public schema
        console.log('\n📋 Listing all tables in public schema...');
        const { data: tables, error: tablesError } = await supabase
            .rpc('get_tables');
        
        if (tablesError) {
            console.log('❌ Could not list tables:', tablesError.message);
            console.log('Trying alternative approach...');
            
            // Try to query information_schema
            const { data: schemaInfo, error: schemaError } = await supabase
                .from('information_schema.tables')
                .select('table_name, table_schema')
                .eq('table_schema', 'public');
            
            if (schemaError) {
                console.log('❌ Schema info error:', schemaError.message);
            } else {
                console.log('✅ Public schema tables:');
                schemaInfo.forEach(table => {
                    console.log(`  - ${table.table_name}`);
                });
            }
        } else {
            console.log('✅ Tables found:', tables);
        }
        
    } catch (error) {
        console.error('❌ Database check failed:', error.message);
    }
}

checkDatabase();
