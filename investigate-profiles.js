#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Supabase credentials not set');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function investigateProfiles() {
    try {
        console.log('🔍 Investigating profiles table in detail...\n');
        
        // Try different approaches to access profiles
        
        console.log('📋 Method 1: Basic profiles query...');
        const { data: profiles1, error: error1 } = await supabase
            .from('profiles')
            .select('*');
        
        console.log('Result 1:', { data: profiles1, error: error1 });
        
        console.log('\n📋 Method 2: Count profiles...');
        const { count, error: error2 } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });
        
        console.log('Result 2:', { count, error: error2 });
        
        console.log('\n📋 Method 3: Try with limit 1...');
        const { data: profiles3, error: error3 } = await supabase
            .from('profiles')
            .select('*')
            .limit(1);
        
        console.log('Result 3:', { data: profiles3, error: error3 });
        
        console.log('\n📋 Method 4: Check if table exists with RLS...');
        try {
            const { data: profiles4, error: error4 } = await supabase
                .from('profiles')
                .select('id, email, created_at')
                .limit(5);
            
            console.log('Result 4:', { data: profiles4, error: error4 });
        } catch (e) {
            console.log('Result 4: Exception caught:', e.message);
        }
        
        console.log('\n📋 Method 5: Try to see table structure...');
        try {
            const { data: structure, error: structureError } = await supabase
                .rpc('get_table_structure', { table_name: 'profiles' });
            
            if (structureError) {
                console.log('Structure error:', structureError.message);
            } else {
                console.log('Table structure:', structure);
            }
        } catch (e) {
            console.log('Structure function not available');
        }
        
        console.log('\n📋 Method 6: Check RLS policies...');
        console.log('Note: RLS (Row Level Security) might be blocking access');
        
        // If we still can't get data, provide debugging info
        console.log('\n🔧 Debugging Information:');
        console.log('Supabase URL:', SUPABASE_URL);
        console.log('Anon Key starts with:', SUPABASE_ANON_KEY.substring(0, 20) + '...');
        console.log('This might be a permissions/RLS issue');
        
        console.log('\n📋 Manual Check Instructions:');
        console.log('1. Go to Supabase Dashboard → Table Editor');
        console.log('2. Look for "profiles" table');
        console.log('3. Check if there are RLS policies enabled');
        console.log('4. Check if the anon key has proper permissions');
        console.log('5. Try viewing the data directly in the dashboard');
        
    } catch (error) {
        console.error('❌ Investigation failed:', error.message);
        console.log('\nThis suggests there might be:');
        console.log('- RLS (Row Level Security) policies blocking access');
        console.log('- Permission issues with the anon key');
        console.log('- Table structure differences');
    }
}

investigateProfiles();
