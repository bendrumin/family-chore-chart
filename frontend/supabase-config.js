// Supabase Configuration
// Replace these values with your actual Supabase project credentials
const SUPABASE_URL = 'YOUR_SUPABASE_PROJECT_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// Initialize Supabase client
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export for use in other files
window.supabase = supabase;

// Configuration validation
if (SUPABASE_URL === 'YOUR_SUPABASE_PROJECT_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
    console.warn('⚠️ Please update your Supabase credentials in supabase-config.js');
    
    // Show error message to user
    document.addEventListener('DOMContentLoaded', () => {
        const toast = document.createElement('div');
        toast.className = 'toast toast-error';
        toast.innerHTML = `
            <div class="toast-content">
                <span>⚠️</span>
                <div>
                    <strong>Configuration Required</strong>
                    <p>Please update your Supabase credentials in supabase-config.js</p>
                </div>
            </div>
        `;
        document.getElementById('toast-container').appendChild(toast);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            toast.remove();
        }, 10000);
    });
} 