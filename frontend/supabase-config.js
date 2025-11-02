// Supabase Configuration
// Replace these values with your actual Supabase project credentials
const SUPABASE_URL = window.SUPABASE_URL || 'your_supabase_url_here';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'your_supabase_anon_key_here';

// Check if Supabase is available
if (typeof window.supabase === 'undefined') {
    console.error('❌ Supabase library not loaded. Make sure to include the Supabase script.');
    window.supabase = null;
} else {
    // Initialize Supabase client
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Export for use in other files
    window.supabase = supabase;
    
    // Configuration validation
    console.log('✅ Supabase configuration loaded successfully');
    console.log('Supabase URL:', SUPABASE_URL);
    console.log('Supabase Key:', SUPABASE_ANON_KEY ? 'Present' : 'Missing');
} 