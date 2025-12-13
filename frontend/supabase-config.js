// Supabase Configuration
// Replace these values with your actual Supabase project credentials
const SUPABASE_URL = (window.SUPABASE_URL || 'your_supabase_url_here').trim();
const SUPABASE_ANON_KEY = (window.SUPABASE_ANON_KEY || 'your_supabase_anon_key_here').trim();

// Debug: Log what's available
console.log('🔍 Supabase Config Debug:', {
    SUPABASE_URL: SUPABASE_URL ? '✅ Set' : '❌ Missing',
    SUPABASE_ANON_KEY: SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
    windowSupabase: typeof window.supabase,
    windowSupabaseClient: typeof window.supabaseClient
});

// Initialize Supabase client with retry logic
let initRetries = 0;
const MAX_RETRIES = 50; // 5 seconds max (50 * 100ms)

// Function to create Supabase client with custom storage option
window.createSupabaseClient = function(storageType = 'session') {
    const supabaseLib = window.supabase || window.supabaseJs || window.Supabase;

    if (!supabaseLib || typeof supabaseLib.createClient !== 'function') {
        console.error('❌ Supabase library not available');
        return null;
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY ||
        SUPABASE_URL === 'your_supabase_url_here' ||
        SUPABASE_ANON_KEY === 'your_supabase_anon_key_here') {
        console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY');
        return null;
    }

    const { createClient } = supabaseLib;

    // Configure storage based on preference
    const storageConfig = {
        auth: {
            storage: storageType === 'local' ? window.localStorage : window.sessionStorage,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
        }
    };

    console.log(`🔧 Creating Supabase client with ${storageType}Storage`);
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, storageConfig);
};

function initializeSupabase() {
    // Check multiple possible ways Supabase might be exposed
    const supabaseLib = window.supabase || window.supabaseJs || window.Supabase;

    // Debug logging
    if (initRetries === 0) {
        console.log('🔍 Checking for Supabase library:', {
            'window.supabase': typeof window.supabase,
            'window.supabaseJs': typeof window.supabaseJs,
            'window.Supabase': typeof window.Supabase,
            'window.supabase?.createClient': typeof window.supabase?.createClient
        });
    }

    // Check if Supabase library is available
    if (!supabaseLib || typeof supabaseLib.createClient !== 'function') {
        if (initRetries < MAX_RETRIES) {
            initRetries++;
            if (initRetries % 10 === 0) {
                console.warn(`⚠️ Supabase library not loaded yet, retry ${initRetries}/${MAX_RETRIES}...`);
            }
            // Retry after a short delay
            setTimeout(initializeSupabase, 100);
            return;
        } else {
            console.error('❌ Supabase library failed to load after maximum retries');
            console.error('Available window properties:', Object.keys(window).filter(k => k.toLowerCase().includes('supabase')));
            window.supabaseClient = null;
            return;
        }
    }

    // Initialize default Supabase client with sessionStorage (more secure)
    // This can be recreated with different storage via window.createSupabaseClient()
    try {
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY ||
            SUPABASE_URL === 'your_supabase_url_here' ||
            SUPABASE_ANON_KEY === 'your_supabase_anon_key_here') {
            console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY. Check frontend/config.js');
            console.error('SUPABASE_URL:', SUPABASE_URL);
            console.error('SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'Set (hidden)' : 'Missing');
            window.supabaseClient = null;
        } else {
            // Create default client with sessionStorage
            window.supabaseClient = window.createSupabaseClient('session');
            console.log('✅ Supabase client initialized successfully with sessionStorage');
            console.log('✅ Client methods available:', Object.keys(window.supabaseClient).slice(0, 5));
        }
    } catch (e) {
        console.error('❌ Failed to initialize Supabase client:', e);
        console.error('Error details:', e.message, e.stack);
        window.supabaseClient = null;
    }
}

// Wait for Supabase script to load
function waitForSupabaseScript() {
    const script = document.getElementById('supabase-script') || document.querySelector('script[src*="supabase-js"]');
    if (script) {
        // Check if script has loaded (via onload event or readyState)
        if (window.supabaseScriptLoaded === true || script.complete || script.readyState === 'complete' || script.readyState === 'loaded') {
            // Script already loaded
            console.log('✅ Supabase script already loaded, initializing...');
            setTimeout(initializeSupabase, 50);
        } else if (window.supabaseScriptLoaded === false) {
            // Script failed to load
            console.error('❌ Supabase script failed to load');
            window.supabaseClient = null;
        } else {
            // Wait for script to load
            console.log('⏳ Waiting for Supabase script to load...');
            script.addEventListener('load', () => {
                console.log('✅ Supabase CDN script loaded, initializing...');
                window.supabaseScriptLoaded = true;
                setTimeout(initializeSupabase, 100);
            });
            script.addEventListener('error', () => {
                console.error('❌ Failed to load Supabase CDN script');
                window.supabaseScriptLoaded = false;
                window.supabaseClient = null;
            });
            // Fallback: if onload doesn't fire, try after a delay
            setTimeout(() => {
                if (window.supabaseScriptLoaded !== true && !window.supabaseClient) {
                    console.warn('⚠️ Supabase script onload event not fired, trying to initialize anyway...');
                    initializeSupabase();
                }
            }, 2000);
        }
    } else {
        // Script tag not found, try initializing anyway
        console.warn('⚠️ Supabase script tag not found, trying to initialize anyway...');
        initializeSupabase();
    }
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForSupabaseScript);
} else {
    // DOM already loaded
    waitForSupabaseScript();
}