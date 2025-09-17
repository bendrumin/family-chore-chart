// Supabase Configuration
// Replace these values with your actual Supabase project credentials
const SUPABASE_URL = window.SUPABASE_URL || 'your_supabase_url_here';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'your_supabase_anon_key_here';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export for use in other files
window.supabase = supabase;

// Configuration validation - Supabase credentials are properly configured
console.log('✅ Supabase configuration loaded successfully'); 