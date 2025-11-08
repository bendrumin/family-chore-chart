// Supabase Configuration
// Replace these values with your actual Supabase project credentials
const SUPABASE_URL = window.SUPABASE_URL || 'your_supabase_url_here';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'your_supabase_anon_key_here';

// Check if Supabase is available
if (typeof window.supabase === 'undefined') {
    console.error('❌ Supabase library not loaded. Make sure to include the Supabase script.');
    window.supabaseClient = null;
} else {
    // Initialize Supabase client without overwriting the library namespace
    const { createClient } = window.supabase;
    try {
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY ||
            SUPABASE_URL === 'your_supabase_url_here' ||
            SUPABASE_ANON_KEY === 'your_supabase_anon_key_here') {
            console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY. Check frontend/config.js');
            window.supabaseClient = null;
        } else {
            window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            // Supabase configuration loaded successfully
        }
    } catch (e) {
        console.error('❌ Failed to initialize Supabase client:', e);
        window.supabaseClient = null;
    }
}