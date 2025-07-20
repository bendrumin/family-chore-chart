// Supabase Configuration
// Replace these values with your actual Supabase project credentials
const SUPABASE_URL = 'https://kyzgmhcismrnjlnddyyl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5emdtaGNpc21ybmpsbmRkeXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDUxOTMsImV4cCI6MjA2ODYyMTE5M30.WejJ7dZjVeHP4wN990woeld4GBqT8GAHB1HDvJjv_K4';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export for use in other files
window.supabase = supabase;

// Configuration validation - Supabase credentials are properly configured
console.log('✅ Supabase configuration loaded successfully'); 