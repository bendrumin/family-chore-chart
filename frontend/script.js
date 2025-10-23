// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// PWA Install Prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Show install button if not already installed
    if (!window.matchMedia('(display-mode: standalone)').matches) {
        setTimeout(() => {
            showInstallPrompt();
        }, 3000); // Show after 3 seconds
    }
});

function showInstallPrompt() {
    window.analytics.trackInstallPrompt();
    const toast = document.createElement('div');
    toast.className = 'toast toast-info';
    toast.innerHTML = `
        <div class="toast-content">
            <div class="toast-icon">📱</div>
            <div class="toast-message">
                <div class="toast-title">Install ChoreStar App</div>
                <div class="toast-description">Add to your home screen for the best experience!</div>
            </div>
        </div>
        <div class="toast-actions">
            <button class="toast-action btn btn-primary btn-sm">Install</button>
            <button class="toast-close">&times;</button>
        </div>
    `;
    
    document.getElementById('toast-container').appendChild(toast);
    
    toast.querySelector('.toast-action').addEventListener('click', () => {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
            }
            deferredPrompt = null;
        });
        toast.remove();
    });
    
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.remove();
    });
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 10000);
}

// DiceBear avatar seeds (for free users)
const diceBearSeeds = ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Mason', 'Sophia', 'Lucas', 'Mia', 'Ethan'];
function getDiceBearUrl(seed) {
    return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(seed)}`;
}

// Family Chore Chart - Main Application Script

class FamilyChoreChart {
    constructor() {
        this.apiClient = window.apiClient;
        this.currentUser = null;
        this.profile = null; // Store user profile for premium checks
        this.children = [];
        this.chores = [];
        this.completions = [];
        this.currentWeekStart = null;
        this.currentChildTab = null;
        this.activeChildId = null; // Track active child for tab switching
        this.categoryFilter = 'all'; // Category filter state
        this.settings = {
            dailyReward: 50,
            weeklyBonus: 200,
            soundEnabled: true,
            soundVolume: 50,
            theme: 'light',
            colorScheme: 'default'
        };
        this.streaks = {};
        this.formSubmissions = new Map();
        this.recentToasts = new Map(); // Initialize toast deduplication
        this.handlersInitialized = false;
        this.seasonalThemes = this.initializeSeasonalThemes();
        this.achievementBadges = this.initializeAchievementBadges();
        this.unlockedBadges = new Set();
        this.aiSuggestions = this.initializeAISuggestions();
        this.currentOnboardingStep = 1;
        this.init();
    }

    // Apply translations to elements with data-i18n attributes
    applyTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = t(key);
            if (translation !== key) { // Only update if translation exists
                element.textContent = translation;
            }
        });
    }
    
    // Setup footer functionality
    setupFooterHandlers() {
        // Check if footer exists
        const footer = document.getElementById('smart-footer');
        if (!footer) {
            console.warn('Smart footer not found yet. Will retry...');
            // Retry after a short delay
            setTimeout(() => {
                this.setupFooterHandlers();
            }, 200);
            return;
        }
        
        console.log('Setting up footer handlers - footer found!');
        
        // Check if handlers are already set up to prevent duplicates
        if (footer.dataset.handlersSetup === 'true') {
            console.log('Footer handlers already set up, skipping...');
            return;
        }
        
        // Language selector
        const footerLanguageSelect = document.getElementById('footer-language-select');
        if (footerLanguageSelect) {
            footerLanguageSelect.addEventListener('change', (e) => {
                const newLanguage = e.target.value;
                if (changeLanguage(newLanguage)) {
                    // Update settings if user is logged in
                    if (this.familySettings) {
                        this.updateLanguageSetting(newLanguage);
                    }
                    this.showToast(t('language_changed_success'), 'info');
                }
            });
        }
        
        // Currency selector
        const footerCurrencySelect = document.getElementById('footer-currency-select');
        if (footerCurrencySelect) {
            footerCurrencySelect.addEventListener('change', (e) => {
                const newCurrency = e.target.value;
                if (this.familySettings) {
                    this.updateCurrencySetting(newCurrency);
                }
                this.showToast('Currency updated!', 'info');
            });
        }
        
        // Theme toggle
        const footerThemeToggle = document.getElementById('footer-theme-toggle');
        if (footerThemeToggle) {
            footerThemeToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleTheme();
            });
        }
        
        // Sound toggle
        const footerSoundToggle = document.getElementById('footer-sound-toggle');
        if (footerSoundToggle) {
            footerSoundToggle.addEventListener('click', () => {
                this.toggleSound();
            });
        }
        
        // Help button
        const footerHelpBtn = document.getElementById('footer-help-btn');
        if (footerHelpBtn) {
            footerHelpBtn.addEventListener('click', () => {
                console.log('Footer help button clicked - showing FAQ modal');
                this.showModal('faq-modal');
            });
        }
        
        // Contact button
        const footerContactBtn = document.getElementById('footer-contact-btn');
        if (footerContactBtn) {
            footerContactBtn.addEventListener('click', () => {
                console.log('Footer contact button clicked - showing contact modal');
                this.showModal('contact-modal');
            });
        }
        
        // Mark footer as set up to prevent duplicate handlers
        footer.dataset.handlersSetup = 'true';
        console.log('Footer handlers setup complete!');
    }
    
    // Debug function to check footer elements (call from console)
    debugFooter() {
        console.log('=== Footer Debug Info ===');
        console.log('Smart footer:', document.getElementById('smart-footer'));
        console.log('Language select:', document.getElementById('footer-language-select'));
        console.log('Currency select:', document.getElementById('footer-currency-select'));
        console.log('Theme toggle:', document.getElementById('footer-theme-toggle'));
        console.log('Sound toggle:', document.getElementById('footer-sound-toggle'));
        console.log('Help button:', document.getElementById('footer-help-btn'));
        console.log('Contact button:', document.getElementById('footer-contact-btn'));
        console.log('FAQ modal:', document.getElementById('faq-modal'));
        console.log('Contact modal:', document.getElementById('contact-modal'));
        console.log('Document ready state:', document.readyState);
        console.log('========================');
        
        // Test modal functionality
        console.log('Testing modal functionality...');
        const faqModal = document.getElementById('faq-modal');
        const contactModal = document.getElementById('contact-modal');
        if (faqModal) {
            console.log('FAQ modal found, testing showModal...');
            this.showModal('faq-modal');
            setTimeout(() => {
                console.log('FAQ modal should be visible now');
                this.hideModal('faq-modal');
            }, 2000);
        }
    }
    
    // Update language setting
    async updateLanguageSetting(language) {
        try {
            const result = await this.apiClient.updateFamilySettings({
                language: language
            });
            if (result.success) {
                this.familySettings = result.settings;
            }
        } catch (error) {
            console.warn('Failed to update language setting:', error);
        }
    }
    
    // Update currency setting
    async updateCurrencySetting(currency) {
        try {
            const result = await this.apiClient.updateFamilySettings({
                currency_code: currency
            });
            if (result.success) {
                this.familySettings = result.settings;
                this.renderChildren(); // Refresh to show new currency
            }
        } catch (error) {
            console.warn('Failed to update currency setting:', error);
        }
    }
    
    
    
    // Initialize footer theme button with correct icon
    initializeFooterThemeButton() {
        const footerThemeToggle = document.getElementById('footer-theme-toggle');
        if (footerThemeToggle) {
            const currentTheme = this.settings.theme || 'light';
            const icon = footerThemeToggle.querySelector('.footer-icon');
            if (icon) {
                icon.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
            }
        } else {
            console.warn('Footer theme toggle not found during initialization');
        }
    }
    
    // Initialize footer sound button with correct icon
    initializeFooterSoundButton() {
        const footerSoundToggle = document.getElementById('footer-sound-toggle');
        if (footerSoundToggle) {
            const currentSound = this.settings.soundEnabled || false;
            const icon = footerSoundToggle.querySelector('.footer-icon');
            if (icon) {
                icon.textContent = currentSound ? '🔊' : '🔇';
            }
        } else {
            console.warn('Footer sound toggle not found during initialization');
        }
    }

    async init() {
        try {
            this.showLoading();
            
            
            // Add anti-jump CSS early
            this.addAntiJumpCSS();
            
            // Load settings and streaks
            this.loadSettings();
            this.loadStreaks();
            
            // Check authentication
            try {
                const user = await this.apiClient.getCurrentUser();
                if (user && user.id) {
                    this.currentUser = user;
                    await this.loadApp();
                } else {
                    console.log('No authenticated user found, showing auth screen');
                    this.showAuth();
                }
            } catch (authError) {
                console.log('Authentication check failed, showing auth screen:', authError);
                this.showAuth();
            }
        } catch (error) {
            console.error('Initialization error:', error);
            this.showToast('Failed to initialize app. Please refresh the page.', 'error');
            // Fallback to auth screen on any error
            this.showAuth();
        } finally {
            this.hideLoading();
        }
    }

    async loadApp() {
        try {
            // Ensure API client is initialized
            if (!this.apiClient) {
                console.error('API client not initialized');
                this.showToast('Error initializing app', 'error');
                return;
            }
            
            // Ensure user is authenticated
            if (!this.currentUser || !this.currentUser.id) {
                console.error('No authenticated user found in loadApp');
                this.showAuth();
                return;
            }
            
            // Load family settings
            this.familySettings = await this.apiClient.getFamilySettings();
            
            // Update family name in header
            try {
                const profile = await this.apiClient.getProfile();
                this.profile = profile; // Store profile for premium checks
                
                if (profile) {
                    document.getElementById('family-name').textContent = profile.family_name;
                } else {
                    console.warn('No profile data received');
                    document.getElementById('family-name').textContent = 'Family';
                }
            } catch (profileError) {
                console.error('Error loading profile:', profileError);
                document.getElementById('family-name').textContent = 'Family';
                this.showToast('Family info failed to load', 'error');
            }
            
            // Check if we should show new features modal
            this.checkNewFeatures();
            
            // Load children and chores
            await this.loadChildren();
            await this.loadChores();
            await this.loadCompletions();
            
            // Initialize analytics
            let subscriptionType = 'free';
            try {
                if (this.apiClient && typeof this.apiClient.getSubscriptionType === 'function') {
                    subscriptionType = await this.apiClient.getSubscriptionType();
                }
            } catch (error) {
                console.error('Error getting subscription type:', error);
                subscriptionType = 'free';
            }
            
            window.analytics.init(
                this.currentUser.id,
                this.profile?.email === 'bsiegel13@gmail.com' ? 'admin' : 'user',
                subscriptionType || 'free',
                this.children.length
            );
            window.analytics.trackPageView('Dashboard');
            
            // Initialize notifications
            try {
                await window.notificationManager.init();
                
                // Send welcome notification only for truly new users (first time setup)
                const hasShownWelcome = localStorage.getItem('chorestar_welcome_shown');
                if (this.profile && this.children.length === 0 && !hasShownWelcome) {
                    setTimeout(() => {
                        window.notificationManager.sendWelcomeNotification(this.profile.family_name);
                        localStorage.setItem('chorestar_welcome_shown', 'true');
                    }, 2000);
                }
            } catch (error) {
                console.error('Notification initialization failed:', error);
            }
            
            // Check for payment success/cancellation
            await this.checkForPaymentSuccess();
            
            // Set up real-time subscriptions
            this.setupRealtime();
            
            // Handle WebSocket connection issues
            this.handleWebSocketIssues();
            
            // Show main app
            this.showApp();
            
            // Render everything
            this.renderChildren();
            
            // Update family dashboard overview
            await this.updateFamilyDashboard();
            
            // Check if first-time user and show onboarding
            this.checkFirstTimeUser();
            
            // Apply seasonal theme (premium feature)
            this.applySeasonalTheme();
            
            // Apply translations
            this.applyTranslations();
            
            // Listen for language changes
            window.addEventListener('languageChanged', () => {
                this.applyTranslations();
                this.renderChildren(); // Refresh to show translated content
            });
            
            // Setup footer functionality after DOM is ready
            const setupFooter = () => {
                this.setupFooterHandlers();
                this.initializeFooterThemeButton();
                this.initializeFooterSoundButton();
            };
            
            // Use multiple strategies to ensure footer is ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', setupFooter);
            } else {
                // DOM is already ready, but footer might not be parsed yet
                setTimeout(setupFooter, 100);
            }
            
            // Also try again after a longer delay as backup
            setTimeout(setupFooter, 500);
            
            // Final fallback when window is fully loaded
            window.addEventListener('load', () => {
                setTimeout(setupFooter, 100);
            });
            
            // Load notification preferences
            this.loadNotificationPreferences();
            
            // Add dashboard refresh handler
            this.addDashboardHandlers();
            
        } catch (error) {
            console.error('Load app error:', error);
            window.analytics.trackError('load_app', error.message);
            
            // Hide loading screen if it's showing
            this.hideLoading();
            
            // More specific error message for family info
            if (error.message.includes('family') || error.message.includes('profile')) {
                this.showToast('Family info failed to load. Please refresh the page.', 'error');
            } else {
                this.showToast('Error loading family data', 'error');
            }
            
            // Return to auth screen on critical errors
            this.showAuth();
        }
    }

    async loadChildren() {
        if (this.isLoadingChildren) {
            console.log('Already loading children, skipping...');
            return;
        }
        
        this.isLoadingChildren = true;
        console.log('Loading children from API...');
        
        try {
            this.children = await this.apiClient.getChildren();
            console.log('Children loaded:', this.children);
        } finally {
            this.isLoadingChildren = false;
        }
    }

    async loadChores() {
        this.chores = await this.apiClient.getChores();
    }

    async loadCompletions() {
        this.currentWeekStart = this.apiClient.getWeekStart();
        this.completions = await this.apiClient.getChoreCompletions(this.currentWeekStart);
    }

    setupRealtime() {
        try {
            this.subscription = this.apiClient.subscribeToChanges((payload) => {
                console.log('Real-time update:', payload);
                
                // Add debouncing for real-time updates
                const updateKey = `${payload.table}-${payload.eventType}`;
                const now = Date.now();
                const lastUpdate = this.formSubmissions.get(updateKey);
                if (lastUpdate && (now - lastUpdate) < 2000) { // 2 second debounce for real-time
                    console.log('Skipping duplicate real-time update:', payload);
                    return;
                }
                this.formSubmissions.set(updateKey, now);
                
                // Refresh data based on what changed
                if (payload.table === 'chore_completions') {
                    this.loadCompletions().then(() => {
                        // Don't re-render children for chore completions - let optimistic updates handle it
                        console.log('Chore completion real-time update - skipping re-render');
                    });
                } else if (payload.table === 'chores') {
                    this.loadChores().then(() => {
                        this.renderChildren();
                    });
                } else if (payload.table === 'children') {
                    console.log('Children table changed, reloading...');
                    // Add a small delay to prevent rapid reloads
                    setTimeout(() => {
                        this.loadChildren().then(() => {
                            console.log('Children reloaded from real-time:', this.children);
                            this.renderChildren();
                        });
                    }, 100);
                }
            });
        } catch (error) {
            console.warn('Real-time connection failed, continuing without live updates:', error);
            // App will still work without real-time updates
        }
    }

    // Handle WebSocket connection issues gracefully
    handleWebSocketIssues() {
        // Listen for WebSocket errors and reconnect
        window.addEventListener('online', () => {
            console.log('Network connection restored');
            // Optionally reconnect real-time subscriptions
        });

        window.addEventListener('offline', () => {
            console.log('Network connection lost');
            // App will continue to work offline
        });
    }

    // UI State Management
    showLoading() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) loadingScreen.classList.remove('hidden');
    }

    hideLoading() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) loadingScreen.classList.add('hidden');
    }

    // Bulletproof loading system for individual buttons
    setButtonLoading(btn, isLoading, fallbackLabel = 'Sign In') {
        if (!btn) return;
        if (isLoading) {
            // Preserve original state once
            if (!btn.dataset.originalContent) {
                btn.dataset.originalContent = btn.innerHTML;
                btn.dataset.originalDisabled = btn.disabled ? '1' : '';
            }
            btn.disabled = true;
            btn.classList.add('loading');
            btn.innerHTML = '<span class="loading-spinner" aria-hidden="true"></span> Signing in...';
        } else {
            // Restore original state on ANY exit path
            if (btn.dataset.originalContent) {
                btn.innerHTML = btn.dataset.originalContent;
                delete btn.dataset.originalContent;
            } else {
                // Fallback if original not captured for some reason
                btn.innerHTML = fallbackLabel;
            }
            btn.disabled = !!btn.dataset.originalDisabled;
            delete btn.dataset.originalDisabled;
            btn.classList.remove('loading');
        }
    }

    // Helper method to find button by text content
    findButtonByText(text, container = document) {
        const buttons = container.querySelectorAll('button');
        for (const button of buttons) {
            if (button.textContent.trim().includes(text)) {
                return button;
            }
        }
        return null;
    }

    showAuth() {
        const authContainer = document.getElementById('auth-container');
        const appContainer = document.getElementById('app-container');
        if (authContainer) authContainer.classList.remove('hidden');
        if (appContainer) appContainer.classList.add('hidden');
        this.setupAuthHandlers();
    }

    showApp() {
        const authContainer = document.getElementById('auth-container');
        const appContainer = document.getElementById('app-container');
        if (authContainer) authContainer.classList.add('hidden');
        if (appContainer) appContainer.classList.remove('hidden');
        
        // Add flag to prevent duplicate initialization
        if (!this.handlersInitialized) {
            // Ensure DOM is ready before setting up handlers
            setTimeout(() => {
                this.setupAppHandlers();
                this.setupModalHandlers();
                this.handlersInitialized = true;
            }, 100);
        }
    }

    // Authentication Handlers
    setupAuthHandlers() {
        // Login form
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLogin();
        });

        // Signup form
        document.getElementById('signup-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleSignup();
        });

        // Forgot password form
        document.getElementById('forgot-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleForgotPassword();
        });

        // Form switching
        document.getElementById('show-signup').addEventListener('click', (e) => {
            e.preventDefault();
            this.switchAuthForm('signup');
        });

        document.getElementById('show-login').addEventListener('click', (e) => {
            e.preventDefault();
            this.switchAuthForm('login');
        });

        document.getElementById('forgot-password').addEventListener('click', (e) => {
            e.preventDefault();
            this.switchAuthForm('forgot');
        });

        document.getElementById('back-to-login').addEventListener('click', (e) => {
            e.preventDefault();
            this.switchAuthForm('login');
        });


    }

    async handleLogin() {
        const btn = document.querySelector('#login-form button[type="submit"]');
        const email = document.getElementById('login-email')?.value?.trim() || '';
        const password = document.getElementById('login-password')?.value || '';
        const rememberMe = document.getElementById('remember-me') ? document.getElementById('remember-me').checked : true;

        // Basic front-end validation to fail fast (also prevents a stuck spinner)
        if (!email || !password) {
            this.showToast('Please enter your email and password.', 'error');
            return;
        }

        // Prevent double-clicks
        if (btn?.classList.contains('loading')) return;

        this.setButtonLoading(btn, true);
        try {
            const result = await this.apiClient.signIn(email, password);
            
            if (result.success) {
                this.currentUser = result.user;
                window.analytics.trackLogin(email);
                // Store session based on Remember Me
                if (result.session) {
                    const sessionStr = JSON.stringify(result.session);
                    if (rememberMe) {
                        localStorage.setItem('chorestar_session', sessionStr);
                        sessionStorage.removeItem('chorestar_session');
                    } else {
                        sessionStorage.setItem('chorestar_session', sessionStr);
                        localStorage.removeItem('chorestar_session');
                    }
                }
                
                // Load the app, but ensure we handle any errors
                try {
                    await this.loadApp();
                } catch (loadError) {
                    console.error('Error loading app after login:', loadError);
                    this.hideLoading();
                    this.showAuth();
                    this.showToast('Failed to load app. Please try again.', 'error');
                }
            } else {
                // ⛔ Error: always inform, never stay loading
                window.analytics.trackError('login', result.error);
                this.showToast(result.error || 'Invalid email or password.', 'error');
            }
        } catch (err) {
            // ⛔ Error: always inform, never stay loading
            console.error('Login error:', err);
            const msg = err?.message || 'An error occurred during login. Please try again.';
            this.showToast(msg, 'error');
        } finally {
            // 🧹 Always restore the button no matter what happened
            this.setButtonLoading(btn, false, 'Sign In');
        }
    }

    async handleSignup() {
        const btn = document.querySelector('#signup-form button[type="submit"]');
        const email = document.getElementById('signup-email')?.value?.trim() || '';
        const familyName = document.getElementById('signup-family-name')?.value?.trim() || '';
        const password = document.getElementById('signup-password')?.value || '';
        const confirmPassword = document.getElementById('signup-confirm-password')?.value || '';

        // Basic front-end validation to fail fast
        if (!email || !familyName || !password || !confirmPassword) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showToast('Passwords do not match', 'error');
            return;
        }

        if (password.length < 6) {
            this.showToast('Password must be at least 6 characters', 'error');
            return;
        }

        // Prevent double-clicks
        if (btn?.classList.contains('loading')) return;

        this.setButtonLoading(btn, true);
        try {
            const result = await this.apiClient.signUp(email, password, familyName);

            if (result.success) {
                window.analytics.trackRegistration(email, familyName);
                this.showToast('Account created! Please check your email to verify your account.', 'success');
                this.switchAuthForm('login');
            } else {
                window.analytics.trackError('signup', result.error);
                this.showToast(result.error, 'error');
            }
        } catch (err) {
            console.error('Signup error:', err);
            const msg = err?.message || 'An error occurred during signup. Please try again.';
            this.showToast(msg, 'error');
        } finally {
            this.setButtonLoading(btn, false, 'Create Account');
        }
    }

    async handleForgotPassword() {
        const btn = document.querySelector('#forgot-form button[type="submit"]');
        const email = document.getElementById('forgot-email')?.value?.trim() || '';

        if (!email) {
            this.showToast('Please enter your email', 'error');
            return;
        }

        // Prevent double-clicks
        if (btn?.classList.contains('loading')) return;

        this.setButtonLoading(btn, true);
        try {
            const result = await this.apiClient.resetPassword(email);

            if (result.success) {
                this.showToast('Password reset email sent!', 'success');
                this.switchAuthForm('login');
            } else {
                this.showToast(result.error, 'error');
            }
        } catch (err) {
            console.error('Forgot password error:', err);
            const msg = err?.message || 'An error occurred. Please try again.';
            this.showToast(msg, 'error');
        } finally {
            this.setButtonLoading(btn, false, 'Send Reset Link');
        }
    }



    switchAuthForm(form) {
        const forms = ['login-form', 'signup-form', 'forgot-form'];
        forms.forEach(formId => {
            document.getElementById(formId).classList.add('hidden');
        });

        if (form === 'signup') {
            document.getElementById('signup-form').classList.remove('hidden');
        } else if (form === 'forgot') {
            document.getElementById('forgot-form').classList.remove('hidden');
        } else {
            document.getElementById('login-form').classList.remove('hidden');
        }
    }

    // App Handlers
    setupAppHandlers() {
        if (this.appHandlersSetup) return;
        this.appHandlersSetup = true;
        console.log('Setting up app handlers...');
        
        // FAQ and Contact handlers
        this.setupHelpModals();
        this.setupMobileMenu();
        
        // Add child button (main header)
        const addChildBtn = document.getElementById('add-child-btn');
        if (addChildBtn && !addChildBtn.hasListener) {
            addChildBtn.addEventListener('click', () => {
                this.showModal('add-child-modal');
            });
            addChildBtn.hasListener = true;
        }
        // Add child button (empty state)
        const emptyAddChildBtn = document.getElementById('empty-add-child-btn');
        if (emptyAddChildBtn && !emptyAddChildBtn.hasListener) {
            emptyAddChildBtn.addEventListener('click', () => {
                this.showModal('add-child-modal');
            });
            emptyAddChildBtn.hasListener = true;
        }

        // Mobile add child button
        const mobileAddChildBtn = document.getElementById('mobile-add-child-btn');
        if (mobileAddChildBtn && !mobileAddChildBtn.hasListener) {
            mobileAddChildBtn.addEventListener('click', () => {
                this.showModal('add-child-modal');
                // Close mobile menu after opening modal
                this.closeMobileMenu();
            });
            mobileAddChildBtn.hasListener = true;
        }

        // FAQ button
        const faqBtn = document.getElementById('faq-btn');
        if (faqBtn && !faqBtn.hasListener) {
            faqBtn.addEventListener('click', () => this.showModal('faq-modal'));
            faqBtn.hasListener = true;
        }
        
        // Contact button
        const contactBtn = document.getElementById('contact-btn');
        if (contactBtn && !contactBtn.hasListener) {
            contactBtn.addEventListener('click', () => this.showModal('contact-modal'));
            contactBtn.hasListener = true;
        }

        // Delegated click handler for any element that declares a target modal
        // Works for dynamically generated buttons/links anywhere on the page
        document.addEventListener('click', (e) => {
            const openModalTrigger = e.target.closest('[data-open-modal]');
            if (openModalTrigger) {
                const targetModal = openModalTrigger.getAttribute('data-open-modal');
                if (targetModal) {
                    e.preventDefault();
                    this.showModal(targetModal);
                    return;
                }
            }

            // Backward-compatible: Add Chore buttons without data-open-modal
            const addChoreBtn = e.target.closest('.add-chore-grid-btn, .add-chore-empty-btn');
            if (addChoreBtn) {
                e.preventDefault();
                this.showModal('add-chore-modal');
                return;
            }

            // AI Suggestions button
            const aiSuggestionsBtn = e.target.closest('.ai-suggestions-btn');
            if (aiSuggestionsBtn) {
                e.preventDefault();
                const childId = aiSuggestionsBtn.getAttribute('data-child-id');
                if (childId) {
                    this.showAISuggestionsModal(childId);
                }
            }
        });
        
        // Settings button
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn && !settingsBtn.hasListener) {
            settingsBtn.addEventListener('click', () => {
                this.showSettingsModal();
            });
            settingsBtn.hasListener = true;
        }

        // What's New button (desktop)
        const whatsNewBtn = document.getElementById('whats-new-btn');
        if (whatsNewBtn && !whatsNewBtn.hasListener) {
            whatsNewBtn.addEventListener('click', () => {
                this.showModal('new-features-modal');
                this.markNewFeaturesAsSeen();
            });
            whatsNewBtn.hasListener = true;
        }

        // What's New button (mobile)
        const mobileWhatsNewBtn = document.getElementById('mobile-whats-new-btn');
        if (mobileWhatsNewBtn && !mobileWhatsNewBtn.hasListener) {
            mobileWhatsNewBtn.addEventListener('click', () => {
                this.showModal('new-features-modal');
                this.markNewFeaturesAsSeen();
                this.closeMobileMenu();
            });
            mobileWhatsNewBtn.hasListener = true;
        }

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn && !logoutBtn.hasListener) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
            logoutBtn.hasListener = true;
        }

        // Theme selector
        const themeSelector = document.getElementById('theme-selector');
        if (themeSelector && !themeSelector.hasListener) {
            themeSelector.addEventListener('change', (e) => {
                this.setTheme(e.target.value);
            });
            themeSelector.hasListener = true;
        }

        // Color scheme selector
        const colorSchemeSelector = document.getElementById('color-scheme');
        if (colorSchemeSelector && !colorSchemeSelector.hasListener) {
            colorSchemeSelector.addEventListener('change', (e) => {
                this.setColorScheme(e.target.value);
            });
            colorSchemeSelector.hasListener = true;
        }

        // Sound enabled checkbox
        const soundEnabled = document.getElementById('sound-enabled');
        if (soundEnabled && !soundEnabled.hasListener) {
            soundEnabled.addEventListener('change', (e) => {
                this.settings.soundEnabled = e.target.checked;
                this.updateSoundToggle();
                this.saveSettings();
            });
            soundEnabled.hasListener = true;
        }

        // Category filter
        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter && !categoryFilter.hasListener) {
            categoryFilter.addEventListener('change', (e) => {
                this.categoryFilter = e.target.value;
                this.renderChildren();
                this.updateCategoryFilterCount();
            });
            categoryFilter.hasListener = true;
        }

        // Sound volume slider
        const soundVolume = document.getElementById('sound-volume');
        if (soundVolume && !soundVolume.hasListener) {
            soundVolume.addEventListener('input', (e) => {
                this.settings.soundVolume = parseInt(e.target.value);
                this.saveSettings();
            });
            soundVolume.hasListener = true;
        }

        // Settings tabs - use event delegation to avoid duplicates
        if (!this.tabHandlerSetup) {
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains('tab-btn') && e.target.dataset.tab) {
                    this.switchSettingsTab(e.target.dataset.tab);
                }
            });
            this.tabHandlerSetup = true;
        }
        
        // Load settings and initialize toggles
        this.loadSettings();
        this.initializeToggles();
    }

    async handleLogout() {
        try {
            // Find and set loading state on logout button
            const logoutButton = document.querySelector('#logout-btn');
            this.setButtonLoading(logoutButton, true);

            const result = await this.apiClient.signOut();
            if (result.success) {
                this.currentUser = null;
                this.children = [];
                this.chores = [];
                this.completions = [];
                this.familySettings = null;
                
                if (this.subscription) {
                    this.subscription.unsubscribe();
                }
                
                this.showAuth();
            } else {
                this.showToast('Error logging out', 'error');
            }
        } catch (error) {
            console.error('Error logging out:', error);
            this.showToast('Error logging out', 'error');
        } finally {
            // Reset loading state
            const logoutButton = document.querySelector('#logout-btn');
            this.setButtonLoading(logoutButton, false);
        }
    }

    // Modal Management
    setupModalHandlers() {
        // Single modal close handler - using event delegation
        document.addEventListener('click', (e) => {
            // Close modal with X button
            if (e.target.classList.contains('modal-close')) {
                const modal = e.target.closest('.modal');
                if (modal) {
                    this.hideModal(modal.id);
                }
            }
            
            // Close modal with Cancel button (look for data-modal attribute OR closest modal)
            if (e.target.classList.contains('btn-outline') || e.target.textContent.trim().toLowerCase() === 'cancel') {
                const modal = e.target.closest('.modal');
                if (modal) {
                    this.hideModal(modal.id);
                }
            }
            
            // Close modal when clicking outside (on backdrop)
            if (e.target.classList.contains('modal')) {
                // Only close if clicking directly on the modal backdrop, not on content
                if (e.target === e.currentTarget) {
                    this.hideModal(e.target.id);
                }
            }
        });

        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.modal:not(.hidden)');
                if (openModal) {
                    this.hideModal(openModal.id);
                }
            }
        });

        // Add child form
        const addChildForm = document.getElementById('add-child-form');
        if (addChildForm) {
            addChildForm.addEventListener('submit', async (e) => {
                console.log('Add child form submitted!');
                e.preventDefault();
                await this.handleAddChild();
            });
        } else {
            console.error('Add child form not found!');
        }

        // Use event delegation for submit button since it might not exist yet
        document.addEventListener('click', async (e) => {
            // Check for both the form attribute and text content
            if (e.target && (e.target.matches('button[form="add-child-form"]') || 
                           (e.target.textContent.includes('Add Child') && e.target.type === 'submit'))) {
                console.log('Add child submit button clicked!', e.target);
                e.preventDefault();
                await this.handleAddChild();
            }
        });

        // Add child color picker
        const addChildColorInput = document.getElementById('child-color');
        if (addChildColorInput) {
            addChildColorInput.addEventListener('change', (e) => {
                this.updateAddChildAvatarPreview();
            });
        }

        // Event listener for edit child color input
        const editChildColorInput = document.getElementById('edit-child-color');
        if (editChildColorInput) {
            editChildColorInput.addEventListener('change', (e) => {
                this.updateEditChildAvatarPreview2();
            });
        }

        // Add chore form
        document.getElementById('add-chore-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleAddChore();
        });

        // Settings form
        document.getElementById('settings-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleUpdateSettings();
        });

        // Color presets
        document.querySelectorAll('.color-preset').forEach(preset => {
            preset.addEventListener('click', () => {
                const color = preset.dataset.color;
                document.getElementById('child-color').value = color;
                
                // Update active state - only for presets in the add child modal
                const addChildModal = document.getElementById('add-child-modal');
                if (addChildModal && addChildModal.contains(preset)) {
                    addChildModal.querySelectorAll('.color-preset').forEach(p => p.classList.remove('active'));
                preset.classList.add('active');
                }
                
                // Update avatar preview
                this.updateAddChildAvatarPreview();
            });
        });

        // Add more chore button
        document.getElementById('add-more-chore').addEventListener('click', () => {
            this.addChoreEntry();
        });

        // IMPROVED: Icon picker functionality with specific ID matching
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('icon-option')) {
                const iconPicker = e.target.closest('.icon-picker');
                
                // Update active state
                iconPicker.querySelectorAll('.icon-option').forEach(option => {
                    option.classList.remove('active');
                });
                e.target.classList.add('active');
                
                // Find the correct hidden input based on specific picker ID
                let hiddenInput = null;
                
                if (iconPicker.id === 'edit-chore-icon-picker') {
                    hiddenInput = document.getElementById('edit-chore-icon');
                } else if (iconPicker.id.includes('chore-icon-picker')) {
                    // For add chore modal - extract the number from the ID
                    const match = iconPicker.id.match(/chore-icon-picker-(\d+)/);
                    if (match) {
                        const choreNumber = match[1];
                        hiddenInput = document.getElementById(`chore-icon-${choreNumber}`);
                    }
                }
                
                // Update hidden input if found
                if (hiddenInput) {
                    hiddenInput.value = e.target.dataset.icon;
                    console.log('Set icon value:', e.target.dataset.icon, 'to input:', hiddenInput.id);
                } else {
                    console.warn('Could not find hidden input for icon picker:', iconPicker.id);
                }
            }
        });

        // Remove chore buttons (delegated event handling)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-chore')) {
                e.preventDefault();
                this.removeChoreEntry(e.target.closest('.chore-entry'));
            }
        });

        // Edit chore form
        document.getElementById('edit-chore-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleEditChore();
        });

        // Edit child form
        document.getElementById('edit-child-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleEditChildModal();
        });

        // Page edit child form
        document.getElementById('page-edit-child-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handlePageEditChildSave();
        });

        // Setup color picker functionality
        this.setupChoreColorSwatches();
    }

    openEditChildModal(child) {
        // Hide the manage children list
        document.getElementById('manage-children-list').style.display = 'none';
        
        // Show the inline edit form
        const editForm = document.getElementById('inline-edit-child-form');
        editForm.style.display = 'block';
        
        // Populate the edit form with child data
        document.getElementById('settings-edit-child-name').value = child.name;
        document.getElementById('settings-edit-child-age').value = child.age;
        document.getElementById('settings-edit-child-color').value = child.avatar_color || '#6366f1';
        
        // Set the child ID for the form
        document.getElementById('settings-edit-child-form').dataset.childId = child.id;
        
        // Update avatar preview
        this.updateSettingsEditChildAvatarPreview(child);
        
        // Setup color presets
        this.setupSettingsEditChildColorPresets();
    }



    // Edit Children Page functionality
    openEditChildrenPage() {
        if (this.children.length === 0) {
            this.showToast('No children to edit', 'error');
            return;
        }

        // Initialize edit page mode
        this.editPageMode = true;
        this.currentEditIndex = 0;
        
        // Load the first child
        this.loadChildForPageEdit(this.currentEditIndex);
        this.updatePageEditNavigation();
        
        // Show the page modal
        this.showPageModal('edit-children-page');
    }

    closeEditChildrenPage() {
        // Hide the page modal
        this.hidePageModal('edit-children-page');
        
        // Exit edit page mode
        this.editPageMode = false;
        this.currentEditIndex = 0;
    }

    // Icon Picker Methods
    openIconPicker(currentIcon = '', callback = null) {
        this.iconPickerCallback = callback;
        this.currentSelectedIcon = currentIcon;
        
        // Populate all icon types
        this.populateRobotIcons();
        this.populateAdventurerIcons();
        this.populateEmojiIcons();
        
        // Set up tab switching
        this.setupIconPickerTabs();
        
        // Show the modal
        this.showModal('icon-picker-modal');
    }

    closeIconPicker() {
        this.hideModal('icon-picker-modal');
        this.iconPickerCallback = null;
        this.currentSelectedIcon = '';
    }

    populateRobotIcons() {
        const robotsGrid = document.getElementById('robots-grid');
        if (!robotsGrid) return;

        robotsGrid.innerHTML = '';
        
        // Robot seeds for variety
        const robotSeeds = [
            'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Mason', 'Sophia', 'Lucas', 'Mia', 'Ethan',
            'Isabella', 'William', 'Charlotte', 'James', 'Amelia', 'Benjamin', 'Harper', 'Evelyn', 'Henry',
            'Abigail', 'Alexander', 'Emily', 'Michael', 'Elizabeth', 'Daniel', 'Sofia', 'Matthew', 'Avery', 'Jackson'
        ];

        robotSeeds.forEach(seed => {
            const url = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(seed)}`;
            const isSelected = this.currentSelectedIcon === url;
            
            const iconOption = document.createElement('button');
            iconOption.className = `icon-option ${isSelected ? 'selected' : ''}`;
            iconOption.type = 'button';
            iconOption.onclick = () => this.selectIcon(url, 'robot');
            
            iconOption.innerHTML = `
                <img src="${url}" alt="Robot ${seed}" loading="lazy" onload="this.nextElementSibling.style.display='none';" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                <span class="icon-label">${seed}</span>
            `;
            
            robotsGrid.appendChild(iconOption);
        });
    }

    populateAdventurerIcons() {
        const adventurersGrid = document.getElementById('adventurers-grid');
        if (!adventurersGrid) return;

        adventurersGrid.innerHTML = '';
        
        // Adventurer seeds
        const adventurerSeeds = [
            'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Mason', 'Sophia', 'Lucas', 'Mia', 'Ethan',
            'Isabella', 'William', 'Charlotte', 'James', 'Amelia', 'Benjamin', 'Harper', 'Evelyn', 'Henry',
            'Abigail', 'Alexander', 'Emily', 'Michael', 'Elizabeth', 'Daniel', 'Sofia', 'Matthew', 'Avery', 'Jackson'
        ];

        adventurerSeeds.forEach(seed => {
            const url = `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(seed)}`;
            const isSelected = this.currentSelectedIcon === url;
            
            const iconOption = document.createElement('button');
            iconOption.className = `icon-option ${isSelected ? 'selected' : ''}`;
            iconOption.type = 'button';
            iconOption.onclick = () => this.selectIcon(url, 'adventurer');
            
            iconOption.innerHTML = `
                <img src="${url}" alt="Adventurer ${seed}" loading="lazy" onload="this.nextElementSibling.style.display='none';" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                <span class="icon-label">${seed}</span>
            `;
            
            adventurersGrid.appendChild(iconOption);
        });
    }

    populateEmojiIcons() {
        const emojisGrid = document.getElementById('emojis-grid');
        if (!emojisGrid) return;

        emojisGrid.innerHTML = '';
        
        // Fun emoji seeds
        const emojiSeeds = [
            'Happy', 'Joy', 'Laugh', 'Smile', 'Grin', 'Wink', 'Love', 'Heart', 'Star', 'Sun',
            'Moon', 'Rainbow', 'Fire', 'Lightning', 'Thunder', 'Storm', 'Cloud', 'Snow', 'Rain', 'Wind',
            'Flower', 'Tree', 'Leaf', 'Butterfly', 'Bee', 'Bird', 'Cat', 'Dog', 'Fish', 'Dolphin',
            'Pizza', 'Burger', 'Cake', 'Ice', 'Coffee', 'Tea', 'Apple', 'Banana', 'Grape', 'Cherry',
            'Car', 'Bike', 'Plane', 'Boat', 'Train', 'Bus', 'Rocket', 'Balloon', 'Gift', 'Party'
        ];

        emojiSeeds.forEach(seed => {
            const url = `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(seed)}`;
            const isSelected = this.currentSelectedIcon === url;
            
            const iconOption = document.createElement('button');
            iconOption.className = `icon-option ${isSelected ? 'selected' : ''}`;
            iconOption.type = 'button';
            iconOption.onclick = () => this.selectIcon(url, 'emoji');
            
            iconOption.innerHTML = `
                <img src="${url}" alt="Fun Emoji ${seed}" loading="lazy" onload="this.nextElementSibling.style.display='none';" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                <span class="icon-label">${seed}</span>
            `;
            
            emojisGrid.appendChild(iconOption);
        });
    }

    setupIconPickerTabs() {
        const tabs = document.querySelectorAll('.icon-tab');
        const tabContents = document.querySelectorAll('.icon-tab-content');

        tabs.forEach(tab => {
            tab.onclick = () => {
                // Remove active class from all tabs and contents
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked tab and corresponding content
                tab.classList.add('active');
                const tabId = tab.dataset.tab;
                const content = document.getElementById(`${tabId}-tab`);
                if (content) {
                    content.classList.add('active');
                }
            };
        });
    }

    selectIcon(iconUrl, iconType) {
        // Store the selection
        this.currentSelectedIcon = iconUrl;
        
        // If there's a callback, call it with the selected icon
        if (this.iconPickerCallback) {
            this.iconPickerCallback(iconUrl, iconType);
        }
        
        // Close the picker
        this.closeIconPicker();
    }

    // Icon picker callback handlers
    handleAddChildIconSelect(iconUrl, iconType) {
        const mainCircle = document.getElementById('add-child-avatar-preview-circle');
        
        if (!mainCircle) return;

        // Clear existing preview
        mainCircle.innerHTML = '';

        // All new icon types are images from DiceBear API
        if (iconType === 'robot' || iconType === 'adventurer' || iconType === 'emoji') {
            // Put the icon directly in the main avatar circle
            mainCircle.innerHTML = `<img src="${iconUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
            mainCircle.dataset.avatarUrl = iconUrl;
        }

        // Update the preview circle
        this.updateAddChildAvatarPreview();
    }

    updateAddChildAvatarPreview() {
        const mainCircle = document.getElementById('add-child-avatar-preview-circle');
        const colorInput = document.getElementById('child-color');
        
        if (!mainCircle || !colorInput) return;

        // Update the background color of the preview circle
        const selectedColor = colorInput.value;
        mainCircle.style.backgroundColor = selectedColor;
        
        // If there's an avatar image, make sure it's displayed
        const avatarUrl = mainCircle.dataset.avatarUrl;
        if (avatarUrl && !mainCircle.querySelector('img')) {
            mainCircle.innerHTML = `<img src="${avatarUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        }
    }

    updateEditChildAvatarPreview2() {
        const mainCircle = document.getElementById('edit-child-avatar-preview-circle');
        const colorInput = document.getElementById('edit-child-color');
        
        if (!mainCircle || !colorInput) return;

        const selectedColor = colorInput.value;
        mainCircle.style.backgroundColor = selectedColor;
        
        const avatarUrl = mainCircle.dataset.avatarUrl;
        if (avatarUrl && !mainCircle.querySelector('img')) {
            mainCircle.innerHTML = `<img src="${avatarUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        }
    }

    setupAddChildModal() {
        // Set initial active state for color presets
        const colorInput = document.getElementById('child-color');
        const addChildModal = document.getElementById('add-child-modal');
        
        if (colorInput && addChildModal) {
            const currentColor = colorInput.value;
            
            // Remove active state from all presets
            addChildModal.querySelectorAll('.color-preset').forEach(p => p.classList.remove('active'));
            
            // Set active state for matching preset
            const matchingPreset = addChildModal.querySelector(`.color-preset[data-color="${currentColor}"]`);
            if (matchingPreset) {
                matchingPreset.classList.add('active');
            }
            
            // Update avatar preview
            this.updateAddChildAvatarPreview();
        }
    }

    setupEditChildModal() {
        // Set initial active state for color presets
        const colorInput = document.getElementById('edit-child-color');
        const editChildModal = document.getElementById('edit-child-modal');
        
        if (colorInput && editChildModal) {
            const currentColor = colorInput.value;
            editChildModal.querySelectorAll('.color-preset').forEach(p => p.classList.remove('active'));
            const matchingPreset = editChildModal.querySelector(`.color-preset[data-color="${currentColor}"]`);
            if (matchingPreset) {
                matchingPreset.classList.add('active');
            }
            this.updateEditChildAvatarPreview2();
        }
    }

    handleEditChildIconSelect(iconUrl, iconType) {
        const mainCircle = document.getElementById('edit-child-avatar-preview-circle');
        
        if (!mainCircle) return;

        // Clear existing preview
        mainCircle.innerHTML = '';

        // All new icon types are images from DiceBear API
        if (iconType === 'robot' || iconType === 'adventurer' || iconType === 'emoji') {
            // Put the icon directly in the main avatar circle
            mainCircle.innerHTML = `<img src="${iconUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
            mainCircle.dataset.avatarUrl = iconUrl;
        }

        // Update the preview circle
        this.updateEditChildAvatarPreview2();
    }

    handlePageEditChildIconSelect(iconUrl, iconType) {
        const previewCircle = document.getElementById('page-edit-child-avatar-preview-circle');
        const form = document.getElementById('page-edit-child-form');
        
        if (!previewCircle || !form) return;

        // Clear existing preview
        previewCircle.innerHTML = '';

        // All new icon types are images from DiceBear API
        if (iconType === 'robot' || iconType === 'adventurer' || iconType === 'emoji') {
            // Put the icon directly in the main avatar circle
            previewCircle.innerHTML = `<img src="${iconUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
            
            // Store the icon URL in the form for submission
            form.dataset.avatarUrl = iconUrl;
        }
    }

    async handlePageEditChildSave() {
        const form = document.getElementById('page-edit-child-form');
        const childId = form.dataset.childId;
        
        if (!childId) {
            this.showToast('No child selected for editing', 'error');
            return;
        }

        const name = document.getElementById('page-edit-child-name').value.trim();
        const age = parseInt(document.getElementById('page-edit-child-age').value);
        const avatarColor = document.getElementById('page-edit-child-color').value;
        const avatarUrl = form.dataset.avatarUrl || null;
        const avatarFile = form.dataset.avatarFile || null;

        if (!name || !age) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }

        try {
            const result = await this.apiClient.updateChild(childId, {
                name,
                age,
                avatar_color: avatarColor,
                avatar_url: avatarUrl,
                avatar_file: avatarFile
            });

            if (!result.success) {
                throw new Error(result.error || 'Failed to update child');
            }

            // Update the child in the local array
            const childIndex = this.children.findIndex(c => c.id === childId);
            if (childIndex !== -1) {
                this.children[childIndex] = { ...this.children[childIndex], ...result.child };
            }

            // Refresh the manage children list
            this.populateManageChildrenList();
            
            // Also refresh the children list in the main app
            this.renderChildren();

            this.showToast(`${name} has been updated successfully!`, 'success');
            
            // Close the page modal instead of advancing to next child
            this.closeEditChildrenPage();
            
        } catch (error) {
            console.error('Error updating child:', error);
            this.showToast('Failed to update child. Please try again.', 'error');
        }
    }

    nextChild() {
        if (this.currentEditIndex < this.children.length - 1) {
            this.currentEditIndex++;
            this.loadChildForPageEdit(this.currentEditIndex);
            this.updatePageEditNavigation();
        }
    }

    previousChild() {
        if (this.currentEditIndex > 0) {
            this.currentEditIndex--;
            this.loadChildForPageEdit(this.currentEditIndex);
            this.updatePageEditNavigation();
        }
    }

    loadChildForPageEdit(index) {
        const child = this.children[index];
        if (!child) return;

        // Populate the edit form with child data
        document.getElementById('page-edit-child-name').value = child.name;
        document.getElementById('page-edit-child-age').value = child.age;
        document.getElementById('page-edit-child-color').value = child.avatar_color || '#6366f1';
        
        // Set the child ID for the form
        document.getElementById('page-edit-child-form').dataset.childId = child.id;
        
        // Update avatar preview
        this.updatePageEditChildAvatarPreview(child);
        
        // Setup color presets
        this.setupPageEditChildColorPresets();
    }

    updatePageEditNavigation() {
        const prevBtn = document.getElementById('prev-child-btn');
        const nextBtn = document.getElementById('next-child-btn');
        const counter = document.getElementById('child-counter');
        const progressFill = document.getElementById('edit-progress-fill');
        
        if (this.children.length === 0) {
            prevBtn.disabled = true;
            nextBtn.disabled = true;
            counter.textContent = '0 of 0';
            progressFill.style.width = '0%';
            return;
        }
        
        prevBtn.disabled = this.currentEditIndex === 0;
        nextBtn.disabled = this.currentEditIndex === this.children.length - 1;
        counter.textContent = `${this.currentEditIndex + 1} of ${this.children.length}`;
        
        // Update progress bar
        const progress = ((this.currentEditIndex + 1) / this.children.length) * 100;
        progressFill.style.width = `${progress}%`;
    }

    showPageModal(pageId) {
        const page = document.getElementById(pageId);
        if (!page) return;
        
        // Prevent body scroll when page modal is open
        document.body.classList.add('page-modal-open');
        
        // Close all other modals first
        const allModals = document.querySelectorAll('.modal, .page-modal');
        allModals.forEach(m => {
            if (m.id !== pageId) {
                m.classList.add('hidden');
            }
        });
        page.classList.remove('hidden');
    }

    hidePageModal(pageId) {
        const page = document.getElementById(pageId);
        if (page) {
            page.classList.add('hidden');
        }
        
        // Re-enable body scroll when page modal is closed
        document.body.classList.remove('page-modal-open');
    }

    updatePageEditChildAvatarPreview(child) {
        const avatarPreviewCircle = document.getElementById('page-edit-child-avatar-preview-circle');
        const form = document.getElementById('page-edit-child-form');
        
        if (!avatarPreviewCircle || !form) return;
        
        // Clear the circle first
        avatarPreviewCircle.innerHTML = '';
        
        if (child.avatar_url) {
            // Show the current avatar image in the main circle
            avatarPreviewCircle.innerHTML = `<img src="${child.avatar_url}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
            form.dataset.avatarUrl = child.avatar_url;
            form.dataset.avatarFile = '';
        } else if (child.avatar_file) {
            // Show the current avatar file in the main circle
            avatarPreviewCircle.innerHTML = `<img src="${child.avatar_file}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
            form.dataset.avatarUrl = '';
            form.dataset.avatarFile = child.avatar_file;
        } else {
            // Show initial letter in circle
            avatarPreviewCircle.textContent = child.name.charAt(0).toUpperCase();
            avatarPreviewCircle.style.background = child.avatar_color || '#6366f1';
            form.dataset.avatarUrl = '';
            form.dataset.avatarFile = '';
        }
    }

    setupPageEditChildColorPresets() {
        const selectedColor = document.getElementById('page-edit-selected-color');
        
        // Setup color presets for page edit form
        document.querySelectorAll('#edit-children-page .color-preset').forEach(preset => {
            preset.addEventListener('click', () => {
                const color = preset.dataset.color;
                document.getElementById('page-edit-child-color').value = color;
                
                // Update active state
                document.querySelectorAll('#edit-children-page .color-preset').forEach(p => p.classList.remove('active'));
                preset.classList.add('active');
                
                // Update preview
                if (selectedColor) {
                    selectedColor.style.background = color;
                }
                const avatarPreviewCircle = document.getElementById('page-edit-child-avatar-preview-circle');
                if (avatarPreviewCircle) {
                    avatarPreviewCircle.style.background = color;
                }
            });
        });
        
        // Setup avatar color change handler
        document.getElementById('page-edit-child-color').addEventListener('change', (e) => {
            const color = e.target.value;
            if (selectedColor) {
                selectedColor.style.background = color;
            }
            const avatarPreviewCircle = document.getElementById('page-edit-child-avatar-preview-circle');
            if (avatarPreviewCircle) {
                avatarPreviewCircle.style.background = color;
            }
        });
        
        // Setup remove avatar button
        const removeAvatarBtn = document.getElementById('page-edit-avatar-remove-btn');
        if (removeAvatarBtn) {
            removeAvatarBtn.addEventListener('click', () => {
                const avatarPreviewCircle = document.getElementById('page-edit-child-avatar-preview-circle');
                const form = document.getElementById('page-edit-child-form');
                
                if (avatarPreviewCircle) {
                    const childName = document.getElementById('page-edit-child-name').value;
                    avatarPreviewCircle.innerHTML = '';
                    avatarPreviewCircle.textContent = childName.charAt(0).toUpperCase();
                    avatarPreviewCircle.style.background = document.getElementById('page-edit-child-color').value;
                }
                
                if (form) {
                    form.dataset.avatarUrl = '';
                    form.dataset.avatarFile = '';
                }
            });
        }
    }

    async handleEditChild() {
        const form = document.getElementById('page-edit-child-form');
        const childId = form.dataset.childId;
        
        if (!childId) {
            this.showToast('No child selected for editing', 'error');
            return;
        }

        const name = document.getElementById('page-edit-child-name').value.trim();
        const age = parseInt(document.getElementById('page-edit-child-age').value);
        const avatarColor = document.getElementById('page-edit-child-color').value;
        const avatarUrl = form.dataset.avatarUrl || null;
        const avatarFile = form.dataset.avatarFile || null;

        if (!name || !age) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }

        try {
            const result = await this.apiClient.updateChild(childId, {
                name,
                age,
                avatar_color: avatarColor,
                avatar_url: avatarUrl,
                avatar_file: avatarFile
            });

            if (!result.success) {
                throw new Error(result.error || 'Failed to update child');
            }

            // Update the child in the local array
            const childIndex = this.children.findIndex(c => c.id === childId);
            if (childIndex !== -1) {
                this.children[childIndex] = { ...this.children[childIndex], ...result.child };
            }

            // Refresh the manage children list
            this.populateManageChildrenList();
            
            // Also refresh the children list in the main app
            this.renderChildren();

            this.showToast(`${name} has been updated successfully!`, 'success');
            
            // If in edit page mode, advance to next child or finish
            if (this.editPageMode) {
                if (this.currentEditIndex < this.children.length - 1) {
                    // Move to next child
                    this.nextChild();
                } else {
                    // Finished editing all children
                    this.closeEditChildrenPage();
                    // "All children have been updated!" toast removed - redundant
                }
            }
            
        } catch (error) {
            console.error('Error updating child:', error);
            this.showToast('Failed to update child. Please try again.', 'error');
        }
    }

    async handleEditChildModal() {
        const form = document.getElementById('edit-child-form');
        const childId = form.dataset.childId;
        
        if (!childId) {
            this.showToast('No child selected for editing', 'error');
            return;
        }

        const name = document.getElementById('edit-child-name').value.trim();
        const age = parseInt(document.getElementById('edit-child-age').value);
        const avatarColor = document.getElementById('edit-child-color').value;
        const avatarUrl = document.getElementById('edit-child-avatar-preview-circle').dataset.avatarUrl || null;
        const avatarFile = document.getElementById('edit-child-avatar-preview-circle').dataset.avatarFile || null;

        if (!name || !age) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }

        try {
            const result = await this.apiClient.updateChild(childId, {
                name,
                age,
                avatar_color: avatarColor,
                avatar_url: avatarUrl,
                avatar_file: avatarFile
            });

            if (!result.success) {
                throw new Error(result.error || 'Failed to update child');
            }

            // Update the child in the local array
            const childIndex = this.children.findIndex(c => c.id === childId);
            if (childIndex !== -1) {
                this.children[childIndex] = { ...this.children[childIndex], ...result.child };
            }

            // Refresh the manage children list
            this.populateManageChildrenList();
            
            // Also refresh the children list in the main app
            this.renderChildren();

            this.showToast(`${name} has been updated successfully!`, 'success');
            
            // Close the modal
            this.hideModal('edit-child-modal');
            
        } catch (error) {
            console.error('Error updating child:', error);
            this.showToast('Failed to update child. Please try again.', 'error');
        }
    }

    async showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        // Prevent body scroll when modal is open
        document.body.classList.add('modal-open');
        
        // Close all other modals first
        const allModals = document.querySelectorAll('.modal');
        allModals.forEach(m => {
            if (m.id !== modalId) {
                m.classList.add('hidden');
            }
        });
        modal.classList.remove('hidden');
        
        // Populate child select for chore form and check premium features
        if (modalId === 'add-chore-modal') {
            this.populateChildSelect();
        }
        if (modalId === 'edit-chore-modal') {
            await this.checkPremiumFeatures();
        }
        if (modalId === 'add-child-modal') {
            this.setupAddChildModal();
        }
        
        if (modalId === 'edit-child-modal') {
            this.setupEditChildModal();
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
        }
        
        // Re-enable body scroll when modal is closed
        document.body.classList.remove('modal-open');
        
        // Reset forms
        if (modalId === 'add-child-modal') {
            document.getElementById('add-child-form').reset();
        } else if (modalId === 'add-chore-modal') {
            document.getElementById('add-chore-form').reset();
            // Reset chore entries to just one WITH color picker
            const container = document.getElementById('chores-container');
            container.innerHTML = `
                <div class="chore-entry">
                    <div class="chore-entry-header">
                        <h3>Chore #1</h3>
                        <button type="button" class="btn btn-outline btn-sm remove-chore" style="display: none;">Remove</button>
                    </div>
                    <div class="form-group">
                        <label for="chore-name-1">Chore Name</label>
                        <input type="text" id="chore-name-1" required placeholder="e.g., Make bed">
                    </div>
                    <!-- Premium Features -->
                    <div class="premium-features" id="premium-chore-features-1" style="display: none;">
                        <div class="form-group">
                            <label for="chore-color-1">Chore Color</label>
                            <div class="color-picker-row" style="display: flex; align-items: center; gap: var(--space-2);">
                                <input type="color" id="chore-color-1" value="#ff6b6b" style="width: 48px; height: 32px; border: none; background: none; cursor: pointer;">
                                <div class="color-presets" style="display: flex; gap: var(--space-1);">
                                    <button type="button" class="color-preset" data-color="#ff6b6b" style="width: 24px; height: 24px; background: #ff6b6b; border: 2px solid #fff; border-radius: 50%; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"></button>
                                    <button type="button" class="color-preset" data-color="#4ecdc4" style="width: 24px; height: 24px; background: #4ecdc4; border: 2px solid #fff; border-radius: 50%; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"></button>
                                    <button type="button" class="color-preset" data-color="#45b7d1" style="width: 24px; height: 24px; background: #45b7d1; border: 2px solid #fff; border-radius: 50%; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"></button>
                                    <button type="button" class="color-preset" data-color="#96ceb4" style="width: 24px; height: 24px; background: #96ceb4; border: 2px solid #fff; border-radius: 50%; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"></button>
                                    <button type="button" class="color-preset" data-color="#feca57" style="width: 24px; height: 24px; background: #feca57; border: 2px solid #fff; border-radius: 50%; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"></button>
                                    <button type="button" class="color-preset" data-color="#ff9ff3" style="width: 24px; height: 24px; background: #ff9ff3; border: 2px solid #fff; border-radius: 50%; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"></button>
                                </div>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="chore-icon-1">Chore Icon</label>
                            <div class="icon-picker" id="icon-picker-1">
                                <button type="button" class="icon-option active" data-icon="📝">📝</button>
                                <button type="button" class="icon-option" data-icon="🛏">🛏</button>
                                <button type="button" class="icon-option" data-icon="🧽">🧽</button>
                                <button type="button" class="icon-option" data-icon="🧺">🧺</button>
                                <button type="button" class="icon-option" data-icon="🍴">🍴</button>
                            </div>
                            <input type="hidden" id="chore-icon-1" value="📝">
                        </div>
                        <div class="form-group">
                            <label for="chore-category-1">Category</label>
                            <select id="chore-category-1">
                                <option value="General">General</option>
                                <option value="Kitchen">Kitchen</option>
                                <option value="Bedroom">Bedroom</option>
                                <option value="Bathroom">Bathroom</option>
                                <option value="Outdoor">Outdoor</option>
                                <option value="School">School</option>
                                <option value="Pets">Pets</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="chore-notes-1">Notes (Optional)</label>
                            <textarea id="chore-notes-1" placeholder="e.g., Remember to use soap!" rows="2"></textarea>
                        </div>
                    </div>
                    <div class="form-group">
                        <small style="color: var(--gray-600);">Each completed day earns 7¢</small>
                    </div>
                    <div class="premium-upgrade-prompt" id="premium-upgrade-prompt-1" style="display: none;">
                        <div class="upgrade-banner">
                            <span>🌟</span>
                            <span>Upgrade to Premium for custom colors, icons, categories, and more!</span>
                            <button type="button" class="btn btn-primary btn-sm" onclick="app.showUpgradeModal()">Upgrade</button>
                        </div>
                    </div>
                </div>
            `;
        } else if (modalId === 'settings-modal') {
            document.getElementById('settings-form').reset();
        } else if (modalId === 'edit-chore-modal') {
            document.getElementById('edit-chore-form').reset();
            delete document.getElementById('edit-chore-form').dataset.choreId;
            delete document.getElementById('edit-chore-form').dataset.returnChildId;
        } else if (modalId === 'new-features-modal') {
            // Mark features as seen when modal is closed
            this.markNewFeaturesAsSeen();
        }
    }

    async handleAddChild() {
        console.log('handleAddChild called');
        
        // Check if modal is visible
        const modal = document.getElementById('add-child-modal');
        console.log('Modal visibility:', modal ? modal.classList.contains('hidden') : 'modal not found');
        
        // Prevent duplicate submissions immediately
        if (this.isAddingChild) {
            console.log('Preventing duplicate child submission - already in progress');
            return;
        }
        this.isAddingChild = true;

        const addChildButton = document.querySelector('button[form="add-child-form"]');
        console.log('Add child button found:', addChildButton);

        try {
            const nameInput = document.getElementById('child-name');
            const ageInput = document.getElementById('child-age');
            const colorInput = document.getElementById('child-color');
            
            console.log('Form inputs found:', { nameInput, ageInput, colorInput });
            
            const name = nameInput ? nameInput.value : '';
            const age = ageInput ? parseInt(ageInput.value) : 0;
            const color = colorInput ? colorInput.value : '';
            
            console.log('Form values:', { name, age, color });
            let avatarUrl = '';
            let avatarFile = '';
            const avatarPreview = document.getElementById('add-child-avatar-preview-circle');
            if (avatarPreview) {
                if (avatarPreview.dataset.avatarUrl) {
                    avatarUrl = avatarPreview.dataset.avatarUrl;
                } else if (avatarPreview.dataset.avatarFile) {
                    avatarFile = avatarPreview.dataset.avatarFile;
                }
            }

            if (!name || !age) {
                this.showToast('Please fill in all fields', 'error');
                this.isAddingChild = false;
                return;
            }

            // Set loading state on add child button
            this.setButtonLoading(addChildButton, true);

            // Check subscription limits
            const limits = await this.apiClient.checkSubscriptionLimits();
            if (!limits.canAddChildren) {
                this.setButtonLoading(addChildButton, false);
                this.isAddingChild = false;
                this.showUpgradeModal();
                return;
            }

            // Pass avatar info to createChild
            console.log('Creating child with:', { name, age, color, avatarUrl, avatarFile });
            const result = await this.apiClient.createChild(name, age, color, avatarUrl, avatarFile);
            console.log('Create child result:', result);
            
            this.setButtonLoading(addChildButton, false);
            
            if (result.success) {
                console.log('Child created successfully, loading children...');
                window.analytics.trackAddChild(name, age);
                
                // Load and render children BEFORE closing modal
                await this.loadChildren();
                console.log('Children loaded:', this.children);
                
                this.renderChildren();
                console.log('Children rendered');
                
                // Now close modal and show success
                this.hideModal('add-child-modal');
                this.showToast(`Added ${name} to your family!`, 'success');
            } else {
                console.error('Failed to create child:', result.error);
                window.analytics.trackError('add_child', result.error);
                this.showToast(result.error, 'error');
            }
        } catch (error) {
            console.error('Error adding child:', error);
            this.showToast('Failed to add child. Please try again.', 'error');
            this.setButtonLoading(addChildButton, false);
        } finally {
            this.isAddingChild = false;
        }
    }

    async handleAddChore() {
        const childId = document.getElementById('chore-child').value;
        
        if (!childId) {
            this.showToast('Please select a child', 'error');
            return;
        }

        // Track active child before creating chores
        this.activeChildId = childId;

        // Check subscription limits for chores
        const limits = await this.apiClient.checkSubscriptionLimits();
        if (!limits.canAddChores) {
            this.showUpgradeModal();
            this.showToast(`Free plan limit: ${limits.maxChores} chores. Upgrade for unlimited chores!`, 'warning');
            return;
        }

        // Get all chore entries
        const choreEntries = document.querySelectorAll('.chore-entry');
        const choresToAdd = [];

        for (let i = 0; i < choreEntries.length; i++) {
            const entry = choreEntries[i];
            const name = entry.querySelector(`#chore-name-${i + 1}`).value;
            
            // Improved icon selection logic
            let icon = '📝'; // default
            const iconInput = entry.querySelector(`#chore-icon-${i + 1}`);
            if (iconInput && iconInput.value) {
                icon = iconInput.value;
            } else {
                // Fallback: check for active icon in picker
                const activePicker = entry.querySelector('.icon-picker .icon-option.active');
                if (activePicker) {
                    icon = activePicker.dataset.icon;
                }
            }
            
            const category = entry.querySelector(`#chore-category-${i + 1}`)?.value || 'household_chores';
            const notes = entry.querySelector(`#chore-notes-${i + 1}`)?.value || '';
            let color = null;
            if (limits.isPremium) {
                color = entry.querySelector(`#chore-color-${i + 1}`)?.value || null;
            }

            if (name) {
                choresToAdd.push({ name, childId, icon, category, notes, color });
            }
        }

        if (choresToAdd.length === 0) {
            this.showToast('Please fill in at least one chore', 'error');
            return;
        }

        // Find and set loading state on add chore button
        const addChoreButton = document.querySelector('#add-chore-form button[type="submit"]');
        this.setButtonLoading(addChoreButton, true);

        // Prevent duplicate submissions
        const submissionKey = `add-chore-${childId}-${choresToAdd.length}`;
        const now = Date.now();
        const lastSubmission = this.formSubmissions.get(submissionKey);
        if (lastSubmission && (now - lastSubmission) < 2000) { // 2 second debounce
            console.log('Preventing duplicate chore submission');
            this.setButtonLoading(addChoreButton, false);
            return;
        }
        this.formSubmissions.set(submissionKey, now);

        // Create all chores
        let successCount = 0;
        let errorCount = 0;

        for (const chore of choresToAdd) {
            const result = await this.apiClient.createChore(chore.name, 7, chore.childId, chore.icon, chore.category, chore.notes, chore.color);
            
            if (result.success) {
                successCount++;
            } else {
                errorCount++;
                console.error('Failed to create chore:', chore.name, result.error);
            }
        }

        if (successCount > 0) {
            // Reload chores to ensure consistency
            await this.loadChores();
            this.renderChildren();
            
            // Switch back to active child tab after rendering
            setTimeout(() => {
                if (this.activeChildId) {
                    this.switchChildTab(this.activeChildId);
                }
            }, 100);
            
            this.hideModal('add-chore-modal');
            
            if (successCount === choresToAdd.length) {
                this.showToast(`Added ${successCount} chore${successCount > 1 ? 's' : ''}!`, 'success');
            } else {
                this.showToast(`Added ${successCount} chore${successCount > 1 ? 's' : ''}, ${errorCount} failed`, 'warning');
            }
        } else {
            this.showToast('Failed to add any chores', 'error');
        }

        // Reset loading state
        this.setButtonLoading(addChoreButton, false);
    }

    async handleUpdateSettings() {
        const dailyReward = parseInt(document.getElementById('daily-reward').value);
        const weeklyBonus = parseInt(document.getElementById('weekly-bonus').value);
        const currencyCode = document.getElementById('currency-select').value;
        const dateFormat = document.getElementById('date-format-select').value;
        const language = document.getElementById('language-select').value;

        if (!dailyReward || !weeklyBonus || !currencyCode || !dateFormat || !language) {
            this.showToast(t('please_fill_all_fields'), 'error');
            return;
        }

        // Find and set loading state on save settings button
        const saveButton = document.querySelector('#settings-form button[type="submit"]');
        this.setButtonLoading(saveButton, true);

        const result = await this.apiClient.updateFamilySettings({
            daily_reward_cents: dailyReward,
            weekly_bonus_cents: weeklyBonus,
            currency_code: currencyCode,
            date_format: dateFormat,
            language: language
        });
        
        this.setButtonLoading(saveButton, false);
        
        if (result.success) {
            this.familySettings = result.settings;
            
            // Change language if it was updated
            if (language !== getCurrentLanguage()) {
                changeLanguage(language);
                this.showToast(t('language_changed_success'), 'info');
            }
            
            // Refresh the display to show new currency formatting
            this.renderChildren();
            this.hideModal('settings-modal');
            this.showToast(t('settings_updated_success'), 'success');
        } else {
            this.showToast(result.error || t('something_went_wrong'), 'error');
        }
    }



    async showSettingsModal() {
        this.showModal('settings-modal');
        await this.loadFamilySettings();
        await this.loadChildrenList();
        await this.loadChoresList();
        await this.loadCompletions(); // Add this line to load completions data
        this.generateChildTabs();
        this.populateManageChildrenList();
        this.checkPremiumFeatures();
        
        // Populate settings form with current values
        if (this.familySettings) {
            document.getElementById('daily-reward').value = this.familySettings.daily_reward_cents || 7;
            document.getElementById('weekly-bonus').value = this.familySettings.weekly_bonus_cents || 1;
            document.getElementById('currency-select').value = this.familySettings.currency_code || 'USD';
            document.getElementById('date-format-select').value = this.familySettings.date_format || 'auto';
            document.getElementById('language-select').value = this.familySettings.language || 'en';
            
            // Populate footer selectors
            const footerLanguageSelect = document.getElementById('footer-language-select');
            const footerCurrencySelect = document.getElementById('footer-currency-select');
            if (footerLanguageSelect) {
                footerLanguageSelect.value = this.familySettings.language || 'en';
            }
            if (footerCurrencySelect) {
                footerCurrencySelect.value = this.familySettings.currency_code || 'USD';
            }
        }
    }

    switchSettingsTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        // Load specific tab data
        if (tabName === 'appearance') {
            this.loadAppearanceTab();
        } else if (tabName === 'insights') {
            this.loadInsightsTab();
        }
    }



    async loadFamilySettings() {
        try {
            const settings = await this.apiClient.getFamilySettings();
            if (settings) {
                this.familySettings = settings;
                document.getElementById('daily-reward').value = settings.daily_reward_cents;
                document.getElementById('weekly-bonus').value = settings.weekly_bonus_cents;
            }
        } catch (error) {
            console.error('Error loading family settings:', error);
        }
    }

    async loadAppearanceTab() {
        // Populate current theme display
        this.updateCurrentThemeDisplay();
        
        // Populate available themes grid
        this.populateThemesGrid();
        
        // Load theme settings
        this.loadThemeSettings();
    }

    updateCurrentThemeDisplay() {
        const currentThemeDisplay = document.getElementById('current-theme-display');
        if (!currentThemeDisplay) return;
        
        const currentTheme = this.getCurrentSeasonalTheme();
        if (currentTheme) {
            currentThemeDisplay.innerHTML = `
                <div class="current-theme-card">
                    <div class="theme-preview-large" style="background: ${currentTheme.decorations.background}">
                        <div class="theme-preview-content">
                            <div class="theme-icon-large">${currentTheme.icon}</div>
                            <div class="theme-preview-text">${currentTheme.decorations.header}</div>
                        </div>
                    </div>
                    <div class="theme-info">
                        <h5>${currentTheme.name}</h5>
                        <p>Active until ${this.getThemeEndDate(currentTheme)}</p>
                        <button class="btn btn-outline btn-sm" onclick="app.disableSeasonalTheme()">
                            Disable Theme
                        </button>
                    </div>
                </div>
            `;
        } else {
            currentThemeDisplay.innerHTML = `
                <div class="no-theme-message">
                    <div class="no-theme-icon">🎨</div>
                    <p>No seasonal theme active</p>
                    <small>Browse available themes below to get started!</small>
                </div>
            `;
        }
    }

    populateThemesGrid() {
        const themesGrid = document.getElementById('themes-grid');
        if (!themesGrid) return;
        
        const themes = this.seasonalThemes;
        const currentTheme = this.getCurrentSeasonalTheme();
        
        themesGrid.innerHTML = Object.entries(themes).map(([key, theme]) => {
            const isActive = currentTheme && currentTheme.name === theme.name;
            const isAvailable = this.isThemeAvailable(theme);
            const isUpcoming = this.isThemeUpcoming(theme);
            const isEnabled = this.isSeasonalThemeEnabled(key);
            
            return `
                <div class="theme-card ${isActive ? 'active' : ''} ${!isAvailable && !isUpcoming ? 'disabled' : ''} ${!isEnabled ? 'theme-disabled' : ''}">
                    <div class="theme-preview" style="background: ${theme.decorations.background}; opacity: ${isEnabled ? '1' : '0.5'}">
                        <div class="theme-preview-content">
                            <div class="theme-icon">${theme.icon}</div>
                            <div class="theme-preview-text">${theme.decorations.header}</div>
                        </div>
                    </div>
                    <div class="theme-info">
                        <h5>${theme.name}</h5>
                        <p>${this.getThemeDateRange(theme)}</p>
                        ${isUpcoming ? '<span class="upcoming-badge">Coming Soon</span>' : ''}
                        <div class="theme-toggle" onclick="event.stopPropagation();">
                            <label class="toggle-switch">
                                <input type="checkbox" 
                                       ${isEnabled ? 'checked' : ''} 
                                       onchange="app.toggleSeasonalTheme('${key}', this.checked)">
                                <span class="toggle-slider"></span>
                                <span class="toggle-label">${isEnabled ? 'Enabled' : 'Disabled'}</span>
                            </label>
                    </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    isThemeUpcoming(theme) {
        const today = new Date();
        const currentDate = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        return currentDate < theme.startDate;
    }

    isThemeAvailable(theme) {
        const today = new Date();
        const currentDate = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        return currentDate >= theme.startDate && currentDate <= theme.endDate;
    }

    getThemeDateRange(theme) {
        const startDate = this.formatThemeDate(theme.startDate);
        const endDate = this.formatThemeDate(theme.endDate);
        return `${startDate} - ${endDate}`;
    }

    getThemeEndDate(theme) {
        return this.formatThemeDate(theme.endDate);
    }

    // formatThemeDate is now defined above with international support

    loadThemeSettings() {
        // Load saved theme settings from localStorage
        const autoThemes = localStorage.getItem('auto-seasonal-themes') !== 'false';
        const seasonalNotifications = localStorage.getItem('seasonal-notifications') !== 'false';
        
        document.getElementById('auto-seasonal-themes').checked = autoThemes;
        document.getElementById('seasonal-notifications').checked = seasonalNotifications;
        
        // Show/hide premium notice based on user status
        const premiumNotice = document.getElementById('seasonal-premium-notice');
        if (premiumNotice) {
            premiumNotice.style.display = this.isPremiumUser() ? 'none' : 'block';
        }
    }

    async loadInsightsTab() {
        // Initialize analytics
        this.initializeAnalytics();
        
        // Load notification preferences
        this.loadNotificationPreferences();
        
        // Check notification permissions
        this.checkNotificationPermissions();
    }

    activateTheme(themeKey) {
        if (!this.isPremiumUser()) {
            this.showToast('Upgrade to Premium to use seasonal themes!', 'error');
            return;
        }
        
        const theme = this.seasonalThemes[themeKey];
        if (!theme) return;
        
        // Apply the theme
        this.applySpecificTheme(theme);
        
        // Update the display
        this.updateCurrentThemeDisplay();
        
        // Theme activation toast removed - redundant with seasonal theme message
    }

    applySpecificTheme(theme) {
        // Apply theme decorations
        const header = document.querySelector('.app-header h1');
        if (header) {
            header.textContent = theme.decorations.header;
        }
        
        // Apply background gradient to header
        const appHeader = document.querySelector('.app-header');
        if (appHeader) {
            const isDarkMode = document.body.getAttribute('data-theme') === 'dark';
            if (!isDarkMode) {
                // Apply the gradient in light mode
                appHeader.style.background = theme.decorations.background;
            } else {
                // In dark mode, let CSS handle the background (clear inline style)
                appHeader.style.background = '';
            }
        }
        
        // IMPORTANT: Clear any inline background styles on body and app-container
        // This ensures CSS rules with !important take precedence
        document.body.style.removeProperty('background');
        document.body.style.removeProperty('background-color');
        
        const appContainer = document.querySelector('.app-container');
        if (appContainer) {
            appContainer.style.removeProperty('background');
            appContainer.style.removeProperty('background-color');
        }
        
        // Apply accent color CSS variable
        document.documentElement.style.setProperty('--seasonal-accent', theme.decorations.accentColor);
        
        // Add seasonal class to body (this is what triggers the CSS backgrounds)
        document.body.classList.add(theme.decorations.bodyClass);
        
        // Add seasonal activity suggestions button
        this.addSeasonalActivitySuggestions(theme);
    }

    hasActiveSeasonalTheme() {
        // Check if any seasonal theme class is active on the body
        const seasonalClasses = ['seasonal-christmas', 'seasonal-halloween', 'seasonal-easter', 
            'seasonal-summer', 'seasonal-spring', 'seasonal-fall', 'seasonal-winter', 
            'seasonal-valentines', 'seasonal-stpatricks', 'seasonal-thanksgiving', 'seasonal-backtoschool', 'seasonal-newyear'];
        
        return seasonalClasses.some(className => document.body.classList.contains(className));
    }

    disableSeasonalTheme() {
        // Remove all seasonal classes
        document.body.classList.remove(
            'seasonal-christmas', 'seasonal-halloween', 'seasonal-easter', 
            'seasonal-summer', 'seasonal-spring', 'seasonal-fall', 'seasonal-winter', 
            'seasonal-valentines', 'seasonal-stpatricks', 'seasonal-thanksgiving', 
            'seasonal-backtoschool', 'seasonal-newyear', 'seasonal-mothersday'
        );
        
        // Reset header text
        const header = document.querySelector('.app-header h1');
        if (header) {
            header.textContent = '🏠 ChoreStar';
        }
        
        // Clear header background (let default CSS handle it)
        const appHeader = document.querySelector('.app-header');
        if (appHeader) {
            appHeader.style.background = '';
        }
        
        // Clear any seasonal inline styles
        document.body.style.removeProperty('background');
        document.body.style.removeProperty('background-color');
        
        const appContainer = document.querySelector('.app-container');
        if (appContainer) {
            appContainer.style.removeProperty('background');
            appContainer.style.removeProperty('background-color');
        }
        
        // Clear seasonal accent color
        document.documentElement.style.removeProperty('--seasonal-accent');
        
        // Remove seasonal activity button if it exists
        const seasonalBtn = document.querySelector('.seasonal-activities-btn');
        if (seasonalBtn) {
            seasonalBtn.remove();
        }
        
        // Clear stored seasonal theme
        localStorage.removeItem('current-seasonal-theme');
        
        // Reapply base theme (light or dark) to restore proper backgrounds
        const isDarkMode = document.body.getAttribute('data-theme') === 'dark';
        if (isDarkMode) {
            document.body.style.backgroundColor = '#0f0f23';
            document.body.style.color = '#ffffff';
        } else {
            document.body.style.backgroundColor = '#ffffff';
            document.body.style.color = '#111827';
        }
        
        // Update display
        this.updateCurrentThemeDisplay();
        
        this.showToast('Seasonal theme disabled', 'info');
    }

    async loadChildrenList() {
        try {
            const children = await this.apiClient.getChildren();
            this.children = children; // update the class property
            this.renderEditChildrenList(); // or this.populateChildrenList(this.children) if you use that
        } catch (error) {
            console.error('Error loading children list:', error);
        }
    }

    async loadChoresList() {
        try {
            const chores = await this.apiClient.getChores();
            this.chores = chores; // update the class property
        } catch (error) {
            console.error('Error loading chores list:', error);
        }
    }

    generateChildTabs() {
        const choresTabsContainer = document.getElementById('chores-management-tabs');
        const choresContentContainer = document.getElementById('chores-management-content');
        
        if (!choresTabsContainer || !choresContentContainer) return;
        
        // Clear existing content
        choresTabsContainer.innerHTML = '';
        choresContentContainer.innerHTML = '';
        
        // Generate tabs and content for each child
        this.children.forEach((child, index) => {
            const childId = child.id;
            const childChores = this.chores.filter(chore => chore.child_id === childId);
            const tabIcon = child.avatar_color ? `🎨` : `👤`;
            
            // Create tab button
            const tabButton = document.createElement('button');
            tabButton.className = 'child-chore-tab';
            tabButton.dataset.childId = childId;
            tabButton.innerHTML = `<span>${tabIcon}</span> ${child.name} (${childChores.length})`;
            choresTabsContainer.appendChild(tabButton);
            
            // Create tab content
            const tabContent = document.createElement('div');
            tabContent.id = `child-${childId}-chores-content`;
            tabContent.className = 'child-chores-content';
            tabContent.innerHTML = `
                <div class="chore-management">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4);">
                        <h3>${child.name}'s Chores</h3>
                        <button class="btn btn-outline btn-sm bulk-edit-chores" data-child-id="${childId}">
                            <span>✏</span> Bulk Edit
                        </button>
                    </div>
                    <div class="child-chores-list" id="child-${childId}-chores">
                        ${this.generateChildChoresList(child, childChores)}
                    </div>
                </div>
            `;
            choresContentContainer.appendChild(tabContent);
            
            // Add click handler for the new tab
            tabButton.addEventListener('click', () => {
                this.switchChildChoreTab(childId);
            });
        });
        
        // Set first child as active
        if (this.children.length > 0) {
            this.switchChildChoreTab(this.children[0].id);
        }
        
        // Add delete button handlers for the new content
        this.addDeleteChoreHandlers();
        
        // Add bulk edit button handlers
        this.addBulkEditHandlers();
        
        // Add bulk edit form handler
        const bulkEditForm = document.getElementById('bulk-edit-form');
        if (bulkEditForm) {
            bulkEditForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleBulkEditChores();
            });
        }
    }

    switchChildChoreTab(childId) {
        // Update tab buttons
        document.querySelectorAll('.child-chore-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-child-id="${childId}"]`).classList.add('active');
        
        // Update content
        document.querySelectorAll('.child-chores-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`child-${childId}-chores-content`).classList.add('active');
    }

    generateChildChoresList(child, childChores) {
        if (childChores.length === 0) {
            return `
                <div style="text-align:center;color:var(--gray-500);padding:2rem;">
                    <div class="empty-state-icon">🎯</div>
                    <h4 class="empty-state-title">No Activities Yet</h4>
                    <p class="empty-state-description">${child.name} doesn't have any activities yet. Let's add some to get started!</p>
                    <button class="btn btn-primary btn-lg" onclick="app.showModal('add-chore-modal'); document.getElementById('chore-child').value='${child.id}';">
                        <span>✨</span> Add First Activity
                    </button>
                    <p class="empty-state-hint">💡 Try the Smart Suggestions button for personalized ideas!</p>
                </div>
            `;
        }
        
        let html = '';
        childChores.forEach(chore => {
            html += `
                <div class="chore-item" data-chore-id="${chore.id}" style="display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:1px solid #f0f0f0;">
                    <span>${chore.name}</span>
                    <div style="display:flex;gap:8px;">
                        <button class="btn btn-outline btn-sm edit-chore-settings" data-chore-id="${chore.id}" data-chore-name="${chore.name}" data-chore-reward="${chore.reward_cents}" data-chore-frequency="${chore.frequency_days}" data-chore-notes="${chore.notes || ''}">✏️ Edit</button>
                        <button class="btn btn-danger btn-sm delete-chore" data-chore-id="${chore.id}">🗑️ Delete</button>
                    </div>
                </div>
            `;
        });
        return html;
    }

    addDeleteChoreHandlers() {
        document.querySelectorAll('.delete-chore').forEach(btn => {
            btn.addEventListener('click', e => {
                const choreId = e.target.dataset.choreId;
                this.deleteChore(choreId);
                setTimeout(() => {
                    this.loadChoresList();
                    this.generateChildTabs();
                }, 500);
            });
        });

        // Add edit chore handlers
        document.querySelectorAll('.edit-chore-settings').forEach(btn => {
            btn.addEventListener('click', e => {
                const choreId = e.target.dataset.choreId;
                const choreName = e.target.dataset.choreName;
                const choreReward = e.target.dataset.choreReward;
                const choreNotes = e.target.dataset.choreNotes;
                
                this.openEditChoreModal(choreId, choreName, choreReward, choreNotes);
            });
        });
    }

    openEditChoreModal(choreId, choreName, choreReward, choreNotes) {
        console.log('Opening edit modal for chore:', choreId);
        
        // Find the chore to get the child ID
        const chore = this.chores.find(c => c.id === choreId);
        if (!chore) {
            this.showToast('Chore not found', 'error');
            return;
        }
        
        console.log('Found chore:', chore);
        console.log('Child ID:', chore.child_id);
        
        // Populate the edit form
        document.getElementById('edit-chore-name').value = choreName;
        document.getElementById('edit-chore-reward').value = choreReward;
        const notesInput = document.getElementById('edit-chore-notes');
        if (notesInput) notesInput.value = choreNotes || '';
        
        // Set icon and category
        document.getElementById('edit-chore-icon').value = chore.icon || '📝';
        document.getElementById('edit-chore-category').value = chore.category || 'General';
        
            // Update icon picker active state with timeout for DOM readiness
    setTimeout(() => {
        const iconPicker = document.getElementById('edit-chore-icon-picker');
        if (iconPicker) {
            iconPicker.querySelectorAll('.icon-option').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.icon === chore.icon) {
                    btn.classList.add('active');
                    console.log('Set active icon:', chore.icon, 'for picker:', iconPicker.id);
                }
            });
        } else {
            console.warn('Icon picker not found for edit modal');
        }
    }, 100);
        
        // Populate child select and set the correct child
        this.populateEditChoreChildSelect(chore.child_id);
        
        // Store the chore ID for the save handler
        document.getElementById('edit-chore-form').dataset.choreId = choreId;
        
        // Store the child ID to return to after save
        document.getElementById('edit-chore-form').dataset.childId = chore.child_id;
        
        // Show and populate the chore reorder section
        this.populateEditChoreReorderSection(chore.child_id);
        
        // Show the modal
        this.showModal('edit-chore-modal');
        
        // Force the child field to be a text input and ensure it's populated
        const childField = document.getElementById('edit-chore-child');
        if (childField) {
            // Ensure it's a text input
            childField.type = 'text';
            childField.readOnly = true;
            childField.style.backgroundColor = 'var(--gray-100)';
            childField.style.color = 'var(--gray-600)';
            childField.style.border = '1px solid var(--gray-300)';
            childField.style.borderRadius = '4px';
            childField.style.padding = '8px 12px';
            childField.style.width = '100%';
            childField.style.boxSizing = 'border-box';
            
            // Ensure the value is set
            const child = this.children.find(c => c.id === chore.child_id);
            if (child) {
                childField.value = child.name;
                console.log('Set child field value to:', child.name);
            }
        }
        // Set color value if premium color picker exists
        const colorInput = document.getElementById('edit-chore-color');
        if (colorInput && chore.color) {
            colorInput.value = chore.color;
        } else if (colorInput) {
            colorInput.value = '#ff6b6b';
        }
    }

    populateEditChoreChildSelect(selectedChildId) {
        const input = document.getElementById('edit-chore-child');
        const child = this.children.find(c => c.id === selectedChildId);
        if (child) {
            input.value = child.name;
            console.log('Populated child field with:', child.name);
        } else {
            console.log('Child not found for ID:', selectedChildId);
        }
    }

    populateChildSelect() {
        const select = document.getElementById('chore-child');
        select.innerHTML = '<option value="">Select a child...</option>';
        
        this.children.forEach(child => {
            const option = document.createElement('option');
            option.value = child.id;
            option.textContent = child.name;
            select.appendChild(option);
        });
    }

    renderEditChildrenList() {
        const container = document.getElementById('children-list');
        if (!container) return;
        if (this.children.length === 0) {
            container.innerHTML = `<div style="text-align: center; padding: var(--space-8); color: var(--gray-500);">
                    <div style="font-size: 3rem; margin-bottom: var(--space-3);">👶</div>
                    <div class="empty-state-icon">👨‍👩‍👧‍👦</div>
                    <h3 class="empty-state-title">Welcome to Your Family Dashboard!</h3>
                    <p class="empty-state-description">Let's start by adding your first child to begin tracking activities and earning rewards together.</p>
                    <button class="btn btn-primary btn-lg" id="add-first-child-btn">
                        <span>👶</span> Add Your First Child
                    </button>
                    <p class="empty-state-hint">💡 Tip: You can add multiple children and track each one's progress separately</p>
            </div>`;
            return;
        }
        // Deduplicate children by name and age
        const seen = new Set();
        const uniqueChildren = [];
        this.children.forEach(child => {
            const key = `${child.name}-${child.age}`;
            if (!seen.has(key)) {
                uniqueChildren.push(child);
                seen.add(key);
            } else {
                console.warn('Duplicate child detected in settings:', child);
            }
        });
        let html = '';
        uniqueChildren.forEach(child => {
            const gradient = this.getChildGradient(child.avatar_color);
            let avatarHtml = '';
            if (child.avatar_url) {
                avatarHtml = `<img src="${child.avatar_url}" class="child-avatar-small" style="object-fit:cover;">`;
            } else if (child.avatar_file) {
                avatarHtml = `<img src="${child.avatar_file}" class="child-avatar-small" style="object-fit:cover;">`;
            } else {
                avatarHtml = `<div class="child-avatar-small" style="background:${gradient};">${child.name.charAt(0).toUpperCase()}</div>`;
            }
            html += `<div class="child-item" data-child-id="${child.id}" style="display:flex;flex-direction:column;gap:4px;padding:16px 0;border-radius:16px;background:white;box-shadow:0 1px 4px rgba(0,0,0,0.03);margin-bottom:12px;">
                <div style="display:flex;align-items:center;gap:16px;">
                    ${avatarHtml}
                    <span style="font-weight:600;">${child.name} <span style="color:var(--gray-400);font-size:0.95em;">(Age ${child.age})</span></span>
                    <span style="width:20px;height:20px;display:inline-block;border-radius:50%;background:${child.avatar_color};margin-left:8px;"></span>
                </div>
                <div class="edit-inline-form-anchor"></div>
            </div>`;
        });
        container.innerHTML = html;
        // For each child, insert the inline edit form
        uniqueChildren.forEach(child => {
            const anchor = container.querySelector(`.child-item[data-child-id="${child.id}"] .edit-inline-form-anchor`);
            if (anchor) {
                const tmpl = document.getElementById('edit-child-inline-template');
                const node = tmpl.content.cloneNode(true);
                const form = node.querySelector('form');
                form.elements['name'].value = child.name;
                form.elements['age'].value = child.age;
                form.elements['color'].value = child.avatar_color || '#6366f1';
                // DiceBear picker
                const picker = node.querySelector('.inline-dicebear-picker');
                const seeds = diceBearSeeds.concat(child.name || 'Avatar');
                seeds.forEach(seed => {
                    const url = getDiceBearUrl(seed);
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'dicebear-avatar-btn';
                    btn.innerHTML = `<img src="${url}" class="child-avatar-small" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">`;
                    btn.onclick = () => {
                        picker.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                        btn.classList.add('active');
                        form.dataset.selectedDicebearUrl = url;
                    };
                    picker.appendChild(btn);
                });
                // Cancel just resets the form to original values
                form.querySelector('.cancel-edit').onclick = () => {
                    form.elements['name'].value = child.name;
                    form.elements['age'].value = child.age;
                    form.elements['color'].value = child.avatar_color || '#6366f1';
                };
                // Save
                form.onsubmit = async (e) => {
                    e.preventDefault();
                    const name = form.elements['name'].value;
                    const age = form.elements['age'].value;
                    const color = form.elements['color'].value;
                    const dicebearUrl = form.dataset.selectedDicebearUrl || '';
                    const updates = { name, age, avatar_color: color, avatar_url: dicebearUrl };
                    const result = await this.apiClient.updateChild(child.id, updates);
                    if (result.success) {
                        await this.loadChildrenList();
                    } else {
                        this.showToast(result.error || 'Failed to update child', 'error');
                    }
                };
                anchor.appendChild(node);
            }
        });
        // Delete button handler
        container.querySelectorAll('.delete-child').forEach(btn => {
            btn.addEventListener('click', e => {
                const childId = e.target.dataset.childId;
                this.deleteChild(childId);
                setTimeout(() => this.loadChildrenList(), 500);
            });
        });
    }

    async deleteChild(childId) {
        const child = this.children.find(c => c.id === childId);
        const childName = child ? child.name : 'this child';
        
        const confirmed = await this.showConfirmation(
            `Are you sure you want to remove ${childName}? This will also delete all their activities and completion data. This action cannot be undone.`,
            'Delete Child',
            'danger',
            'Yes, Delete',
            'Cancel'
        );
        
        if (confirmed) {
            const result = await this.apiClient.deleteChild(childId);
            if (result.success) {
                this.showToast(`${childName} has been removed`, 'success');
                await this.loadChildren();
                this.renderChildren();
                return { success: true };
            } else {
                this.showToast(result.error || 'Failed to delete child', 'error');
                return { success: false, error: result.error };
            }
        }
        return { success: false, error: 'Cancelled' };
    }

    getChildGradient(color) {
        if (!color) return 'linear-gradient(to right, #e0e0e0, #f5f5f5)'; // Default light gray
        const hex = color.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `linear-gradient(to right, #${r}${r}${g}${g}${b}${b}, #${r}${r}${g}${g}${b}${b})`;
    }

    getChildName(childId) {
        const child = this.children.find(c => c.id === childId);
        return child ? child.name : 'Unknown Child';
    }

    // The following methods are not used in the provided edit, but are kept as they were in the original file.
    showToast(message, type = 'info', duration = 4000) {
        const key = `${type}:${message}`;
        const now = Date.now();
        const lastShown = this.recentToasts.get(key);
        
        // 5-second debounce for duplicate prevention
        if (lastShown && (now - lastShown) < 5000) {
            console.log('Preventing duplicate toast:', message);
            return;
        }
        
        // Cleanup old toast entries to prevent memory leaks
        for (const [toastKey, timestamp] of this.recentToasts.entries()) {
            if (now - timestamp > 10000) { // Remove entries older than 10 seconds
                this.recentToasts.delete(toastKey);
            }
        }
        
        this.recentToasts.set(key, now);
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type} toast-enter`;
        toast.innerHTML = `
            <div class="toast-icon-wrapper">
                <div class="toast-icon">${this.getToastIcon(type)}</div>
            </div>
            <div class="toast-content">
                <div class="toast-message">
                    <div class="toast-title">${this.getToastTitle(type)}</div>
                    <div class="toast-description">${message}</div>
                </div>
            </div>
            <button class="toast-close" aria-label="Close notification">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <path d="M1 1l12 12M13 1L1 13"/>
                </svg>
            </button>
            <div class="toast-progress"></div>
            <div class="toast-actions">
                <button class="toast-action btn btn-primary btn-sm">OK</button>
                <button class="toast-close">&times;</button>
            </div>
        `;
        
        const toastContainer = document.getElementById('toast-container');
        if (toastContainer) {
            toastContainer.appendChild(toast);
            
            // Trigger entrance animation
            requestAnimationFrame(() => {
                toast.classList.add('toast-show');
            });
            
            // Close button handler
            const closeBtn = toast.querySelector('.toast-close');
            const removeToast = () => {
                toast.classList.remove('toast-show');
                toast.classList.add('toast-exit');
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.remove();
                    }
                }, 300);
            };
            
            closeBtn.addEventListener('click', removeToast);
            
            // Progress bar animation
            const progressBar = toast.querySelector('.toast-progress');
            if (progressBar) {
                progressBar.style.animation = `toast-progress ${duration}ms linear forwards`;
            }
            
            // Auto-remove after duration
            setTimeout(removeToast, duration);
        }
    }

    getToastIcon(type) {
        switch (type) {
            case 'success': return '✅';
            case 'error': return '❌';
            case 'warning': return '⚠️';
            case 'info': return 'ℹ️';
            default: return '💡';
        }
    }

    getToastTitle(type) {
        switch (type) {
            case 'success': return 'Success!';
            case 'error': return 'Error!';
            case 'warning': return 'Warning!';
            case 'info': return 'Info!';
            default: return 'Message';
        }
    }

    // Onboarding Wizard Methods
    checkFirstTimeUser() {
        const hasSeenOnboarding = localStorage.getItem('onboarding_completed');
        const hasChildren = this.children && this.children.length > 0;
        
        // Show onboarding if: never seen it AND no children yet
        if (!hasSeenOnboarding && !hasChildren) {
            setTimeout(() => {
                this.showModal('onboarding-wizard');
            }, 1000);
        }
    }

    nextOnboardingStep() {
        const currentStep = document.querySelector(`.onboarding-step[data-step="${this.currentOnboardingStep}"]`);
        if (currentStep) {
            currentStep.classList.remove('active');
        }
        
        this.currentOnboardingStep++;
        
        const nextStep = document.querySelector(`.onboarding-step[data-step="${this.currentOnboardingStep}"]`);
        if (nextStep) {
            nextStep.classList.add('active');
        }
    }

    previousOnboardingStep() {
        const currentStep = document.querySelector(`.onboarding-step[data-step="${this.currentOnboardingStep}"]`);
        if (currentStep) {
            currentStep.classList.remove('active');
        }
        
        this.currentOnboardingStep--;
        
        const prevStep = document.querySelector(`.onboarding-step[data-step="${this.currentOnboardingStep}"]`);
        if (prevStep) {
            prevStep.classList.add('active');
        }
    }

    skipOnboarding() {
        localStorage.setItem('onboarding_completed', 'true');
        this.hideModal('onboarding-wizard');
        this.currentOnboardingStep = 1;
        this.showToast('You can always access help from the menu!', 'info');
    }

    completeOnboarding() {
        localStorage.setItem('onboarding_completed', 'true');
        this.hideModal('onboarding-wizard');
        this.currentOnboardingStep = 1;
        this.showToast('Welcome to ChoreStar! Let\'s get started! 🎉', 'success');
    }

    // Confirmation Modal Helper
    async showConfirmation(message, title = 'Confirm Action', type = 'warning', confirmText = 'Confirm', cancelText = 'Cancel') {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirmation-modal');
            const header = modal.querySelector('.confirmation-header');
            const icon = document.getElementById('confirmation-icon');
            const titleEl = document.getElementById('confirmation-title');
            const messageEl = document.getElementById('confirmation-message');
            const confirmBtn = document.getElementById('confirmation-confirm');
            const cancelBtn = document.getElementById('confirmation-cancel');
            
            // Set icon and colors based on type
            const iconMap = {
                danger: '🗑️',
                warning: '⚠️',
                info: 'ℹ️',
                success: '✓'
            };
            
            icon.textContent = iconMap[type] || '⚠️';
            header.className = `modal-header confirmation-header ${type}`;
            titleEl.textContent = title;
            messageEl.textContent = message;
            confirmBtn.textContent = confirmText;
            cancelBtn.textContent = cancelText;
            
            // Add danger class to confirm button for destructive actions
            if (type === 'danger') {
                confirmBtn.classList.add('danger');
            } else {
                confirmBtn.classList.remove('danger');
            }
            
            // Event handlers
            const handleConfirm = () => {
                this.hideModal('confirmation-modal');
                cleanup();
                resolve(true);
            };
            
            const handleCancel = () => {
                this.hideModal('confirmation-modal');
                cleanup();
                resolve(false);
            };
            
            const cleanup = () => {
                confirmBtn.removeEventListener('click', handleConfirm);
                cancelBtn.removeEventListener('click', handleCancel);
            };
            
            confirmBtn.addEventListener('click', handleConfirm);
            cancelBtn.addEventListener('click', handleCancel);
            
            this.showModal('confirmation-modal');
        });
    }

    setupFamilySharing() {
        // Add click handler for family sharing button in header
        document.getElementById('family-sharing-btn').addEventListener('click', () => {
            this.showModal('family-sharing-modal');
            this.loadFamilySharingData();
        });

        // Setup join family form
        document.getElementById('join-family-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleJoinFamily();
        });
    }

    async checkForPaymentSuccess() {
        // Check if user just completed a payment
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('success') === 'true') {
            try {
                // Upgrade user to premium in database
                await this.apiClient.updateSubscriptionStatus('premium');
                
                // Show success notification
                this.showToast('🎉 Welcome to ChoreStar Premium! You now have access to all premium features.', 'success');
                
                // Track payment success
                if (window.analytics) {
                    window.analytics.trackPaymentSuccess();
                }
                
                // Send notification
                if (window.notificationManager) {
                    await window.notificationManager.sendPaymentConfirmation();
                }
                
                // Remove success parameter from URL
                const newUrl = window.location.pathname + window.location.hash;
                window.history.replaceState({}, document.title, newUrl);
                
                // Reload data to reflect new premium status
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
                
            } catch (error) {
                console.error('Error upgrading user to premium:', error);
                this.showToast('Payment successful, but there was an issue activating premium features. Please contact support.', 'error');
            }
        }
        
        // Check for payment cancellation
        if (urlParams.get('canceled') === 'true') {
            this.showToast('Payment was canceled. You can try upgrading again anytime.', 'info');
            
            // Track payment cancellation
            if (window.analytics) {
                window.analytics.trackPaymentCancel();
            }
            
            // Remove canceled parameter from URL
            const newUrl = window.location.pathname + window.location.hash;
            window.history.replaceState({}, document.title, newUrl);
        }
    }

    async loadFamilySharingData() {
        try {
            // Load family code
            const familyCode = await window.familySharing.getOrCreateFamilyCode();
            if (familyCode) {
                document.getElementById('family-code').textContent = familyCode;
            }

            // Load family members
            const members = await window.familySharing.getFamilyMembers();
            this.renderFamilyMembers(members);
        } catch (error) {
            console.error('Error loading family sharing data:', error);
        }
    }

    renderFamilyMembers(members) {
        const container = document.getElementById('family-members-list');
        if (!container) return;

        if (members.length === 0) {
            container.innerHTML = '<p style="color: var(--gray-500); text-align: center;">No family members yet.</p>';
            return;
        }

        let html = '';
        members.forEach(member => {
            const email = member.profiles?.email || 'Unknown';
            const initial = email.charAt(0).toUpperCase();
            html += `
                <div class="family-member-item">
                    <div class="family-member-avatar">${initial}</div>
                    <div class="family-member-info">
                        <div class="family-member-email">${email}</div>
                        <div class="family-member-joined">Joined ${this.formatDate(member.joined_at)}</div>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    }

    async handleJoinFamily() {
        const code = document.getElementById('join-family-code').value;
        
        if (!code || code.length !== 6) {
            this.showToast('Please enter a valid 6-digit family code', 'error');
            return;
        }

        // Find and set loading state on join family button
        const joinButton = document.querySelector('button[onclick*="handleJoinFamily"]');
        this.setButtonLoading(joinButton, true);

        const result = await window.familySharing.joinFamily(code);
        this.setButtonLoading(joinButton, false);

        if (result.success) {
            this.showToast('Successfully joined family!', 'success');
            this.hideModal('family-sharing-modal');
            // Reload app data to show shared family data
            await this.loadApp();
        } else {
            this.showToast(result.error || 'Failed to join family', 'error');
        }
    }

    async copyFamilyCode() {
        const code = document.getElementById('family-code').textContent;
        if (code && code !== 'Loading...') {
            // Find and set loading state on copy button
            const copyButton = document.querySelector('button[onclick*="copyFamilyCode"]');
            this.setButtonLoading(copyButton, true);

            try {
                await navigator.clipboard.writeText(code);
                this.showToast('Family code copied to clipboard!', 'success');
            } catch (error) {
                this.showToast('Failed to copy code', 'error');
            } finally {
                // Reset loading state
                this.setButtonLoading(copyButton, false);
            }
        }
    }

    setupNotificationPermission() {
        // This method is not used in the provided edit, but is kept as it was in the original file.
        // It would typically involve checking notification permissions and showing a prompt.
    }

    showUpgradeModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>🌟 Upgrade to Premium</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="upgrade-content">
                    <h3>Unlock Premium Features</h3>
                    <p>Get access to advanced features that make chore management even more fun and effective!</p>
                    
                    <div class="plan-comparison">
                        <div class="plan free">
                            <h4>Free Plan</h4>
                            <ul>
                                <li>✅ Up to 2 children</li>
                                <li>✅ Up to 5 chores</li>
                                <li>✅ Basic chore tracking</li>
                                <li>❌ Custom icons</li>
                                <li>❌ Chore categories</li>
                                <li>❌ Achievement badges</li>
                                <li>❌ Points system</li>
                                <li>❌ Export reports</li>
                            </ul>
                        </div>
                        <div class="plan premium">
                            <h4>Premium Plan</h4>
                            <ul>
                                <li>✅ Unlimited children</li>
                                <li>✅ Unlimited chores</li>
                                <li>✅ Advanced chore tracking</li>
                                <li>✅ Custom chore icons</li>
                                <li>✅ Chore categories</li>
                                <li>✅ Achievement badges</li>
                                <li>✅ Points system</li>
                                <li>✅ Export reports</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div class="upgrade-actions">
                        <button class="btn btn-primary" onclick="app.handleUpgrade()">Upgrade Now - $4.99/month</button>
                        <button class="btn btn-outline" onclick="this.closest('.modal').remove()">Maybe Later</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.classList.remove('hidden');
    }

    async handleUpgrade() {
        try {
            // Find and set loading state on upgrade button
            const upgradeButton = document.querySelector('button[onclick*="handleUpgrade"]');
            if (upgradeButton) {
                this.setButtonLoading(upgradeButton, true);
            }

            // Use the payment manager to handle the upgrade
            if (window.paymentManager && typeof window.paymentManager.handleUpgrade === 'function') {
                await window.paymentManager.handleUpgrade();
            } else {
                // Fallback if payment manager is not available
                this.showToast('Payment system is currently unavailable. Please try again later or contact support.', 'error');
            }
        } catch (error) {
            console.error('Upgrade failed:', error);
            this.showToast('Failed to process upgrade. Please try again or contact support.', 'error');
        } finally {
            // Reset loading state
            if (upgradeButton) {
                this.setButtonLoading(upgradeButton, false);
            }
        }
    }

    // Premium feature methods
    async checkPremiumFeatures() {
        const limits = await this.apiClient.checkSubscriptionLimits();
        
        // Show/hide premium features in add chore modal for all entries
        const premiumFeatures = document.querySelectorAll('[id^="premium-chore-features"]');
        const upgradePrompts = document.querySelectorAll('[id^="premium-upgrade-prompt"]');
        // Also select edit modal premium features
        const editPremiumFeatures = document.querySelectorAll('.edit-premium-features');
        premiumFeatures.forEach(feature => {
            if (limits.isPremium) {
                feature.style.display = 'block';
            } else {
                feature.style.display = 'none';
            }
        });
        editPremiumFeatures.forEach(feature => {
            if (limits.isPremium) {
                feature.style.display = 'block';
            } else {
                feature.style.display = 'none';
            }
        });
        upgradePrompts.forEach(prompt => {
            if (limits.isPremium) {
                prompt.style.display = 'none';
            } else {
                prompt.style.display = 'block';
            }
        });
        return limits;
    }

    async awardAchievementBadge(childId, badgeType, badgeName, badgeDescription, badgeIcon) {
        const limits = await this.apiClient.checkSubscriptionLimits();
        if (!limits.canEarnBadges) {
            return false;
        }

        const result = await this.apiClient.awardBadge(childId, badgeType, badgeName, badgeDescription, badgeIcon);
        if (result.success) {
            this.showToast(`🎉 New badge earned: ${badgeName}!`, 'success');
            return true;
        }
        return false;
    }

    async exportFamilyReport() {
        const limits = await this.apiClient.checkSubscriptionLimits();
        if (!limits.canExportReports) {
            this.showUpgradeModal();
            return;
        }

        // Find and set loading state on export button
        const exportButton = document.querySelector('button[onclick*="exportFamilyReport"]');
        this.setButtonLoading(exportButton, true);

        const result = await this.apiClient.exportFamilyReport();
        this.setButtonLoading(exportButton, false);

        if (result.success) {
            // Create and download PDF report
            const report = result.report;
            const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `chorestar-report-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            this.showToast('Report exported successfully!', 'success');
        } else {
            this.showToast('Failed to export report', 'error');
        }
    }

    async checkAchievementBadges(childId) {
        const child = this.children.find(c => c.id === childId);
        if (!child) return;

        const childChores = this.chores.filter(chore => chore.child_id === childId);
        const childCompletions = this.completions.filter(comp => 
            childChores.some(chore => chore.id === comp.chore_id)
        );

        // Check for first chore completion badge
        if (childCompletions.length === 1) {
            await this.awardAchievementBadge(
                childId,
                'first_chore',
                'First Step',
                'Completed your first chore!',
                '🎯'
            );
        }

        // Check for 7-day streak badge
        const weekStart = this.apiClient.getWeekStart();
        const weekStartDate = new Date(weekStart);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        const weekCompletions = childCompletions.filter(comp => {
            const compDate = new Date(comp.completed_at);
            return compDate >= weekStartDate && compDate <= weekEnd;
        });

        if (weekCompletions.length >= childChores.length * 7) {
            await this.awardAchievementBadge(
                childId,
                'perfect_week',
                'Perfect Week',
                'Completed all chores for the entire week!',
                '🌟'
            );
        }

        // Check for 10 total completions badge
        if (childCompletions.length >= 10) {
            await this.awardAchievementBadge(
                childId,
                'dedicated',
                'Dedicated Helper',
                'Completed 10 chores total!',
                '💪'
            );
        }
    }

    addChoreEntry() {
        const container = document.getElementById('chores-container');
        const entryCount = container.children.length + 1;
        const newEntry = document.createElement('div');
        newEntry.className = 'chore-entry';
        newEntry.innerHTML = `
            <div class="chore-entry-header">
                <div class="chore-entry-title">
                    <span class="chore-number">${entryCount}</span>
                    <h3>Activity Details</h3>
                </div>
                <button type="button" class="btn btn-outline btn-sm remove-chore">Remove</button>
            </div>
            <div class="form-group">
                <label for="chore-name-${entryCount}">Activity Name</label>
                <input type="text" id="chore-name-${entryCount}" required placeholder="e.g., Make bed">
            </div>
            <div class="form-group">
                <label for="chore-category-${entryCount}">Activity Category</label>
                <select id="chore-category-${entryCount}" class="category-selector">
                    <option value="household_chores" selected>🏠 Household Chores</option>
                    <option value="learning_education">📚 Learning & Education</option>
                    <option value="physical_activity">🏃 Physical Activity</option>
                    <option value="creative_time">🎨 Creative Time</option>
                    <option value="games_play">🎮 Games & Play</option>
                    <option value="reading">📖 Reading</option>
                    <option value="family_time">❤️ Family Time</option>
                    <option value="custom">⚙️ Custom</option>
                </select>
            </div>
            <!-- Premium Features -->
            <div class="premium-features" id="premium-chore-features-${entryCount}" style="display: none;">
                <div class="form-group">
                    <label for="chore-color-${entryCount}">Chore Color</label>
                    <div class="color-picker-row" style="display: flex; align-items: center; gap: var(--space-2);">
                        <input type="color" id="chore-color-${entryCount}" value="#ff6b6b" style="width: 48px; height: 32px; border: none; background: none; cursor: pointer;">
                        <div class="color-presets" style="display: flex; gap: var(--space-1);">
                            <button type="button" class="color-preset" data-color="#ff6b6b" style="width: 24px; height: 24px; background: #ff6b6b; border: 2px solid #fff; border-radius: 50%; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"></button>
                            <button type="button" class="color-preset" data-color="#4ecdc4" style="width: 24px; height: 24px; background: #4ecdc4; border: 2px solid #fff; border-radius: 50%; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"></button>
                            <button type="button" class="color-preset" data-color="#45b7d1" style="width: 24px; height: 24px; background: #45b7d1; border: 2px solid #fff; border-radius: 50%; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"></button>
                            <button type="button" class="color-preset" data-color="#96ceb4" style="width: 24px; height: 24px; background: #96ceb4; border: 2px solid #fff; border-radius: 50%; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"></button>
                            <button type="button" class="color-preset" data-color="#feca57" style="width: 24px; height: 24px; background: #feca57; border: 2px solid #fff; border-radius: 50%; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"></button>
                            <button type="button" class="color-preset" data-color="#ff9ff3" style="width: 24px; height: 24px; background: #ff9ff3; border: 2px solid #fff; border-radius: 50%; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"></button>
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <label for="chore-icon-${entryCount}">Chore Icon</label>
                    <div class="icon-picker" id="icon-picker-${entryCount}">
                        <!-- Household Chores -->
                        <button type="button" class="icon-option active" data-icon="📝">📝</button>
                        <button type="button" class="icon-option" data-icon="🛏️">🛏️</button>
                        <button type="button" class="icon-option" data-icon="🧹">🧹</button>
                        <button type="button" class="icon-option" data-icon="🧺">🧺</button>
                        <button type="button" class="icon-option" data-icon="🍽️">🍽️</button>
                        <button type="button" class="icon-option" data-icon="🚿">🚿</button>
                        <button type="button" class="icon-option" data-icon="🧽">🧽</button>
                        <button type="button" class="icon-option" data-icon="🗑️">🗑️</button>
                        <button type="button" class="icon-option" data-icon="🚪">🚪</button>
                        <button type="button" class="icon-option" data-icon="🪟">🪟</button>
                        <button type="button" class="icon-option" data-icon="🪑">🪑</button>
                        <button type="button" class="icon-option" data-icon="🛋️">🛋️</button>
                        <button type="button" class="icon-option" data-icon="🪞">🪞</button>
                        <button type="button" class="icon-option" data-icon="🖼️">🖼️</button>
                        <button type="button" class="icon-option" data-icon="💡">💡</button>
                        <button type="button" class="icon-option" data-icon="🔌">🔌</button>
                        <button type="button" class="icon-option" data-icon="🔋">🔋</button>
                        
                        <!-- Clothing & Personal Care -->
                        <button type="button" class="icon-option" data-icon="👕">👕</button>
                        <button type="button" class="icon-option" data-icon="👖">👖</button>
                        <button type="button" class="icon-option" data-icon="👟">👟</button>
                        <button type="button" class="icon-option" data-icon="🎒">🎒</button>
                        <button type="button" class="icon-option" data-icon="🧸">🧸</button>
                        
                        <!-- School & Learning -->
                        <button type="button" class="icon-option" data-icon="📚">📚</button>
                        <button type="button" class="icon-option" data-icon="📖">📖</button>
                        <button type="button" class="icon-option" data-icon="✏️">✏️</button>
                        <button type="button" class="icon-option" data-icon="🎨">🎨</button>
                        <button type="button" class="icon-option" data-icon="🧠">🧠</button>
                        
                        <!-- Technology -->
                        <button type="button" class="icon-option" data-icon="📱">📱</button>
                        <button type="button" class="icon-option" data-icon="💻">💻</button>
                        <button type="button" class="icon-option" data-icon="🎮">🎮</button>
                        
                        <!-- Pets & Animals -->
                        <button type="button" class="icon-option" data-icon="🐕">🐕</button>
                        <button type="button" class="icon-option" data-icon="🐱">🐱</button>
                        <button type="button" class="icon-option" data-icon="🐦">🐦</button>
                        <button type="button" class="icon-option" data-icon="🐠">🐠</button>
                        <button type="button" class="icon-option" data-icon="🐹">🐹</button>
                        
                        <!-- Plants & Nature -->
                        <button type="button" class="icon-option" data-icon="🌱">🌱</button>
                        <button type="button" class="icon-option" data-icon="🌺">🌺</button>
                        <button type="button" class="icon-option" data-icon="🌳">🌳</button>
                        <button type="button" class="icon-option" data-icon="🌿">🌿</button>
                        <button type="button" class="icon-option" data-icon="🍃">🍃</button>
                        <button type="button" class="icon-option" data-icon="🌧️">🌧️</button>
                        <button type="button" class="icon-option" data-icon="☀️">☀️</button>
                        <button type="button" class="icon-option" data-icon="❄️">❄️</button>
                        
                        <!-- Transportation -->
                        <button type="button" class="icon-option" data-icon="🚗">🚗</button>
                        <button type="button" class="icon-option" data-icon="🚲">🚲</button>
                        <button type="button" class="icon-option" data-icon="🛴">🛴</button>
                        <button type="button" class="icon-option" data-icon="🏠">🏠</button>
                        <button type="button" class="icon-option" data-icon="🏡">🏡</button>
                        
                        <!-- Sports & Activities -->
                        <button type="button" class="icon-option" data-icon="⚽">⚽</button>
                        <button type="button" class="icon-option" data-icon="🏀">🏀</button>
                        <button type="button" class="icon-option" data-icon="🎾">🎾</button>
                        <button type="button" class="icon-option" data-icon="🏊">🏊</button>
                        <button type="button" class="icon-option" data-icon="🚴">🚴</button>
                        <button type="button" class="icon-option" data-icon="🏃">🏃</button>
                        <button type="button" class="icon-option" data-icon="🧘">🧘</button>
                        <button type="button" class="icon-option" data-icon="💪">💪</button>
                        <button type="button" class="icon-option" data-icon="🎯">🎯</button>
                        
                        <!-- Music & Arts -->
                        <button type="button" class="icon-option" data-icon="🎵">🎵</button>
                        <button type="button" class="icon-option" data-icon="🎤">🎤</button>
                        <button type="button" class="icon-option" data-icon="🎧">🎧</button>
                        <button type="button" class="icon-option" data-icon="🎹">🎹</button>
                        <button type="button" class="icon-option" data-icon="🎸">🎸</button>
                        <button type="button" class="icon-option" data-icon="🥁">🥁</button>
                        <button type="button" class="icon-option" data-icon="🎺">🎺</button>
                        <button type="button" class="icon-option" data-icon="🎻">🎻</button>
                        <button type="button" class="icon-option" data-icon="🎼">🎼</button>
                        <button type="button" class="icon-option" data-icon="🎭">🎭</button>
                        <button type="button" class="icon-option" data-icon="🎬">🎬</button>
                        
                        <!-- Celebrations & Fun -->
                        <button type="button" class="icon-option" data-icon="🎉">🎉</button>
                        <button type="button" class="icon-option" data-icon="🎊">🎊</button>
                        <button type="button" class="icon-option" data-icon="🎈">🎈</button>
                        <button type="button" class="icon-option" data-icon="🎁">🎁</button>
                        <button type="button" class="icon-option" data-icon="🎄">🎄</button>
                        <button type="button" class="icon-option" data-icon="🎃">🎃</button>
                        <button type="button" class="icon-option" data-icon="🎪">🎪</button>
                        
                        <!-- Emotions & Symbols -->
                        <button type="button" class="icon-option" data-icon="❤️">❤️</button>
                        <button type="button" class="icon-option" data-icon="🌟">🌟</button>
                        <button type="button" class="icon-option" data-icon="⭐">⭐</button>
                        <button type="button" class="icon-option" data-icon="✨">✨</button>
                        <button type="button" class="icon-option" data-icon="💎">💎</button>
                        <button type="button" class="icon-option" data-icon="🏆">🏆</button>
                        <button type="button" class="icon-option" data-icon="🎖️">🎖️</button>
                        <button type="button" class="icon-option" data-icon="👑">👑</button>
                        <button type="button" class="icon-option" data-icon="💫">💫</button>
                        <button type="button" class="icon-option" data-icon="🌈">🌈</button>
                    </div>
                    <input type="hidden" id="chore-icon-${entryCount}" value="📝">
                </div>
                <div class="form-group">
                    <label for="chore-notes-${entryCount}">Notes (Optional)</label>
                    <textarea id="chore-notes-${entryCount}" placeholder="e.g., Remember to use soap! Or special instructions..." rows="2" style="resize: vertical;"></textarea>
                </div>
            </div>
            <div class="form-group">
                <small style="color: var(--gray-600);">Each completed day earns 7¢</small>
            </div>
            <div class="premium-upgrade-prompt" id="premium-upgrade-prompt-${entryCount}" style="display: none;">
                <div class="upgrade-banner">
                    <span>🌟</span>
                    <span>Upgrade to Premium for custom colors, icons, categories, and more!</span>
                    <button type="button" class="btn btn-primary btn-sm" onclick="app.showUpgradeModal()">Upgrade</button>
                </div>
            </div>
        `;
        container.appendChild(newEntry);
        
        // Call color picker setup after adding the entry
        this.setupChoreColorSwatches();
        
        // Check premium features for the new entry
        this.checkPremiumFeatures();
    }

    removeChoreEntry(choreEntry) {
        // This method is not used in the provided edit, but is kept as it was in the original file.
        // It would typically involve removing a chore entry from the chore list.
    }

    async handleEditChore() {
        const choreId = document.getElementById('edit-chore-form').dataset.choreId;
        const name = document.getElementById('edit-chore-name').value;
        const rewardCents = parseInt(document.getElementById('edit-chore-reward').value);
        const notes = document.getElementById('edit-chore-notes').value;
        const icon = document.getElementById('edit-chore-icon').value;
        const category = document.getElementById('edit-chore-category').value;
        let color = null;
        const limits = await this.apiClient.checkSubscriptionLimits();
        if (limits.isPremium) {
            const colorInput = document.getElementById('edit-chore-color');
            if (colorInput) color = colorInput.value;
        }
        if (!name || !rewardCents) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }
        if (rewardCents < 1 || rewardCents > 100) {
            this.showToast('Reward must be between 1 and 100 cents', 'error');
            return;
        }
        this.showLoading();
        const result = await this.apiClient.updateChore(choreId, {
            name,
            reward_cents: rewardCents,
            notes,
            icon,
            category,
            color
        });
        this.hideLoading();
        if (result.success) {
            this.showToast('Chore updated successfully!', 'success');
            this.hideModal('edit-chore-modal');
            await this.loadChoresList();
            this.generateChildTabs();
            const returnChildId = document.getElementById('edit-chore-form').dataset.returnChildId;
            if (returnChildId) {
                this.switchSettingsTab('chores');
                setTimeout(() => {
                    this.switchChildChoreTab(returnChildId);
                }, 100);
            }
        } else {
            this.showToast(result.error || 'Failed to update chore', 'error');
        }
    }

    renderChildren() {
        // Use setTimeout wrapper for DOM-ready operations
        setTimeout(() => {
            const tabsContainer = document.getElementById('children-tabs');
            const contentContainer = document.getElementById('children-content');
            const emptyState = document.getElementById('empty-state');
            
            if (!tabsContainer || !contentContainer || !emptyState) {
                console.warn('Required DOM elements not found for rendering children');
                return;
            }
            
            // Deduplicate children by ID and name/age
            const seen = new Set();
            const uniqueChildren = [];
            this.children.forEach(child => {
                const key = `${child.id}-${child.name}-${child.age}`;
                if (!seen.has(key)) {
                    uniqueChildren.push(child);
                    seen.add(key);
                } else {
                    console.warn('Duplicate child detected:', child);
                }
            });
            
            if (uniqueChildren.length === 0) {
                tabsContainer.innerHTML = '';
                contentContainer.innerHTML = '';
                contentContainer.style.display = 'none';
                emptyState.classList.remove('hidden');
                return;
            }
            contentContainer.style.display = '';
            emptyState.classList.add('hidden');
            
            // Generate tabs
            this.generateChildrenTabs(uniqueChildren);
            
            // Generate content
            this.generateChildrenContent(uniqueChildren);
            
            // Set the first child as active if no child is currently active
            if (!document.querySelector('.child-tab.active')) {
                this.switchChildTab(uniqueChildren[0].id);
            }
            
            // Update category filter count
            this.updateCategoryFilterCount();
        }, 0); // Use setTimeout to ensure DOM is ready
    }

    generateChildrenTabs(children) {
        const tabsContainer = document.getElementById('children-tabs');
        tabsContainer.innerHTML = '';
        
        children.forEach((child, index) => {
            const tab = document.createElement('button');
            // Respect activeChildId when setting active tab
            const isActive = this.activeChildId ? child.id === this.activeChildId : index === 0;
            tab.className = `child-tab ${isActive ? 'active' : ''}`;
            tab.dataset.childId = child.id;
            
            // Create avatar
            let avatarHtml = '';
            if (child.avatar_url) {
                avatarHtml = `<img src="${child.avatar_url}" class="child-tab-avatar" alt="${child.name}">`;
            } else if (child.avatar_file) {
                avatarHtml = `<img src="${child.avatar_file}" class="child-tab-avatar" alt="${child.name}">`;
            } else {
                // Use the selected color even when no avatar image is set
                const backgroundColor = child.avatar_color || '#6366f1';
                const initial = child.name.charAt(0).toUpperCase();
                avatarHtml = `<div class="child-tab-avatar" style="background: ${backgroundColor}; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold;">${initial}</div>`;
            }
            
            tab.innerHTML = `
                ${avatarHtml}
                <span class="child-tab-name">${child.name}</span>
                <span class="child-tab-age">Age ${child.age}</span>
            `;
            
            tab.addEventListener('click', () => {
                this.switchChildTab(child.id);
            });
            
            tabsContainer.appendChild(tab);
        });
    }

    generateChildrenContent(children) {
        const contentContainer = document.getElementById('children-content');
        contentContainer.innerHTML = '';
        
        children.forEach((child, index) => {
            const childCard = this.createChildCard(child);
            childCard.className = `child-content ${index === 0 ? 'active' : ''}`;
            childCard.dataset.childId = child.id;
            
            // Edit button removed - children can now be edited from settings
            
            contentContainer.appendChild(childCard);
        });
    }

    switchChildTab(childId) {
        // Track active child
        this.activeChildId = childId;
        
        // Update tab buttons
        document.querySelectorAll('.child-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        const activeTab = document.querySelector(`[data-child-id="${childId}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
        
        // Update content
        document.querySelectorAll('.child-content').forEach(content => {
            content.classList.remove('active');
        });
        const activeContent = document.querySelector(`.child-content[data-child-id="${childId}"]`);
        if (activeContent) {
            activeContent.classList.add('active');
        }
    }

    createChildCard(child) {
        const card = document.createElement('div');
        card.className = 'child-card fade-in';
        card.setAttribute('data-child-id', child.id);
        // Set child gradient based on avatar color
        const gradient = this.getChildGradient(child.avatar_color);
        card.style.setProperty('--child-gradient', gradient);
        // Avatar logic
        let avatarHtml = '';
        if (child.avatar_url) {
            avatarHtml = `<img src="${child.avatar_url}" class="child-avatar-img" style="width:48px;height:48px;border-radius:50%;object-fit:cover;">`;
        } else if (child.avatar_file) {
            avatarHtml = `<img src="${child.avatar_file}" class="child-avatar-img" style="width:48px;height:48px;border-radius:50%;object-fit:cover;">`;
        } else {
            avatarHtml = `<div class="child-avatar" style="background:${child.avatar_color || '#6366f1'};">${child.name.charAt(0).toUpperCase()}</div>`;
        }
        const childChores = this.chores.filter(chore => chore.child_id === child.id);
        const childCompletions = this.completions.filter(comp => 
            childChores.some(chore => chore.id === comp.chore_id)
        );
        // Calculate progress
        const progress = this.calculateChildProgress(child.id, childChores, childCompletions);
        // Calculate stars based on completion percentage
        const stars = this.calculateStars(progress.completionPercentage);
        
        // Calculate current streak for this child
        const currentStreak = this.getCurrentStreak(child.id);
        const streakMilestone = this.getStreakMilestone(currentStreak);
        const streakProgress = this.getStreakProgress(currentStreak);
        
        card.innerHTML = `
            <div class="child-header">
                ${avatarHtml}
                <div class="child-info">
                    <h3>${child.name}</h3>
                    <p>Age ${child.age}</p>
                    ${currentStreak > 0 ? `
                        <div class="streak-display">
                            <div class="streak-badge ${streakMilestone ? 'streak-milestone' : ''}" style="${streakMilestone ? `background: ${streakMilestone.color}` : ''}">
                                <span class="streak-icon">🔥</span>
                                <span class="streak-count">${currentStreak}</span>
                                <span class="streak-label">day streak</span>
                            </div>
                            ${streakMilestone ? `<div class="milestone-badge" style="color: ${streakMilestone.color}">${streakMilestone.icon} ${streakMilestone.name}</div>` : ''}
                        </div>
                    ` : ''}
                </div>
                <div class="child-actions">
                    <button class="btn btn-outline btn-sm ai-suggestions-btn" data-child-id="${child.id}" title="Get AI-powered activity suggestions">
                        <span>🤖</span> Smart Suggestions
                    </button>
                </div>
            </div>
            <div class="progress-section">
                <div class="progress-header">
                    <div class="progress-title">🌟 This Week's Progress</div>
                    <div class="progress-stats">
                        <span>${progress.completionPercentage}% complete</span>
                    </div>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress.completionPercentage}%"></div>
                </div>
                <div class="stars-container">
                    ${stars}
                </div>
            </div>
            
            ${currentStreak > 0 ? `
                <div class="streak-progress-section">
                    <div class="streak-progress-header">
                        <div class="streak-progress-title">🔥 Streak Progress</div>
                        <div class="streak-progress-stats">
                            ${streakProgress.nextMilestone ? `<span>${currentStreak}/${streakProgress.nextMilestone} days</span>` : '<span>Max streak reached!</span>'}
                        </div>
                    </div>
                    <div class="streak-progress-bar">
                        <div class="streak-progress-fill" style="width: ${streakProgress.progress}%"></div>
                    </div>
                    ${streakProgress.nextMilestone ? `
                        <div class="next-milestone">
                            <span class="next-milestone-text">Next milestone: ${streakProgress.nextMilestone} days</span>
                        </div>
                    ` : ''}
                </div>
            ` : ''}
            

            <div class="chore-grid">
                ${this.renderChoreGrid(child.id, childChores, childCompletions)}
            </div>
            <div class="earnings-section">
                <div class="earnings-amount">${this.formatCents(progress.totalEarnings)}</div>
                <div class="earnings-label">💰 Earnings (${this.formatCents(this.familySettings?.daily_reward_cents || 7)} per completed day${this.familySettings?.weekly_bonus_cents ? ` + ${this.formatCents(this.familySettings.weekly_bonus_cents)} weekly bonus` : ''})</div>
            </div>
        `;
        // Add click handlers for chore cells
        this.addChoreCellHandlers(card, childChores, child.id);
        return card;
    }

    renderChoreGrid(childId, chores, completions) {
        // Filter chores by category
        const filteredChores = this.categoryFilter === 'all' 
            ? chores 
            : chores.filter(chore => chore.category === this.categoryFilter);
        
        if (chores.length === 0) {
            return `
                <div style="text-align: center; padding: 2rem; color: var(--gray-500);">
                    <p>No chores yet! Add some chores to get started.</p>
                    <button class="btn btn-primary add-chore-empty-btn" data-open-modal="add-chore-modal">
                        <span>📝</span> Add Chore
                    </button>
                </div>
            `;
        }
        
        if (filteredChores.length === 0) {
            return `
                <div style="text-align: center; padding: 2rem; color: var(--gray-500);">
                    <p>No chores in this category yet.</p>
                    <button class="btn btn-primary add-chore-empty-btn" data-open-modal="add-chore-modal">
                        <span>📝</span> Add Chore
                    </button>
                </div>
            `;
        }
        
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        let html = `
            <table class="chore-grid-table">
                <thead>
                    <tr>
                        <th>Chore</th>
                        ${days.map(day => `<th>${day}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
        `;
        filteredChores.forEach(chore => {
            const choreCompletions = completions.filter(comp => comp.chore_id === chore.id);
            const icon = chore.icon || '📝';
            const category = chore.category || 'household_chores';
            const categoryInfo = this.getCategoryInfo(category);
            const notes = chore.notes || '';
            html += `
                <tr>
                    <td>
                        <div style="display: flex; align-items: flex-start; gap: var(--space-2); min-width: 0;">
                            <span style="font-size: 1.2rem; flex-shrink: 0;">${icon}</span>
                            <div style="flex: 1; min-width: 0;">
                                <div style="display: flex; align-items: center; gap: var(--space-2); margin-bottom: 4px; flex-wrap: wrap;">
                                    <span style="font-weight: 600; flex-shrink: 1; min-width: 0;">${chore.name}</span>
                                    <span class="category-badge" style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; background: ${categoryInfo.bgColor}; color: ${categoryInfo.color}; border: 1px solid ${categoryInfo.color}; flex-shrink: 0;">
                                        <span>${categoryInfo.icon}</span>
                                        <span>${categoryInfo.label}</span>
                                    </span>
                                </div>
                                ${notes ? `<div style="font-size: var(--font-size-xs); color: var(--gray-600); font-style: italic; margin-top: 2px;">📝 ${notes}</div>` : ''}
                            </div>
                        </div>
                    </td>
            `;
            for (let day = 0; day < 7; day++) {
                const isCompleted = choreCompletions.some(comp => comp.day_of_week === day);
                const cellClass = isCompleted ? 'completed' : 'empty';
                const cellContent = isCompleted ? '✓' : '';
                const dayName = days[day];
                html += `
                    <td data-day="${dayName}">
                        <div class="chore-cell ${cellClass}" 
                             data-chore-id="${chore.id}" 
                             data-day="${day}">
                            ${cellContent}
                        </div>
                    </td>
                `;
            }
            html += '</tr>';
            
            // Add mobile days container
            html += `
                <tr class="mobile-days-row">
                    <td colspan="8" style="width: 100%; padding: 0;">
                        <div class="chore-days-container">
            `;
            for (let day = 0; day < 7; day++) {
                const isCompleted = choreCompletions.some(comp => comp.day_of_week === day);
                const cellClass = isCompleted ? 'completed' : 'empty';
                const cellContent = isCompleted ? '✓' : '';
                const dayName = days[day];
                html += `
                    <div class="chore-day-mobile">
                        <div class="chore-day-label">${dayName}</div>
                        <div class="chore-cell ${cellClass}" 
                             data-chore-id="${chore.id}" 
                             data-day="${day}">
                            ${cellContent}
                        </div>
                    </div>
                `;
            }
            html += `
                        </div>
                    </td>
                </tr>
            `;
        });
        html += `
                </tbody>
            </table>
        `;
        // Add "Add Chore" button below the table
        html += `
            <div style="text-align: center; margin-top: var(--space-4);">
                <button class="btn btn-secondary add-chore-grid-btn" data-open-modal="add-chore-modal">
                    <span>📝</span> Add More Chores
                </button>
            </div>
        `;
        
        // Add Quick Actions section
        html += `
            <div class="quick-actions-section" style="margin-top: var(--space-4); padding: var(--space-3); background: var(--gray-50); border-radius: var(--radius); border: 1px solid var(--gray-200);">
                <h4 style="margin: 0 0 var(--space-2) 0; font-size: var(--font-size-sm); color: var(--gray-700);">⚡ Quick Actions</h4>
                <div class="quick-actions-grid">
                    <button class="btn btn-primary btn-sm mark-all-today-btn" data-child-id="${childId}">
                        <span>✅</span> Mark All Today
                    </button>
                    <button class="btn btn-outline btn-sm mark-all-week-btn" data-child-id="${childId}">
                        <span>📅</span> Mark All Week
                    </button>
                    <button class="btn btn-outline btn-sm clear-all-today-btn" data-child-id="${childId}">
                        <span>❌</span> Clear All Today
                    </button>
                    <button class="btn btn-outline btn-sm view-history-btn" data-child-id="${childId}">
                        <span>📊</span> View History
                    </button>
                    <button class="btn btn-outline btn-sm challenges-btn" data-child-id="${childId}">
                        <span>🎯</span> Challenges
                    </button>
                    <button class="btn btn-outline btn-sm bulk-edit-btn" data-child-id="${childId}">
                        <span>✏️</span> Bulk Edit
                    </button>
                </div>
            </div>
        `;
        return html;
    }



    async updateFamilyDashboard() {
        if (this.children.length === 0) return;

        // Calculate family-wide metrics
        const familyMetrics = this.calculateFamilyMetrics();
        
        // Update dashboard stats
        const totalProgressEl = document.getElementById('family-total-progress');
        const familyLeaderEl = document.getElementById('family-leader');
        const familyStreakEl = document.getElementById('family-streak');
        const familyEarningsEl = document.getElementById('family-earnings');
        
        if (totalProgressEl) {
            totalProgressEl.textContent = `${familyMetrics.averageProgress}%`;
        }
        
        if (familyLeaderEl) {
            familyLeaderEl.textContent = familyMetrics.topPerformer || '-';
        }
        
        if (familyStreakEl) {
            familyStreakEl.textContent = familyMetrics.familyStreak;
        }
        
        if (familyEarningsEl) {
            familyEarningsEl.textContent = this.formatCents(familyMetrics.totalEarnings);
        }
        
        // Update achievements
        await this.updateFamilyAchievements();
    }

    calculateFamilyMetrics() {
        const childMetrics = this.children.map(child => {
            const childChores = this.chores.filter(chore => chore.child_id === child.id);
            const childCompletions = this.completions.filter(comp => 
                childChores.some(chore => chore.id === comp.chore_id)
            );
            
            const progress = this.calculateChildProgress(child.id, childChores, childCompletions);
            const streak = this.calculateStreak(child.id);
            
            return {
                childId: child.id,
                childName: child.name,
                progress: progress.completionPercentage,
                earnings: progress.totalEarnings,
                streak: streak
            };
        });
        
        const averageProgress = Math.round(
            childMetrics.reduce((sum, child) => sum + child.progress, 0) / childMetrics.length
        );
        
        const topPerformer = childMetrics.reduce((best, current) => 
            current.progress > best.progress ? current : best
        );
        
        const totalEarnings = childMetrics.reduce((sum, child) => sum + child.earnings, 0);
        
        // Calculate family streak (consecutive days everyone completed at least one chore)
        const familyStreak = this.calculateFamilyStreak();
        
        return {
            averageProgress,
            topPerformer: topPerformer.childName,
            totalEarnings,
            familyStreak
        };
    }

    calculateFamilyStreak() {
        // Simplified family streak calculation
        // In a real app, you'd track this more carefully
        const today = new Date();
        const weekStart = this.apiClient.getWeekStart();
        const weekStartDate = new Date(weekStart);
        
        // Count how many days this week the family completed chores
        const familyCompletions = this.completions.filter(comp => {
            const compDate = new Date(comp.week_start);
            const dayOffset = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(comp.day_of_week);
            const actualDate = new Date(compDate);
            actualDate.setDate(compDate.getDate() + dayOffset);
            
            return actualDate >= weekStartDate && actualDate <= today;
        });
        
        // Count unique days with completions
        const completedDays = new Set();
        familyCompletions.forEach(comp => {
            completedDays.add(comp.day_of_week);
        });
        
        return completedDays.size;
    }

    async updateFamilyAchievements() {
        const achievementsList = document.getElementById('achievements-list');
        if (!achievementsList) return;
        
        try {
            // Get recent achievements (last 7 days)
            const recentAchievements = await this.getRecentAchievements();
            
            if (!recentAchievements || recentAchievements.length === 0) {
                achievementsList.innerHTML = '<p class="no-achievements">No achievements yet this week. Complete chores to earn badges!</p>';
                return;
            }
            
            const achievementsHtml = recentAchievements.map(achievement => `
                <div class="achievement-item">
                    <div class="achievement-icon">${achievement.badge_icon}</div>
                    <div class="achievement-info">
                        <div class="achievement-name">${achievement.badge_name}</div>
                        <div class="achievement-description">${achievement.badge_description}</div>
                    </div>
                </div>
            `).join('');
            
            achievementsList.innerHTML = achievementsHtml;
        } catch (error) {
            console.error('Error updating family achievements:', error);
            achievementsList.innerHTML = '<p class="no-achievements">No achievements yet this week. Complete chores to earn badges!</p>';
        }
    }

    async getRecentAchievements() {
        try {
            // Get achievements from the last 7 days
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            
            const { data: achievements, error } = await this.apiClient.supabase
                .from('achievement_badges')
                .select('*')
                .gte('earned_at', weekAgo.toISOString())
                .order('earned_at', { ascending: false })
                .limit(5);
            
            if (error) throw error;
            return achievements || [];
        } catch (error) {
            console.error('Error fetching recent achievements:', error);
            return [];
        }
    }

    // Premium: Seasonal Themes
    initializeAchievementBadges() {
        return {
            first_chore: {
                id: 'first_chore',
                name: 'First Steps',
                description: 'Complete your first chore!',
                icon: '👶',
                color: '#10b981',
                condition: (childId, completions) => completions.length >= 1,
                rarity: 'common'
            },
            week_warrior: {
                id: 'week_warrior',
                name: 'Week Warrior',
                description: 'Complete all chores for a full week!',
                icon: '⚔️',
                color: '#3b82f6',
                condition: (childId, completions) => this.checkWeeklyStreak(childId, completions) >= 7,
                rarity: 'rare'
            },
            streak_master: {
                id: 'streak_master',
                name: 'Streak Master',
                description: 'Maintain a 10-day streak!',
                icon: '🔥',
                color: '#f59e0b',
                condition: (childId, completions) => this.checkDailyStreak(childId, completions) >= 10,
                rarity: 'epic'
            },
            perfect_week: {
                id: 'perfect_week',
                name: 'Perfect Week',
                description: 'Complete every single chore for a week!',
                icon: '⭐',
                color: '#8b5cf6',
                condition: (childId, completions) => this.checkPerfectWeek(childId, completions),
                rarity: 'legendary'
            },
            early_bird: {
                id: 'early_bird',
                name: 'Early Bird',
                description: 'Complete chores before 9 AM for 5 days!',
                icon: '🐦',
                color: '#06b6d4',
                condition: (childId, completions) => this.checkEarlyBird(childId, completions),
                rarity: 'rare'
            },
            helper: {
                id: 'helper',
                name: 'Family Helper',
                description: 'Help with 50 household chores!',
                icon: '🏠',
                color: '#ef4444',
                condition: (childId, completions) => this.checkHouseholdChores(childId, completions) >= 50,
                rarity: 'common'
            },
            scholar: {
                id: 'scholar',
                name: 'Little Scholar',
                description: 'Complete 25 learning activities!',
                icon: '📚',
                color: '#8b5cf6',
                condition: (childId, completions) => this.checkLearningActivities(childId, completions) >= 25,
                rarity: 'rare'
            },
            artist: {
                id: 'artist',
                name: 'Creative Artist',
                description: 'Complete 20 creative activities!',
                icon: '🎨',
                color: '#ec4899',
                condition: (childId, completions) => this.checkCreativeActivities(childId, completions) >= 20,
                rarity: 'rare'
            },
            athlete: {
                id: 'athlete',
                name: 'Young Athlete',
                description: 'Complete 30 physical activities!',
                icon: '🏃',
                color: '#f97316',
                condition: (childId, completions) => this.checkPhysicalActivities(childId, completions) >= 30,
                rarity: 'rare'
            },
            champion: {
                id: 'champion',
                name: 'Chore Champion',
                description: 'Complete 100 total chores!',
                icon: '🏆',
                color: '#fbbf24',
                condition: (childId, completions) => completions.length >= 100,
                rarity: 'legendary'
            }
        };
    }

    initializeSeasonalThemes() {
        return {
            christmas: {
                name: 'Christmas',
                icon: '🎄',
                startDate: '12-01',
                endDate: '12-31',
                decorations: {
                    header: 'Christmas',
                    background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                    accentColor: '#dc2626',
                    bodyClass: 'seasonal-christmas'
                },
                seasonalActivities: [
                    { name: 'Decorate Christmas Tree', icon: '🎄', category: 'family_time' },
                    { name: 'Wrap Presents', icon: '🎁', category: 'creative_time' },
                    { name: 'Bake Cookies', icon: '🍪', category: 'creative_time' },
                    { name: 'Write Thank You Cards', icon: '✉️', category: 'learning_education' },
                    { name: 'Hang Stockings', icon: '🧦', category: 'household_chores' },
                    { name: 'Set Up Nativity', icon: '👼', category: 'family_time' }
                ]
            },
            thanksgiving: {
                name: 'Thanksgiving',
                icon: '🦃',
                startDate: '11-20',
                endDate: '11-30',
                decorations: {
                    header: 'Thanksgiving',
                    background: 'linear-gradient(135deg, #ea580c, #fb923c)',
                    accentColor: '#d97706',
                    bodyClass: 'seasonal-thanksgiving'
                },
                seasonalActivities: [
                    { name: 'Set Thanksgiving Table', icon: '🍽️', category: 'household_chores' },
                    { name: 'Help Cook Turkey', icon: '🦃', category: 'creative_time' },
                    { name: 'Make Side Dishes', icon: '🥔', category: 'creative_time' },
                    { name: 'Clean Guest Room', icon: '🛏️', category: 'household_chores' },
                    { name: 'Decorate with Fall Colors', icon: '🍁', category: 'creative_time' }
                ]
            },
            halloween: {
                name: 'Halloween',
                icon: '🎃',
                startDate: '10-01',
                endDate: '10-31',
                decorations: {
                    header: 'Halloween',
                    background: 'linear-gradient(135deg, #ea580c, #f97316)',
                    accentColor: '#ea580c',
                    bodyClass: 'seasonal-halloween'
                },
                seasonalActivities: [
                    { name: 'Carve Pumpkin', icon: '🎃', category: 'creative_time' },
                    { name: 'Decorate House', icon: '👻', category: 'creative_time' },
                    { name: 'Make Costume', icon: '🧙‍♀️', category: 'creative_time' },
                    { name: 'Trick or Treat Prep', icon: '🍬', category: 'family_time' },
                    { name: 'Set Up Scary Decorations', icon: '🕷️', category: 'creative_time' },
                    { name: 'Organize Candy', icon: '🍭', category: 'household_chores' }
                ]
            },
            easter: {
                name: 'Easter',
                icon: '🐰',
                startDate: '04-01',
                endDate: '04-30',
                decorations: {
                    header: 'Easter',
                    background: 'linear-gradient(135deg, #ec4899, #f472b6)',
                    accentColor: '#ec4899',
                    bodyClass: 'seasonal-easter'
                },
                seasonalActivities: [
                    { name: 'Dye Easter Eggs', icon: '🥚', category: 'creative_time' },
                    { name: 'Decorate Easter Basket', icon: '🧺', category: 'family_time' },
                    { name: 'Spring Cleaning', icon: '🌸', category: 'household_chores' },
                    { name: 'Plant Flowers', icon: '🌷', category: 'creative_time' },
                    { name: 'Hide Easter Eggs', icon: '🥚', category: 'games_play' },
                    { name: 'Make Easter Crafts', icon: '🎨', category: 'creative_time' }
                ]
            },
            valentines: {
                name: 'Valentine\'s Day',
                icon: '💝',
                startDate: '02-10',
                endDate: '02-14',
                decorations: {
                    header: 'Valentines',
                    background: 'linear-gradient(135deg, #ec4899, #f472b6)',
                    accentColor: '#ec4899',
                    bodyClass: 'seasonal-valentines'
                },
                seasonalActivities: [
                    { name: 'Make Valentine Cards', icon: '💌', category: 'creative_time' },
                    { name: 'Decorate with Hearts', icon: '💖', category: 'creative_time' },
                    { name: 'Bake Heart Cookies', icon: '🍪', category: 'creative_time' },
                    { name: 'Set Romantic Table', icon: '🕯️', category: 'family_time' },
                    { name: 'Clean for Date Night', icon: '✨', category: 'household_chores' }
                ]
            },
            stpatricks: {
                name: 'St. Patrick\'s Day',
                icon: '☘️',
                startDate: '03-15',
                endDate: '03-17',
                decorations: {
                    header: 'St. Patricks',
                    background: 'linear-gradient(135deg, #059669, #10b981)',
                    accentColor: '#059669',
                    bodyClass: 'seasonal-stpatricks'
                },
                seasonalActivities: [
                    { name: 'Decorate with Shamrocks', icon: '☘️', category: 'creative_time' },
                    { name: 'Make Green Food', icon: '🥗', category: 'creative_time' },
                    { name: 'Wear Green Clothes', icon: '👕', category: 'household_chores' },
                    { name: 'Clean for Party', icon: '🍀', category: 'household_chores' }
                ]
            },
            summer: {
                name: 'Summer',
                icon: '☀️',
                startDate: '06-01',
                endDate: '08-31',
                decorations: {
                    header: 'Summer',
                    background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
                    accentColor: '#f59e0b',
                    bodyClass: 'seasonal-summer'
                },
                seasonalActivities: [
                    { name: 'Water Plants', icon: '💧', category: 'physical_activity' },
                    { name: 'Clean Pool', icon: '🏊', category: 'household_chores' },
                    { name: 'BBQ Prep', icon: '🍖', category: 'creative_time' },
                    { name: 'Beach Cleanup', icon: '🏖️', category: 'physical_activity' },
                    { name: 'Mow Lawn', icon: '🌱', category: 'physical_activity' },
                    { name: 'Wash Car', icon: '🚗', category: 'household_chores' }
                ]
            },
            spring: {
                name: 'Spring',
                icon: '🌸',
                startDate: '03-20',
                endDate: '06-20',
                decorations: {
                    header: 'Spring',
                    background: 'linear-gradient(135deg, #22c55e, #4ade80)',
                    accentColor: '#22c55e',
                    bodyClass: 'seasonal-spring'
                },
                seasonalActivities: [
                    { name: 'Spring Cleaning', icon: '🧹', category: 'household_chores' },
                    { name: 'Plant Garden', icon: '🌱', category: 'creative_time' },
                    { name: 'Clean Windows', icon: '🪟', category: 'household_chores' },
                    { name: 'Organize Closets', icon: '👕', category: 'household_chores' },
                    { name: 'Wash Curtains', icon: '🪟', category: 'household_chores' }
                ]
            },
            fall: {
                name: 'Fall',
                icon: '🍁',
                startDate: '09-22',
                endDate: '12-20',
                decorations: {
                    header: 'Fall',
                    background: 'linear-gradient(135deg, #ea580c, #fb923c)',
                    accentColor: '#ea580c',
                    bodyClass: 'seasonal-fall'
                },
                seasonalActivities: [
                    { name: 'Rake Leaves', icon: '🍂', category: 'physical_activity' },
                    { name: 'Clean Gutters', icon: '🏠', category: 'household_chores' },
                    { name: 'Store Summer Items', icon: '📦', category: 'household_chores' },
                    { name: 'Decorate for Fall', icon: '🎃', category: 'creative_time' },
                    { name: 'Make Hot Chocolate', icon: '☕', category: 'creative_time' }
                ]
            },
            winter: {
                name: 'Winter',
                icon: '❄️',
                startDate: '12-21',
                endDate: '03-19',
                decorations: {
                    header: 'Winter',
                    background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
                    accentColor: '#3b82f6',
                    bodyClass: 'seasonal-winter'
                },
                seasonalActivities: [
                    { name: 'Shovel Snow', icon: '❄️', category: 'physical_activity' },
                    { name: 'Salt Driveway', icon: '🧂', category: 'household_chores' },
                    { name: 'Make Hot Soup', icon: '🍲', category: 'creative_time' },
                    { name: 'Build Snowman', icon: '⛄', category: 'games_play' },
                    { name: 'Clean Fireplace', icon: '🔥', category: 'household_chores' }
                ]
            },
            back_to_school: {
                name: 'Back to School',
                icon: '🎒',
                startDate: '08-15',
                endDate: '09-15',
                decorations: {
                    header: 'Back to School',
                    background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                    accentColor: '#2563eb',
                    bodyClass: 'seasonal-backtoschool'
                },
                seasonalActivities: [
                    { name: 'Organize School Supplies', icon: '📚', category: 'learning_education' },
                    { name: 'Set Up Study Space', icon: '🖥️', category: 'learning_education' },
                    { name: 'Pack Lunch', icon: '🥪', category: 'household_chores' },
                    { name: 'Review Homework', icon: '✏️', category: 'learning_education' },
                    { name: 'Plan School Outfit', icon: '👕', category: 'household_chores' },
                    { name: 'Create Study Schedule', icon: '📅', category: 'learning_education' }
                ]
            },
            new_year: {
                name: 'New Year',
                icon: '🎆',
                startDate: '01-01',
                endDate: '01-07',
                decorations: {
                    header: 'New Year',
                    background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
                    accentColor: '#8b5cf6',
                    bodyClass: 'seasonal-newyear'
                },
                seasonalActivities: [
                    { name: 'Set New Year Goals', icon: '🎯', category: 'learning_education' },
                    { name: 'Organize Room', icon: '🧹', category: 'household_chores' },
                    { name: 'Clean Out Old Things', icon: '📦', category: 'household_chores' },
                    { name: 'Write Thank You Notes', icon: '✉️', category: 'learning_education' },
                    { name: 'Plan Healthy Habits', icon: '💪', category: 'physical_activity' }
                ]
            },
            mothers_day: {
                name: 'Mother\'s Day',
                icon: '🌷',
                startDate: '05-07',
                endDate: '05-14',
                decorations: {
                    header: 'Mother\'s Day',
                    background: 'linear-gradient(135deg, #ec4899, #f472b6)',
                    accentColor: '#ec4899',
                    bodyClass: 'seasonal-mothersday'
                },
                seasonalActivities: [
                    { name: 'Make Mom Breakfast', icon: '🥞', category: 'creative_time' },
                    { name: 'Clean House for Mom', icon: '🏠', category: 'household_chores' },
                    { name: 'Make Mother\'s Day Card', icon: '💌', category: 'creative_time' },
                    { name: 'Plan Special Day', icon: '📅', category: 'family_time' },
                    { name: 'Help with Gardening', icon: '🌱', category: 'creative_time' }
                ]
            }
        };
    }

    getCurrentSeasonalTheme() {
        if (!this.isPremiumUser()) return null;
        
        const today = new Date();
        const currentDate = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        for (const [season, theme] of Object.entries(this.seasonalThemes)) {
            if (currentDate >= theme.startDate && currentDate <= theme.endDate) {
                // Check if this theme is enabled in user preferences
                if (this.isSeasonalThemeEnabled(season)) {
                return theme;
                }
            }
        }
        
        return null;
    }
    
    // Check if a specific seasonal theme is enabled
    isSeasonalThemeEnabled(themeName) {
        const enabledThemes = JSON.parse(localStorage.getItem('enabled_seasonal_themes') || '{}');
        // Default to true for all themes except christmas, which should be opt-in
        if (enabledThemes[themeName] === undefined) {
            // Christmas is opt-in, all others are default enabled
            return themeName !== 'christmas';
        }
        return enabledThemes[themeName];
    }
    
    // Save enabled/disabled state for a seasonal theme
    setSeasonalThemeEnabled(themeName, enabled) {
        const enabledThemes = JSON.parse(localStorage.getItem('enabled_seasonal_themes') || '{}');
        enabledThemes[themeName] = enabled;
        localStorage.setItem('enabled_seasonal_themes', JSON.stringify(enabledThemes));
    }
    
    // Toggle a seasonal theme on/off
    toggleSeasonalTheme(themeName, enabled) {
        this.setSeasonalThemeEnabled(themeName, enabled);
        
        // Show a toast message
        const themeDisplayName = this.seasonalThemes[themeName]?.name || themeName;
        if (enabled) {
            this.showToast(`${themeDisplayName} theme enabled!`, 'success');
        } else {
            this.showToast(`${themeDisplayName} theme disabled`, 'info');
        }
        
        // Refresh the themes grid to update UI
        this.populateThemesGrid();
        
        // Re-apply seasonal theme (will check if current theme is still enabled)
        this.applySeasonalTheme();
    }

    applySeasonalTheme() {
        const theme = this.getCurrentSeasonalTheme();
        if (!theme) {
            // Remove any existing seasonal classes
            document.body.classList.remove('seasonal-christmas', 'seasonal-halloween', 'seasonal-easter', 
                'seasonal-summer', 'seasonal-spring', 'seasonal-fall', 'seasonal-winter', 
                'seasonal-valentines', 'seasonal-stpatricks', 'seasonal-thanksgiving',
                'seasonal-backtoschool', 'seasonal-newyear', 'seasonal-mothersday');
            return;
        }
        
        // Apply theme decorations
        const header = document.querySelector('.app-header h1');
        if (header) {
            header.textContent = theme.decorations.header;
        }
        
        // Apply background gradient to header (only in light mode)
        const appHeader = document.querySelector('.app-header');
        if (appHeader) {
            const isDarkMode = document.body.getAttribute('data-theme') === 'dark';
            if (!isDarkMode) {
                appHeader.style.background = theme.decorations.background;
            } else {
                // In dark mode, let CSS handle the background
                appHeader.style.background = '';
            }
        }
        
        // Apply accent color to various elements
        document.documentElement.style.setProperty('--seasonal-accent', theme.decorations.accentColor);
        
        // Add seasonal class to body
        document.body.classList.add(theme.decorations.bodyClass);
        
        // Show seasonal notification with chore suggestions
        this.showSeasonalNotification(theme);
        
        // Add seasonal activity suggestions button if premium
        this.addSeasonalActivitySuggestions(theme);
    }

    showSeasonalNotification(theme) {
        // Check if seasonal theme notifications are enabled
        if (!this.getNotificationPreference('seasonal_theme')) {
            return;
        }
        
        // Check if we've already shown this seasonal theme notification today
        const today = new Date().toDateString();
        const seasonalNotificationKey = `seasonal_notification_${theme.key}_${today}`;
        const hasShownToday = localStorage.getItem(seasonalNotificationKey);
        
        if (hasShownToday) {
            return;
        }
        
        const message = `🎉 ${theme.name} theme activated! Check out seasonal activity suggestions!`;
        this.showToast(message, 'success');
        
        // Show a more detailed notification after a delay
        setTimeout(() => {
            const suggestions = theme.seasonalActivities.slice(0, 3).map(activity => activity.name).join(', ');
            this.showToast(`💡 Try these seasonal activities: ${suggestions}`, 'info');
        }, 3000);
        
        // Mark as shown today
        localStorage.setItem(seasonalNotificationKey, 'true');
    }

    addSeasonalActivitySuggestions(theme) {
        // Remove existing seasonal button if any
        const existingBtn = document.querySelector('.seasonal-suggestions-btn');
        if (existingBtn) {
            existingBtn.remove();
        }
        
        // Add seasonal suggestions button to the dashboard
        const dashboardActions = document.querySelector('.dashboard-actions');
        if (dashboardActions) {
            const seasonalBtn = document.createElement('button');
            seasonalBtn.className = 'btn btn-outline btn-sm seasonal-suggestions-btn';
            seasonalBtn.innerHTML = `${theme.icon} ${theme.name} Activities`;
            seasonalBtn.onclick = () => this.showSeasonalActivityModal(theme);
            dashboardActions.appendChild(seasonalBtn);
        }
    }

    showSeasonalActivityModal(theme) {
        // Populate the seasonal activity modal content
        const modalContent = document.getElementById('seasonal-chore-content');
        if (!modalContent) return;
        
        modalContent.innerHTML = `
            <div class="seasonal-chore-modal">
                <div class="seasonal-header">
                    <h2>${theme.icon} ${theme.name} Activity Suggestions</h2>
                    <p>Add these seasonal activities to make ${theme.name} special!</p>
                </div>
                <div class="seasonal-activities-grid">
                    ${theme.seasonalActivities.map(activity => `
                        <div class="seasonal-activity-item">
                            <div class="activity-icon">${activity.icon}</div>
                            <div class="activity-details">
                                <h4>${activity.name}</h4>
                                <span class="activity-category">${activity.category}</span>
                            </div>
                            <button class="btn btn-primary btn-sm" onclick="app.addSeasonalActivity('${activity.name}', '${activity.icon}', '${activity.category}')">
                                Add Activity
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        // Show the modal
        this.showModal('seasonal-chore-modal');
    }

    async addSeasonalActivity(activityName, activityIcon, activityCategory) {
        // Get the first child (or prompt user to select)
        const children = this.children;
        if (children.length === 0) {
            this.showToast('Please add a child first!', 'error');
            return;
        }
        
        const childId = children[0].id; // Default to first child
        
        const activityData = {
            name: activityName,
            icon: activityIcon,
            category: activityCategory,
            child_id: childId,
            reward: 7 // Default reward
        };
        
        try {
            // Find and set loading state on add seasonal activity button
            const addButton = document.querySelector(`button[onclick*="addSeasonalActivity('${activityName}"]`);
            if (addButton) {
                this.setButtonLoading(addButton, true);
            }

            const result = await this.apiClient.addChore(activityData);
            
            if (result.success) {
                await this.loadChores();
                this.renderChildren();
                this.showToast(`Added ${activityName} to your activities!`, 'success');
            } else {
                this.showToast('Failed to add seasonal activity', 'error');
            }
        } catch (error) {
            this.showToast('Error adding seasonal activity', 'error');
        } finally {
            // Reset loading state
            if (addButton) {
                this.setButtonLoading(addButton, false);
            }
        }
    }

    getSeasonalActivitySuggestions() {
        const theme = this.getCurrentSeasonalTheme();
        if (!theme) return [];
        
        return theme.seasonalActivities;
    }

    // Achievement Badge Methods
    checkWeeklyStreak(childId, completions) {
        const childCompletions = completions.filter(c => c.child_id === childId);
        const today = new Date();
        let streak = 0;
        
        for (let i = 0; i < 7; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() - i);
            const dateStr = checkDate.toISOString().split('T')[0];
            
            const dayCompletions = childCompletions.filter(c => c.completed_date === dateStr);
            if (dayCompletions.length > 0) {
                streak++;
            } else {
                break;
            }
        }
        return streak;
    }

    checkDailyStreak(childId, completions) {
        const childCompletions = completions.filter(c => c.child_id === childId);
        const today = new Date();
        let streak = 0;
        
        for (let i = 0; i < 30; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() - i);
            const dateStr = checkDate.toISOString().split('T')[0];
            
            const dayCompletions = childCompletions.filter(c => c.completed_date === dateStr);
            if (dayCompletions.length > 0) {
                streak++;
            } else {
                break;
            }
        }
        return streak;
    }

    checkPerfectWeek(childId, completions) {
        const childCompletions = completions.filter(c => c.child_id === childId);
        const childChores = this.chores.filter(c => c.child_id === childId);
        const today = new Date();
        
        for (let i = 0; i < 7; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() - i);
            const dateStr = checkDate.toISOString().split('T')[0];
            
            const dayCompletions = childCompletions.filter(c => c.completed_date === dateStr);
            if (dayCompletions.length < childChores.length) {
                return false;
            }
        }
        return true;
    }

    checkEarlyBird(childId, completions) {
        const childCompletions = completions.filter(c => c.child_id === childId);
        let earlyBirdDays = 0;
        
        childCompletions.forEach(completion => {
            const completionTime = new Date(completion.completed_at);
            if (completionTime.getHours() < 9) {
                earlyBirdDays++;
            }
        });
        
        return earlyBirdDays >= 5;
    }

    checkHouseholdChores(childId, completions) {
        const childCompletions = completions.filter(c => c.child_id === childId);
        return childCompletions.filter(c => {
            const chore = this.chores.find(chore => chore.id === c.chore_id);
            return chore && chore.category === 'household_chores';
        }).length;
    }

    checkLearningActivities(childId, completions) {
        const childCompletions = completions.filter(c => c.child_id === childId);
        return childCompletions.filter(c => {
            const chore = this.chores.find(chore => chore.id === c.chore_id);
            return chore && chore.category === 'learning_education';
        }).length;
    }

    checkCreativeActivities(childId, completions) {
        const childCompletions = completions.filter(c => c.child_id === childId);
        return childCompletions.filter(c => {
            const chore = this.chores.find(chore => chore.id === c.chore_id);
            return chore && chore.category === 'creative_time';
        }).length;
    }

    checkPhysicalActivities(childId, completions) {
        const childCompletions = completions.filter(c => c.child_id === childId);
        return childCompletions.filter(c => {
            const chore = this.chores.find(chore => chore.id === c.chore_id);
            return chore && chore.category === 'physical_activity';
        }).length;
    }

    checkAchievements(childId) {
        const childCompletions = this.completions.filter(c => c.child_id === childId);
        const newBadges = [];
        
        Object.values(this.achievementBadges).forEach(badge => {
            if (!this.unlockedBadges.has(badge.id) && badge.condition(childId, childCompletions)) {
                this.unlockedBadges.add(badge.id);
                newBadges.push(badge);
            }
        });
        
        if (newBadges.length > 0) {
            this.showBadgeUnlockAnimation(newBadges);
        }
        
        return newBadges;
    }

    showBadgeUnlockAnimation(badges) {
        badges.forEach((badge, index) => {
            setTimeout(() => {
                this.createBadgeNotification(badge);
            }, index * 500);
        });
    }

    createBadgeNotification(badge) {
        // Create badge notification element
        const notification = document.createElement('div');
        notification.className = 'badge-notification';
        notification.setAttribute('data-rarity', badge.rarity);
        notification.innerHTML = `
            <div class="badge-notification-content">
                <div class="badge-icon" style="background: ${badge.color}">${badge.icon}</div>
                <div class="badge-text">
                    <h4>🏆 Achievement Unlocked!</h4>
                    <h3>${badge.name}</h3>
                    <p>${badge.description}</p>
                </div>
                <div class="badge-close">&times;</div>
            </div>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
        
        // Close button
        notification.querySelector('.badge-close').addEventListener('click', () => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        });
        
        // Play sound if enabled
        if (this.settings.soundEnabled) {
            this.playAchievementSound();
        }
    }

    playAchievementSound() {
        // Create a simple achievement sound using Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
        oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
        oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    }

    // Enhanced Streak Methods
    getCurrentStreak(childId) {
        const childCompletions = this.completions.filter(c => c.child_id === childId);
        const today = new Date();
        let streak = 0;
        
        for (let i = 0; i < 30; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() - i);
            const dateStr = checkDate.toISOString().split('T')[0];
            
            const dayCompletions = childCompletions.filter(c => c.completed_date === dateStr);
            if (dayCompletions.length > 0) {
                streak++;
            } else {
                break;
            }
        }
        return streak;
    }

    getStreakMilestone(streak) {
        const milestones = [
            { days: 3, name: 'Getting Started', icon: '🌱', color: '#10b981' },
            { days: 7, name: 'Week Warrior', icon: '⚔️', color: '#3b82f6' },
            { days: 14, name: 'Two Week Champion', icon: '🏆', color: '#8b5cf6' },
            { days: 21, name: 'Three Week Master', icon: '👑', color: '#f59e0b' },
            { days: 30, name: 'Monthly Legend', icon: '🌟', color: '#ef4444' },
            { days: 50, name: 'Streak Superstar', icon: '⭐', color: '#fbbf24' },
            { days: 100, name: 'Century Champion', icon: '💎', color: '#06b6d4' }
        ];
        
        for (let i = milestones.length - 1; i >= 0; i--) {
            if (streak >= milestones[i].days) {
                return milestones[i];
            }
        }
        return null;
    }

    getNextStreakMilestone(streak) {
        const milestones = [3, 7, 14, 21, 30, 50, 100];
        return milestones.find(milestone => milestone > streak) || null;
    }

    getStreakProgress(streak) {
        const nextMilestone = this.getNextStreakMilestone(streak);
        if (!nextMilestone) return { progress: 100, nextMilestone: null };
        
        const previousMilestone = this.getPreviousMilestone(streak);
        const progress = ((streak - previousMilestone) / (nextMilestone - previousMilestone)) * 100;
        
        return { progress: Math.min(progress, 100), nextMilestone };
    }

    getPreviousMilestone(streak) {
        const milestones = [0, 3, 7, 14, 21, 30, 50, 100];
        for (let i = milestones.length - 1; i >= 0; i--) {
            if (milestones[i] <= streak) {
                return milestones[i];
            }
        }
        return 0;
    }

    checkStreakMilestone(childId, newStreak) {
        const milestone = this.getStreakMilestone(newStreak);
        if (milestone && newStreak === milestone.days) {
            this.showStreakMilestoneCelebration(childId, milestone);
        }
    }

    showStreakMilestoneCelebration(childId, milestone) {
        const childName = this.getChildName(childId);
        
        // Create celebration notification
        const notification = document.createElement('div');
        notification.className = 'streak-milestone-notification';
        notification.innerHTML = `
            <div class="streak-milestone-content">
                <div class="milestone-icon" style="background: ${milestone.color}">${milestone.icon}</div>
                <div class="milestone-text">
                    <h3>🎉 Streak Milestone!</h3>
                    <h2>${milestone.name}</h2>
                    <p>${childName} has maintained a ${milestone.days}-day streak!</p>
                </div>
                <div class="milestone-close">&times;</div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Auto remove after 6 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 6000);
        
        // Close button
        notification.querySelector('.milestone-close').addEventListener('click', () => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        });
        
        // Play celebration sound
        if (this.settings.soundEnabled) {
            this.playStreakMilestoneSound();
        }
        
        // Show confetti effect
        this.showConfetti();
    }

    playStreakMilestoneSound() {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create a more elaborate celebration sound
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((note, index) => {
            setTimeout(() => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.setValueAtTime(note, audioContext.currentTime);
                gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.3);
            }, index * 100);
        });
    }

    showConfetti() {
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3'];
        const confettiCount = 50;
        
        for (let i = 0; i < confettiCount; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.className = 'confetti-piece';
                confetti.style.cssText = `
                    position: fixed;
                    width: 10px;
                    height: 10px;
                    background: ${colors[Math.floor(Math.random() * colors.length)]};
                    top: -10px;
                    left: ${Math.random() * 100}vw;
                    z-index: 10000;
                    animation: confetti-fall 3s linear forwards;
                `;
                
                document.body.appendChild(confetti);
                
                setTimeout(() => confetti.remove(), 3000);
            }, i * 20);
        }
    }

    // AI-Powered Chore Suggestions System
    initializeAISuggestions() {
        return {
            choreTemplates: {
                household_chores: [
                    { name: 'Make Bed', icon: '🛏️', difficulty: 'easy', timeEstimate: 5 },
                    { name: 'Put Away Toys', icon: '🧸', difficulty: 'easy', timeEstimate: 10 },
                    { name: 'Set Table', icon: '🍽️', difficulty: 'easy', timeEstimate: 5 },
                    { name: 'Clear Table', icon: '🧹', difficulty: 'easy', timeEstimate: 5 },
                    { name: 'Feed Pet', icon: '🐕', difficulty: 'easy', timeEstimate: 5 },
                    { name: 'Water Plants', icon: '🌱', difficulty: 'easy', timeEstimate: 5 },
                    { name: 'Take Out Trash', icon: '🗑️', difficulty: 'medium', timeEstimate: 10 },
                    { name: 'Vacuum Room', icon: '🧽', difficulty: 'medium', timeEstimate: 15 },
                    { name: 'Load Dishwasher', icon: '🍽️', difficulty: 'medium', timeEstimate: 10 },
                    { name: 'Fold Laundry', icon: '👕', difficulty: 'medium', timeEstimate: 20 },
                    { name: 'Clean Bathroom', icon: '🚿', difficulty: 'hard', timeEstimate: 30 },
                    { name: 'Organize Closet', icon: '👗', difficulty: 'hard', timeEstimate: 45 }
                ],
                learning_education: [
                    { name: 'Read for 20 Minutes', icon: '📚', difficulty: 'easy', timeEstimate: 20 },
                    { name: 'Practice Math Facts', icon: '🔢', difficulty: 'easy', timeEstimate: 15 },
                    { name: 'Write in Journal', icon: '📝', difficulty: 'easy', timeEstimate: 15 },
                    { name: 'Study Spelling Words', icon: '✏️', difficulty: 'medium', timeEstimate: 20 },
                    { name: 'Complete Homework', icon: '📖', difficulty: 'medium', timeEstimate: 30 },
                    { name: 'Research Project', icon: '🔍', difficulty: 'hard', timeEstimate: 60 },
                    { name: 'Practice Piano', icon: '🎹', difficulty: 'medium', timeEstimate: 30 },
                    { name: 'Learn New Language', icon: '🗣️', difficulty: 'medium', timeEstimate: 25 }
                ],
                physical_activity: [
                    { name: 'Go for Walk', icon: '🚶', difficulty: 'easy', timeEstimate: 20 },
                    { name: 'Ride Bike', icon: '🚲', difficulty: 'easy', timeEstimate: 30 },
                    { name: 'Play Outside', icon: '🏃', difficulty: 'easy', timeEstimate: 30 },
                    { name: 'Do Yoga', icon: '🧘', difficulty: 'medium', timeEstimate: 20 },
                    { name: 'Practice Sports', icon: '⚽', difficulty: 'medium', timeEstimate: 45 },
                    { name: 'Go Swimming', icon: '🏊', difficulty: 'medium', timeEstimate: 60 },
                    { name: 'Hike Trail', icon: '🥾', difficulty: 'hard', timeEstimate: 120 },
                    { name: 'Run Mile', icon: '🏃‍♂️', difficulty: 'hard', timeEstimate: 15 }
                ],
                creative_time: [
                    { name: 'Draw Picture', icon: '🎨', difficulty: 'easy', timeEstimate: 30 },
                    { name: 'Build with Blocks', icon: '🧱', difficulty: 'easy', timeEstimate: 20 },
                    { name: 'Make Craft', icon: '✂️', difficulty: 'medium', timeEstimate: 45 },
                    { name: 'Write Story', icon: '📖', difficulty: 'medium', timeEstimate: 30 },
                    { name: 'Paint Canvas', icon: '🖌️', difficulty: 'hard', timeEstimate: 60 },
                    { name: 'Build Model', icon: '🏗️', difficulty: 'hard', timeEstimate: 90 },
                    { name: 'Create Music', icon: '🎵', difficulty: 'medium', timeEstimate: 40 },
                    { name: 'Design Poster', icon: '📋', difficulty: 'medium', timeEstimate: 35 }
                ],
                games_play: [
                    { name: 'Play Board Game', icon: '🎲', difficulty: 'easy', timeEstimate: 30 },
                    { name: 'Solve Puzzle', icon: '🧩', difficulty: 'easy', timeEstimate: 20 },
                    { name: 'Play Video Game', icon: '🎮', difficulty: 'easy', timeEstimate: 30 },
                    { name: 'Build Fort', icon: '🏰', difficulty: 'medium', timeEstimate: 45 },
                    { name: 'Play Hide & Seek', icon: '👀', difficulty: 'easy', timeEstimate: 20 },
                    { name: 'Create Treasure Hunt', icon: '🗺️', difficulty: 'hard', timeEstimate: 60 },
                    { name: 'Play Charades', icon: '🎭', difficulty: 'medium', timeEstimate: 25 },
                    { name: 'Build Card House', icon: '🃏', difficulty: 'medium', timeEstimate: 30 }
                ],
                reading: [
                    { name: 'Read Picture Book', icon: '📚', difficulty: 'easy', timeEstimate: 15 },
                    { name: 'Read Chapter Book', icon: '📖', difficulty: 'medium', timeEstimate: 30 },
                    { name: 'Read Comic Book', icon: '📰', difficulty: 'easy', timeEstimate: 20 },
                    { name: 'Read Poetry', icon: '📜', difficulty: 'medium', timeEstimate: 25 },
                    { name: 'Read Biography', icon: '👤', difficulty: 'hard', timeEstimate: 45 },
                    { name: 'Read Science Book', icon: '🔬', difficulty: 'hard', timeEstimate: 40 },
                    { name: 'Read to Sibling', icon: '👶', difficulty: 'easy', timeEstimate: 20 },
                    { name: 'Read Aloud', icon: '🗣️', difficulty: 'medium', timeEstimate: 25 }
                ],
                family_time: [
                    { name: 'Help with Cooking', icon: '👨‍🍳', difficulty: 'easy', timeEstimate: 30 },
                    { name: 'Family Game Night', icon: '🎲', difficulty: 'easy', timeEstimate: 60 },
                    { name: 'Watch Movie Together', icon: '🎬', difficulty: 'easy', timeEstimate: 120 },
                    { name: 'Go to Park', icon: '🌳', difficulty: 'medium', timeEstimate: 90 },
                    { name: 'Visit Grandparents', icon: '👴', difficulty: 'medium', timeEstimate: 180 },
                    { name: 'Family Photo Session', icon: '📸', difficulty: 'easy', timeEstimate: 30 },
                    { name: 'Plan Family Trip', icon: '✈️', difficulty: 'hard', timeEstimate: 60 },
                    { name: 'Family Story Time', icon: '📚', difficulty: 'easy', timeEstimate: 30 }
                ]
            },
            timePreferences: {
                morning: ['Make Bed', 'Feed Pet', 'Water Plants', 'Go for Walk', 'Read for 20 Minutes'],
                afternoon: ['Put Away Toys', 'Practice Math Facts', 'Play Outside', 'Draw Picture', 'Play Board Game'],
                evening: ['Set Table', 'Clear Table', 'Complete Homework', 'Family Game Night', 'Read Chapter Book']
            },
            difficultyProgression: {
                easy: ['Make Bed', 'Put Away Toys', 'Set Table', 'Read Picture Book', 'Play Board Game'],
                medium: ['Take Out Trash', 'Vacuum Room', 'Complete Homework', 'Make Craft', 'Build Fort'],
                hard: ['Clean Bathroom', 'Organize Closet', 'Research Project', 'Paint Canvas', 'Create Treasure Hunt']
            }
        };
    }

    analyzeChildPatterns(childId) {
        const childCompletions = this.completions.filter(c => c.child_id === childId);
        const childChores = this.chores.filter(c => c.child_id === childId);
        
        // Analyze completion patterns
        const patterns = {
            favoriteCategories: this.getFavoriteCategories(childId, childCompletions),
            preferredTimes: this.getPreferredTimes(childId, childCompletions),
            difficultyPreference: this.getDifficultyPreference(childId, childCompletions),
            completionRate: this.getCompletionRate(childId, childCompletions),
            recentTrends: this.getRecentTrends(childId, childCompletions)
        };
        
        return patterns;
    }

    getFavoriteCategories(childId, completions) {
        const categoryCounts = {};
        completions.forEach(completion => {
            const chore = this.chores.find(c => c.id === completion.chore_id);
            if (chore) {
                categoryCounts[chore.category] = (categoryCounts[chore.category] || 0) + 1;
            }
        });
        
        return Object.entries(categoryCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([category]) => category);
    }

    getPreferredTimes(childId, completions) {
        const timeCounts = { morning: 0, afternoon: 0, evening: 0 };
        
        completions.forEach(completion => {
            const hour = new Date(completion.completed_at).getHours();
            if (hour >= 6 && hour < 12) timeCounts.morning++;
            else if (hour >= 12 && hour < 18) timeCounts.afternoon++;
            else timeCounts.evening++;
        });
        
        return Object.entries(timeCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 2)
            .map(([time]) => time);
    }

    getDifficultyPreference(childId, completions) {
        const difficultyCounts = { easy: 0, medium: 0, hard: 0 };
        
        completions.forEach(completion => {
            const chore = this.chores.find(c => c.id === completion.chore_id);
            if (chore) {
                // Estimate difficulty based on time estimate
                const timeEstimate = this.getTimeEstimate(chore.name);
                if (timeEstimate <= 15) difficultyCounts.easy++;
                else if (timeEstimate <= 30) difficultyCounts.medium++;
                else difficultyCounts.hard++;
            }
        });
        
        return Object.entries(difficultyCounts)
            .sort(([,a], [,b]) => b - a)[0][0];
    }

    getCompletionRate(childId, completions) {
        const childChores = this.chores.filter(c => c.child_id === childId);
        const totalPossible = childChores.length * 7; // 7 days per week
        return completions.length / totalPossible;
    }

    getRecentTrends(childId, completions) {
        const lastWeek = completions.filter(c => {
            const completionDate = new Date(c.completed_at);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return completionDate >= weekAgo;
        });
        
        return {
            recentCompletions: lastWeek.length,
            isImproving: lastWeek.length > completions.length / 4
        };
    }

    getTimeEstimate(choreName) {
        const template = Object.values(this.aiSuggestions.choreTemplates)
            .flat()
            .find(t => t.name === choreName);
        return template ? template.timeEstimate : 15;
    }

    generateSmartSuggestions(childId) {
        const patterns = this.analyzeChildPatterns(childId);
        const suggestions = [];
        
        // Category-based suggestions
        patterns.favoriteCategories.forEach(category => {
            const categoryTemplates = this.aiSuggestions.choreTemplates[category] || [];
            const newChores = categoryTemplates.filter(template => 
                !this.chores.some(chore => 
                    chore.child_id === childId && chore.name === template.name
                )
            );
            suggestions.push(...newChores.slice(0, 2));
        });
        
        // Time-based suggestions
        patterns.preferredTimes.forEach(time => {
            const timeTemplates = this.aiSuggestions.timePreferences[time] || [];
            timeTemplates.forEach(choreName => {
                const template = Object.values(this.aiSuggestions.choreTemplates)
                    .flat()
                    .find(t => t.name === choreName);
                if (template && !this.chores.some(chore => 
                    chore.child_id === childId && chore.name === template.name
                )) {
                    suggestions.push(template);
                }
            });
        });
        
        // Difficulty progression
        if (patterns.completionRate > 0.7) {
            const nextDifficulty = this.getNextDifficulty(patterns.difficultyPreference);
            const progressionTemplates = this.aiSuggestions.difficultyProgression[nextDifficulty] || [];
            progressionTemplates.forEach(choreName => {
                const template = Object.values(this.aiSuggestions.choreTemplates)
                    .flat()
                    .find(t => t.name === choreName);
                if (template && !this.chores.some(chore => 
                    chore.child_id === childId && chore.name === template.name
                )) {
                    suggestions.push(template);
                }
            });
        }
        
        // Remove duplicates and limit to 6 suggestions
        const uniqueSuggestions = suggestions.filter((suggestion, index, self) => 
            index === self.findIndex(s => s.name === suggestion.name)
        );
        
        return uniqueSuggestions.slice(0, 6);
    }

    getNextDifficulty(currentDifficulty) {
        const progression = { easy: 'medium', medium: 'hard', hard: 'hard' };
        return progression[currentDifficulty] || 'medium';
    }

    createAISuggestionsModal() {
        // Create the modal HTML dynamically
        const modalHTML = `
            <div id="ai-suggestions-modal" class="modal hidden" role="dialog" aria-labelledby="ai-suggestions-modal-title" aria-hidden="true">
                <div class="modal-content">
                    <header class="modal-header">
                        <h2 id="ai-suggestions-modal-title">🤖 Smart Activity Suggestions</h2>
                        <button class="modal-close" data-modal="ai-suggestions-modal" aria-label="Close modal">&times;</button>
                    </header>
                    <div id="ai-suggestions-content" class="modal-form">
                        <!-- AI suggestions content will be populated here -->
                    </div>
                </div>
            </div>
        `;
        
        // Add to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Set up close button handler
        const closeBtn = document.querySelector('#ai-suggestions-modal .modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideModal('ai-suggestions-modal');
            });
        }
    }

    showAISuggestionsModal(childId) {
        // Check if modal exists in DOM, create if not
        const modal = document.getElementById('ai-suggestions-modal');
        if (!modal) {
            this.createAISuggestionsModal();
        }
        
        // Get modal reference (either existing or newly created)
        const modalElement = document.getElementById('ai-suggestions-modal');
        if (!modalElement) {
            return;
        }
        
        // Show the modal
        this.showModal('ai-suggestions-modal');
        
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
            const childName = this.getChildName(childId);
            const suggestions = this.generateSmartSuggestions(childId);
            const patterns = this.analyzeChildPatterns(childId);
            
            // Find the modal content element
            let modalContent = document.getElementById('ai-suggestions-content');
            if (!modalContent) {
                const modal = document.getElementById('ai-suggestions-modal');
                if (modal) {
                    modalContent = modal.querySelector('#ai-suggestions-content');
                }
            }
            
            if (!modalContent) {
                return;
            }
            
            this.populateAISuggestionsModal(modalContent, childName, suggestions, patterns, childId);
        }, 100);
    }
    
    populateAISuggestionsModal(modalContent, childName, suggestions, patterns, childId) {
        
        modalContent.innerHTML = `
            <div class="ai-suggestions-modal">
                <div class="ai-header">
                    <div class="ai-icon">🤖</div>
                    <div class="ai-title">
                        <h2>Smart Suggestions for ${childName}</h2>
                        <p>Based on ${childName}'s activity patterns and preferences</p>
                    </div>
                </div>
                
                <div class="ai-insights">
                    <div class="insight-card">
                        <div class="insight-icon">📊</div>
                        <div class="insight-text">
                            <h4>Favorite Categories</h4>
                            <p>${patterns.favoriteCategories.map(cat => this.getCategoryInfo(cat).label).join(', ') || 'Still discovering preferences'}</p>
                        </div>
                    </div>
                    <div class="insight-card">
                        <div class="insight-icon">⏰</div>
                        <div class="insight-text">
                            <h4>Best Times</h4>
                            <p>${patterns.preferredTimes.map(time => time.charAt(0).toUpperCase() + time.slice(1)).join(', ') || 'Any time'}</p>
                        </div>
                    </div>
                    <div class="insight-card">
                        <div class="insight-icon">🎯</div>
                        <div class="insight-text">
                            <h4>Difficulty Level</h4>
                            <p>${patterns.difficultyPreference.charAt(0).toUpperCase() + patterns.difficultyPreference.slice(1)} tasks work best</p>
                        </div>
                    </div>
                </div>
                
                <div class="suggestions-grid">
                    ${suggestions.map(suggestion => `
                        <div class="suggestion-card" data-category="${this.getCategoryForSuggestion(suggestion)}">
                            <div class="suggestion-icon">${suggestion.icon}</div>
                            <div class="suggestion-details">
                                <h4>${suggestion.name}</h4>
                                <div class="suggestion-meta">
                                    <span class="difficulty-badge difficulty-${suggestion.difficulty}">${suggestion.difficulty}</span>
                                    <span class="time-estimate">${suggestion.timeEstimate} min</span>
                                </div>
                            </div>
                            <button class="btn btn-primary btn-sm" onclick="app.addAISuggestion('${suggestion.name}', '${suggestion.icon}', '${this.getCategoryForSuggestion(suggestion)}', '${childId}')">
                                Add Activity
                            </button>
                        </div>
                    `).join('')}
                </div>
                
                ${suggestions.length === 0 ? `
                    <div class="no-suggestions">
                        <div class="no-suggestions-icon">🎉</div>
                        <h3>Great job!</h3>
                        <p>${childName} already has a great variety of activities. Keep up the excellent work!</p>
                    </div>
                ` : ''}
            </div>
        `;
    }

    getCategoryForSuggestion(suggestion) {
        // Find which category this suggestion belongs to
        for (const [category, templates] of Object.entries(this.aiSuggestions.choreTemplates)) {
            if (templates.some(t => t.name === suggestion.name)) {
                return category;
            }
        }
        return 'custom';
    }

    async addAISuggestion(name, icon, category, childId) {
        try {
            const result = await this.apiClient.createChore(name, 7, childId, icon, category);
            if (result.success) {
                this.showToast(`Added "${name}" to ${this.getChildName(childId)}'s activities!`, 'success');
                await this.loadData();
                this.renderChildren();
            } else {
                this.showToast('Failed to add activity', 'error');
            }
        } catch (error) {
            console.error('Error adding AI suggestion:', error);
            this.showToast('Failed to add activity', 'error');
        }
    }

    // Check if user has premium features
    async isPremiumUser() {
        // Admin user (bsiegel13@gmail.com) always has premium access
        if (this.profile?.email === 'bsiegel13@gmail.com') {
            return true;
        }
        
        // Check the user's actual subscription status from database
        try {
            const limits = await this.apiClient.checkSubscriptionLimits();
            return limits.isPremium;
        } catch (error) {
            console.error('Error checking premium status:', error);
        return false;
        }
    }

    addDashboardHandlers() {
        const refreshBtn = document.getElementById('refresh-dashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                this.setButtonLoading(refreshBtn, true);
                await this.updateFamilyDashboard();
                this.setButtonLoading(refreshBtn, false);
                // "Dashboard refreshed!" toast removed - redundant
            });
        }

        // Demo loading button is now handled by demo-data.js
        
        // Add notification handlers
        this.addNotificationHandlers();
    }

    addNotificationHandlers() {
        const requestBtn = document.getElementById('request-notifications-btn');
        if (requestBtn) {
            requestBtn.addEventListener('click', () => {
                this.requestNotificationPermission();
            });
        }
        
        // Add preference change handlers
        const preferenceCheckboxes = [
            'chore-completion-notifications',
            'streak-notifications', 
            'achievement-notifications',
            'family-goal-notifications'
        ];
        
        preferenceCheckboxes.forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                checkbox.addEventListener('change', (e) => {
                    this.saveNotificationPreference(id, e.target.checked);
                });
            }
        });
        
        // Initialize notification status
        this.updateNotificationStatus();
    }

    async requestNotificationPermission() {
        try {
            // Find and set loading state on notification button
            const requestBtn = document.getElementById('request-notifications-btn');
            this.setButtonLoading(requestBtn, true);

            const permission = await Notification.requestPermission();
            this.updateNotificationStatus();
            
            if (permission === 'granted') {
                this.showToast('Notifications enabled! You\'ll now receive alerts.', 'success');
            } else {
                this.showToast('Notifications are disabled. Enable them in your browser settings.', 'warning');
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            this.showToast('Could not enable notifications. Please check your browser settings.', 'error');
        } finally {
            // Reset loading state
            const requestBtn = document.getElementById('request-notifications-btn');
            this.setButtonLoading(requestBtn, false);
        }
    }

    updateNotificationStatus() {
        const statusText = document.getElementById('notification-status-text');
        const requestBtn = document.getElementById('request-notifications-btn');
        
        if (!statusText || !requestBtn) return;
        
        if (Notification.permission === 'granted') {
            statusText.textContent = 'Notifications are enabled! You\'ll receive alerts for chore completions, streaks, and achievements.';
            requestBtn.textContent = 'Notifications Enabled';
            requestBtn.disabled = true;
            requestBtn.classList.add('btn-success');
        } else if (Notification.permission === 'denied') {
            statusText.textContent = 'Notifications are blocked. Please enable them in your browser settings to receive alerts.';
            requestBtn.textContent = 'Enable in Browser Settings';
            requestBtn.disabled = true;
            requestBtn.classList.add('btn-error');
        } else {
            statusText.textContent = 'Enable notifications to get alerts for chore completions, streaks, and achievements.';
            requestBtn.textContent = 'Enable Notifications';
            requestBtn.disabled = false;
            requestBtn.classList.remove('btn-success', 'btn-error');
        }
    }

    saveNotificationPreference(preferenceId, enabled) {
        // Save to localStorage
        localStorage.setItem(`notification_${preferenceId}`, enabled);
        
        // Show feedback
        const action = enabled ? 'enabled' : 'disabled';
        this.showToast(`${preferenceId.replace('-', ' ')} ${action}!`, 'success');
    }

    loadNotificationPreferences() {
        const preferences = [
            'chore-completion-notifications',
            'streak-notifications',
            'achievement-notifications', 
            'family-goal-notifications',
            'seasonal-theme-notifications'
        ];
        
        preferences.forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                const saved = localStorage.getItem(`notification_${id}`);
                checkbox.checked = saved !== 'false'; // Default to true if not set
            }
        });
    }

    checkNotificationPermissions() {
        const statusText = document.getElementById('notification-status-text');
        const requestBtn = document.getElementById('request-notifications-btn');
        
        if (!statusText || !requestBtn) return;
        
        if (Notification.permission === 'granted') {
            statusText.textContent = 'Notifications are enabled! You\'ll receive alerts for important events.';
            requestBtn.textContent = 'Notifications Enabled';
            requestBtn.disabled = true;
            requestBtn.classList.add('btn-success');
        } else if (Notification.permission === 'denied') {
            statusText.textContent = 'Notifications are blocked. Please enable them in your browser settings to receive alerts.';
            requestBtn.textContent = 'Enable in Browser Settings';
            requestBtn.disabled = true;
            requestBtn.classList.add('btn-error');
        } else {
            statusText.textContent = 'Click the button below to enable notifications for chore alerts and achievements.';
            requestBtn.textContent = 'Enable Notifications';
            requestBtn.disabled = false;
            requestBtn.classList.remove('btn-success', 'btn-error');
        }
    }

    async sendSmartNotification(type, data) {
        // Check if user has premium and notifications are enabled
        if (!this.isPremiumUser() || !this.getNotificationPreference(type)) {
            return;
        }
        
        // Check browser permission
        if (Notification.permission !== 'granted') {
            return;
        }
        
        let notification;
        
        switch (type) {
            case 'chore_completion':
                notification = new Notification('Chore Completed! 🎉', {
                    body: `${data.childName} completed "${data.choreName}"!`,
                    icon: '/favicon.ico',
                    tag: 'chore-completion'
                });
                break;
                
            case 'streak_alert':
                notification = new Notification('Streak Alert! 🔥', {
                    body: `${data.childName} is on a ${data.streakCount}-day streak! Keep it up!`,
                    icon: '/favicon.ico',
                    tag: 'streak-alert'
                });
                break;
                
            case 'achievement':
                notification = new Notification('Achievement Unlocked! 🏆', {
                    body: `${data.childName} earned the "${data.badgeName}" badge!`,
                    icon: '/favicon.ico',
                    tag: 'achievement'
                });
                break;
                
            case 'family_goal':
                notification = new Notification('Family Goal Update! 🎯', {
                    body: `Your family is ${data.progress}% toward the ${data.goalType} goal!`,
                    icon: '/favicon.ico',
                    tag: 'family-goal'
                });
                break;
        }
        
        // Store notification in recent list
        this.addToRecentNotifications(type, data);
        
        // Auto-close after 5 seconds
        setTimeout(() => {
            if (notification) {
                notification.close();
            }
        }, 5000);
    }

    getNotificationPreference(type) {
        const preferenceMap = {
            'chore_completion': 'chore-completion-notifications',
            'streak_alert': 'streak-notifications',
            'achievement': 'achievement-notifications',
            'family_goal': 'family-goal-notifications',
            'seasonal_theme': 'seasonal-theme-notifications'
        };
        
        const preferenceId = preferenceMap[type];
        if (!preferenceId) return false;
        
        const saved = localStorage.getItem(`notification_${preferenceId}`);
        return saved !== 'false'; // Default to true
    }

    addToRecentNotifications(type, data) {
        const notificationsList = document.getElementById('notifications-list');
        if (!notificationsList) return;
        
        const notificationItem = document.createElement('div');
        notificationItem.className = 'notification-item';
        
        const icon = this.getNotificationIcon(type);
        const title = this.getNotificationTitle(type);
        const message = this.getNotificationMessage(type, data);
        const time = this.formatTime(new Date());
        
        notificationItem.innerHTML = `
            <div class="notification-icon">${icon}</div>
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
                <div class="notification-time">${time}</div>
            </div>
        `;
        
        // Add to top of list
        notificationsList.insertBefore(notificationItem, notificationsList.firstChild);
        
        // Remove old notifications if more than 10
        const notifications = notificationsList.querySelectorAll('.notification-item');
        if (notifications.length > 10) {
            notifications[notifications.length - 1].remove();
        }
        
        // Remove "no notifications" message if present
        const noNotifications = notificationsList.querySelector('.no-notifications');
        if (noNotifications) {
            noNotifications.remove();
        }
    }

    getNotificationIcon(type) {
        const icons = {
            'chore_completion': '✅',
            'streak_alert': '🔥',
            'achievement': '🏆',
            'family_goal': '🎯'
        };
        return icons[type] || '🔔';
    }

    getNotificationTitle(type) {
        const titles = {
            'chore_completion': 'Chore Completed!',
            'streak_alert': 'Streak Alert!',
            'achievement': 'Achievement Unlocked!',
            'family_goal': 'Family Goal Update!'
        };
        return titles[type] || 'Notification';
    }

    getNotificationMessage(type, data) {
        switch (type) {
            case 'chore_completion':
                return `${data.childName} completed "${data.choreName}"!`;
            case 'streak_alert':
                return `${data.childName} is on a ${data.streakCount}-day streak!`;
            case 'achievement':
                return `${data.childName} earned the "${data.badgeName}" badge!`;
            case 'family_goal':
                return `Your family is ${data.progress}% toward the ${data.goalType} goal!`;
            default:
                return 'New notification received';
        }
    }

    addQuickActionHandlers(card, childChores, childId) {
        // Mark All Today button
        const markAllTodayBtn = card.querySelector('.mark-all-today-btn');
        if (markAllTodayBtn) {
            markAllTodayBtn.addEventListener('click', async () => {
                await this.markAllChoresForDay(childId, this.getCurrentDayOfWeek());
            });
        }

        // Mark All Week button
        const markAllWeekBtn = card.querySelector('.mark-all-week-btn');
        if (markAllWeekBtn) {
            markAllWeekBtn.addEventListener('click', async () => {
                await this.markAllChoresForWeek(childId);
            });
        }

        // Clear All Today button
        const clearAllTodayBtn = card.querySelector('.clear-all-today-btn');
        if (clearAllTodayBtn) {
            clearAllTodayBtn.addEventListener('click', async () => {
                await this.clearAllChoresForDay(childId, this.getCurrentDayOfWeek());
            });
        }

        // View History button
        const viewHistoryBtn = card.querySelector('.view-history-btn');
        if (viewHistoryBtn) {
            viewHistoryBtn.addEventListener('click', async () => {
                await this.showChoreHistory(childId);
            });
        }

        // Challenges button
        const challengesBtn = card.querySelector('.challenges-btn');
        if (challengesBtn) {
            challengesBtn.addEventListener('click', async () => {
                await this.showChoreChallenges(childId);
            });
        }

        // Bulk Edit button
        const bulkEditBtn = card.querySelector('.bulk-edit-btn');
        if (bulkEditBtn) {
            bulkEditBtn.addEventListener('click', async () => {
                this.openBulkEditModal(childId);
            });
        }
    }

    async showChoreHistory(childId) {
        const child = this.children.find(c => c.id === childId);
        if (!child) return;

        const childChores = this.chores.filter(chore => chore.child_id === childId);
        const childCompletions = this.completions.filter(comp => 
            childChores.some(chore => chore.id === comp.chore_id)
        );

        // Get the last 4 weeks of data
        const weeks = [];
        const today = new Date();
        for (let i = 0; i < 4; i++) {
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - (today.getDay() + (i * 7)));
            weeks.push(weekStart);
        }

        let historyHtml = `
            <div class="chore-history-modal">
                <div class="modal-header">
                    <h3>📊 ${child.name}'s Chore History</h3>
                    <button type="button" class="close-btn" onclick="app.hideModal('chore-history-modal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="history-stats">
                        <div class="stat-card">
                            <div class="stat-number">${childCompletions.length}</div>
                            <div class="stat-label">Total Completions</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${childChores.length}</div>
                            <div class="stat-label">Active Chores</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">${Math.round((childCompletions.length / (childChores.length * 7)) * 100)}%</div>
                            <div class="stat-label">This Week</div>
                        </div>
                    </div>
                    <div class="history-timeline">
                        <h4>Recent Activity</h4>
        `;

        // Group completions by week
        const completionsByWeek = {};
        childCompletions.forEach(comp => {
            const weekKey = comp.week_start;
            if (!completionsByWeek[weekKey]) {
                completionsByWeek[weekKey] = [];
            }
            completionsByWeek[weekKey].push(comp);
        });

        // Show recent weeks
        Object.keys(completionsByWeek).sort().reverse().slice(0, 4).forEach(weekStart => {
            const weekCompletions = completionsByWeek[weekStart];
            const weekDate = new Date(weekStart);
            const weekLabel = this.formatWeekLabel(weekDate);

            historyHtml += `
                <div class="week-history">
                    <div class="week-header">
                        <span class="week-label">${weekLabel}</span>
                        <span class="week-count">${weekCompletions.length} completions</span>
                    </div>
                    <div class="week-completions">
            `;

            // Group by chore
            const completionsByChore = {};
            weekCompletions.forEach(comp => {
                const chore = childChores.find(c => c.id === comp.chore_id);
                if (chore) {
                    if (!completionsByChore[chore.name]) {
                        completionsByChore[chore.name] = [];
                    }
                    completionsByChore[chore.name].push(comp);
                }
            });

            Object.keys(completionsByChore).forEach(choreName => {
                const choreCompletions = completionsByChore[choreName];
                const days = choreCompletions.map(comp => {
                    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    return dayNames[comp.day_of_week];
                }).join(', ');

                historyHtml += `
                    <div class="chore-history-item">
                        <span class="chore-name">${choreName}</span>
                        <span class="completion-days">${days}</span>
                    </div>
                `;
            });

            historyHtml += `
                    </div>
                </div>
            `;
        });

        historyHtml += `
                    </div>
                </div>
            </div>
        `;

        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.id = 'chore-history-modal';
        modalContent.className = 'modal';
        modalContent.innerHTML = historyHtml;

        // Add to page and show
        document.body.appendChild(modalContent);
        this.showModal('chore-history-modal');
    }

    async showChoreChallenges(childId) {
        const child = this.children.find(c => c.id === childId);
        if (!child) return;

        const childChores = this.chores.filter(chore => chore.child_id === childId);
        const childCompletions = this.completions.filter(comp => 
            childChores.some(chore => chore.id === comp.chore_id)
        );

        // Calculate current streak
        const currentStreak = this.calculateCurrentStreak(childId);
        
        // Define challenges
        const challenges = [
            {
                id: 'perfect_day',
                title: 'Perfect Day',
                description: 'Complete all chores for today',
                icon: '🌟',
                progress: this.calculatePerfectDayProgress(childId),
                maxProgress: childChores.length,
                reward: '5¢ bonus'
            },
            {
                id: 'streak_3',
                title: '3-Day Streak',
                description: 'Complete at least one chore for 3 days in a row',
                icon: '🔥',
                progress: Math.min(currentStreak, 3),
                maxProgress: 3,
                reward: '10¢ bonus'
            },
            {
                id: 'streak_7',
                title: 'Week Warrior',
                description: 'Complete at least one chore for 7 days in a row',
                icon: '⚡',
                progress: Math.min(currentStreak, 7),
                maxProgress: 7,
                reward: '25¢ bonus'
            },
            {
                id: 'complete_5',
                title: '5 Chore Master',
                description: 'Complete 5 different chores in one day',
                icon: '🎯',
                progress: this.calculateMaxChoresInDay(childId),
                maxProgress: 5,
                reward: '15¢ bonus'
            },
            {
                id: 'perfect_week',
                title: 'Perfect Week',
                description: 'Complete all chores for the entire week',
                icon: '🏆',
                progress: this.calculatePerfectWeekProgress(childId),
                maxProgress: childChores.length * 7,
                reward: '50¢ bonus'
            }
        ];

        let challengesHtml = `
            <div class="chore-challenges-modal">
                <div class="modal-header">
                    <h3>🎯 ${child.name}'s Challenges</h3>
                    <button type="button" class="close-btn" onclick="app.hideModal('chore-challenges-modal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="challenges-intro">
                        <p>Complete challenges to earn bonus rewards! 🎁</p>
                    </div>
                    <div class="challenges-grid">
        `;

        challenges.forEach(challenge => {
            const progressPercentage = (challenge.progress / challenge.maxProgress) * 100;
            const isCompleted = challenge.progress >= challenge.maxProgress;
            
            challengesHtml += `
                <div class="challenge-card ${isCompleted ? 'completed' : ''}">
                    <div class="challenge-header">
                        <div class="challenge-icon">${challenge.icon}</div>
                        <div class="challenge-info">
                            <h4 class="challenge-title">${challenge.title}</h4>
                            <p class="challenge-description">${challenge.description}</p>
                        </div>
                        ${isCompleted ? '<div class="challenge-badge">✅</div>' : ''}
                    </div>
                    <div class="challenge-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progressPercentage}%"></div>
                        </div>
                        <div class="progress-text">
                            ${challenge.progress}/${challenge.maxProgress}
                        </div>
                    </div>
                    <div class="challenge-reward">
                        <span class="reward-icon">💰</span>
                        <span class="reward-text">${challenge.reward}</span>
                    </div>
                </div>
            `;
        });

        challengesHtml += `
                    </div>
                </div>
            </div>
        `;

        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.id = 'chore-challenges-modal';
        modalContent.className = 'modal';
        modalContent.innerHTML = challengesHtml;

        // Add to page and show
        document.body.appendChild(modalContent);
        this.showModal('chore-challenges-modal');
    }

    calculateCurrentStreak(childId) {
        // This is a simplified calculation - in a real app, you'd track streaks more carefully
        const childCompletions = this.completions.filter(comp => {
            const chore = this.chores.find(c => c.id === comp.chore_id);
            return chore && chore.child_id === childId;
        });
        
        // For now, return a random streak for demo purposes
        return Math.floor(Math.random() * 5) + 1;
    }

    calculatePerfectDayProgress(childId) {
        const today = this.getCurrentDayOfWeek();
        const childChores = this.chores.filter(chore => chore.child_id === childId);
        const todayCompletions = this.completions.filter(comp => {
            const chore = this.chores.find(c => c.id === comp.chore_id);
            return chore && chore.child_id === childId && comp.day_of_week === today;
        });
        
        return todayCompletions.length;
    }

    calculateMaxChoresInDay(childId) {
        const childCompletions = this.completions.filter(comp => {
            const chore = this.chores.find(c => c.id === comp.chore_id);
            return chore && chore.child_id === childId;
        });
        
        // Group by day and find the day with most completions
        const completionsByDay = {};
        childCompletions.forEach(comp => {
            const dayKey = comp.day_of_week;
            if (!completionsByDay[dayKey]) {
                completionsByDay[dayKey] = new Set();
            }
            completionsByDay[dayKey].add(comp.chore_id);
        });
        
        const maxCompletions = Math.max(...Object.values(completionsByDay).map(set => set.size), 0);
        return Math.min(maxCompletions, 5);
    }

    calculatePerfectWeekProgress(childId) {
        const childChores = this.chores.filter(chore => chore.child_id === childId);
        const childCompletions = this.completions.filter(comp => 
            childChores.some(chore => chore.id === comp.chore_id)
        );
        
        return childCompletions.length;
    }

    getCurrentDayOfWeek() {
        const today = new Date();
        return today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    }

    async markAllChoresForDay(childId, dayOfWeek) {
        const childChores = this.chores.filter(chore => chore.child_id === childId);
        const childCompletions = this.completions.filter(comp => childChores.some(chore => chore.id === comp.chore_id));
        // Find chores that aren't completed for today
        const uncompletedChores = childChores.filter(chore => {
            return !childCompletions.some(comp => comp.chore_id === chore.id && comp.day_of_week === dayOfWeek);
        });
        if (uncompletedChores.length === 0) {
            // Removed "already completed" toast to reduce noise
            return;
        }
        // INSTANT optimistic update
        uncompletedChores.forEach(chore => {
            this.completions.push({ chore_id: chore.id, day_of_week: dayOfWeek, week_start: this.currentWeekStart });
        });
        // Force immediate progress update with DOM repaint
        this.updateProgressWithDOMForce(childId);
        // Backend update
        let completedCount = 0;
        for (const chore of uncompletedChores) {
            const result = await this.apiClient.toggleChoreCompletion(chore.id, dayOfWeek);
            if (result.success && result.completed) {
                completedCount++;
            }
        }
        // Sync with real data and force final update
        await this.loadCompletions();
        this.updateProgressWithDOMForce(childId);
        if (completedCount > 0) {
            // Removed bulk action toast to reduce noise
            this.playSound('success');
        }
    }

    async markAllChoresForWeek(childId) {
        const childChores = this.chores.filter(chore => chore.child_id === childId);
        const childCompletions = this.completions.filter(comp => childChores.some(chore => chore.id === comp.chore_id));
        const totalPossible = childChores.length * 7;
        const currentCompleted = childCompletions.length;
        const remaining = totalPossible - currentCompleted;
        if (remaining === 0) {
            // Removed "already completed" toast to reduce noise
            return;
        }
        const confirmed = await this.showConfirmation(
            `This will mark ${remaining} activity completions for the entire week. Continue?`,
            'Fill Entire Week',
            'info',
            'Yes, Fill Week',
            'Cancel'
        );
        if (!confirmed) return;
        // INSTANT optimistic update
        let addedCompletions = 0;
        for (const chore of childChores) {
            for (let day = 0; day < 7; day++) {
                const isAlreadyCompleted = childCompletions.some(comp => comp.chore_id === chore.id && comp.day_of_week === day);
                if (!isAlreadyCompleted) {
                    this.completions.push({ chore_id: chore.id, day_of_week: day, week_start: this.currentWeekStart });
                    addedCompletions++;
                }
            }
        }
        // Update progress bar instantly
        this.updateChildProgressOptimistically(childId, addedCompletions);
        // Backend update
        let completedCount = 0;
        for (const chore of childChores) {
            for (let day = 0; day < 7; day++) {
                const isAlreadyCompleted = childCompletions.some(comp => comp.chore_id === chore.id && comp.day_of_week === day);
                if (!isAlreadyCompleted) {
                    const result = await this.apiClient.toggleChoreCompletion(chore.id, day);
                    if (result.success && result.completed) {
                        completedCount++;
                    }
                }
            }
        }
        // Force refresh to sync all cells (bulk action needs full update)
        await this.loadCompletions();
        await this.refreshChoreSection(childId, true); // forceUpdate = true
        
        if (completedCount > 0) {
            // Removed bulk action toast to reduce noise
            this.playSound('success');
        }
    }

    async clearAllChoresForDay(childId, dayOfWeek) {
        const childChores = this.chores.filter(chore => chore.child_id === childId);
        const childCompletions = this.completions.filter(comp => childChores.some(chore => chore.id === comp.chore_id));
        // Find chores that are completed for today
        const completedChores = childChores.filter(chore => {
            return childCompletions.some(comp => comp.chore_id === chore.id && comp.day_of_week === dayOfWeek);
        });
        if (completedChores.length === 0) {
            // Removed "no chores completed" toast to reduce noise
            return;
        }
        const confirmed = await this.showConfirmation(
            `This will unmark ${completedChores.length} activities for today. Continue?`,
            'Clear Today',
            'warning',
            'Yes, Clear',
            'Cancel'
        );
        if (!confirmed) return;
        // INSTANT optimistic update
        const removedCompletions = completedChores.length;
        this.completions = this.completions.filter(comp => {
            return !completedChores.some(chore => comp.chore_id === chore.id && comp.day_of_week === dayOfWeek);
        });
        // Update progress bar instantly
        this.updateChildProgressOptimistically(childId, -removedCompletions);
        // Backend update
        let clearedCount = 0;
        for (const chore of completedChores) {
            const result = await this.apiClient.toggleChoreCompletion(chore.id, dayOfWeek);
            if (result.success && !result.completed) {
                clearedCount++;
            }
        }
        // Force refresh to sync all cells (bulk action needs full update)
        await this.loadCompletions();
        await this.refreshChoreSection(childId, true); // forceUpdate = true
        
        if (clearedCount > 0) {
            // Removed bulk action toast to reduce noise
            this.playSound('notification');
        }
    }

    // Improved chore cell click handler with better error handling:
    // 1. Fix the main cell click handler to force DOM updates
    async handleChoreCellClick(cell, chore, childId, day) {
        // CRITICAL FIX: Use the chore's actual child_id, not the passed childId
        const actualChildId = chore.child_id;
        
        // Prevent rapid-fire clicks
        if (cell.dataset.processing === 'true') {
            return;
        }
        cell.dataset.processing = 'true';
        
        try {
            console.log('Chore cell clicked:', { choreId: chore.id, day, actualChildId });
            const isCurrentlyCompleted = cell.classList.contains('completed');
            
            // Optimistic UI update - ONLY the cell
            if (isCurrentlyCompleted) {
                cell.classList.remove('completed');
                cell.textContent = '';
                // Remove from completions array optimistically
                this.completions = this.completions.filter(comp => 
                    !(comp.chore_id === chore.id && comp.day_of_week === parseInt(day))
                );
            } else {
                cell.classList.add('completed');
                cell.textContent = '✓';
                // Add to completions array optimistically
                this.completions.push({
                    chore_id: chore.id,
                    day_of_week: parseInt(day),
                    week_start: this.currentWeekStart
                });
            }
            
            // IMMEDIATELY update progress with forced DOM repaint
            this.updateProgressWithDOMForce(actualChildId);
            
            // Add subtle feedback
            this.addCellBounce(cell);
            
            try {
                // API call
                const result = await this.apiClient.toggleChoreCompletion(chore.id, parseInt(day));
                
                if (result.success) {
                    // Play sound
                    this.playSound(result.completed ? 'success' : 'notification');
                    
                    // Update streak
                    if (result.completed) {
                        const streak = this.updateStreak(actualChildId, chore.id);
                        if (streak >= 5) {
                            this.showToast(`${this.getChildName(actualChildId)} is on a ${streak}-day streak! 🔥`, 'success');
                        }
                        
                        // Check for new achievements
                        this.checkAchievements(actualChildId);
                        
                        // Check for streak milestones
                        const newStreak = this.getCurrentStreak(actualChildId);
                        this.checkStreakMilestone(actualChildId, newStreak);
                    }
                    
                    // CRITICAL: Sync data but DO NOT re-render anything
                    await this.loadCompletions();
                    
                    // Final update with real data and forced repaint
                    this.updateProgressWithDOMForce(actualChildId);
                    
                    // Achievements (but don't re-render)
                    this.checkAchievements(actualChildId, chore.id);
                    
                } else {
                    // Revert optimistic update
                    this.revertOptimisticUpdate(cell, chore.id, parseInt(day), isCurrentlyCompleted);
                    this.updateProgressWithDOMForce(actualChildId);
                    this.playSound('error');
                    this.showToast('Failed to update chore. Please try again.', 'error');
                }
            } catch (apiError) {
                console.error('API error:', apiError);
                this.revertOptimisticUpdate(cell, chore.id, parseInt(day), isCurrentlyCompleted);
                this.updateProgressWithDOMForce(actualChildId);
                this.playSound('error');
                this.showToast('Connection error. Please try again.', 'error');
            }
            
        } finally {
            // Remove loading state
            cell.style.opacity = '';
            cell.style.pointerEvents = '';
            cell.dataset.processing = 'false';
        }
    }

    // 2. NEW METHOD: Force DOM updates with requestAnimationFrame
    updateProgressWithDOMForce(childId) {
        // Use requestAnimationFrame to ensure DOM updates happen immediately
        requestAnimationFrame(() => {
            this.updateProgressElementsOnly(childId);
            
            // Force a second update after the next frame to ensure it takes
            requestAnimationFrame(() => {
                this.updateProgressElementsOnly(childId);
                
                // Force browser repaint by accessing offsetHeight
                const childCard = document.querySelector(`.child-content[data-child-id="${childId}"]`);
                if (childCard) {
                    const starsContainer = childCard.querySelector('.stars-container');
                    if (starsContainer) {
                        // Force repaint by accessing computed styles
                        starsContainer.offsetHeight;
                        // Force another update
                        setTimeout(() => {
                            this.updateProgressElementsOnly(childId);
                        }, 10);
                    } else {
                        console.error('❌ Stars container not found!');
                    }
                } else {
                    console.error('❌ Child content card not found for childId:', childId);
                }
            });
        });
    }

    // Helper method to revert optimistic updates:
    revertOptimisticUpdate(cell, choreId, dayOfWeek, wasCompleted) {
        if (wasCompleted) {
            // Restore completed state
            cell.classList.add('completed');
            cell.textContent = '✓';
            // Add back to completions array
            this.completions.push({
                chore_id: choreId,
                day_of_week: dayOfWeek,
                week_start: this.currentWeekStart
            });
        } else {
            // Restore empty state
            cell.classList.remove('completed');
            cell.textContent = '';
            // Remove from completions array
            this.completions = this.completions.filter(comp => 
                !(comp.chore_id === choreId && comp.day_of_week === dayOfWeek)
            );
        }
    }





    // Add a method to verify DOM vs data consistency (for debugging):
    verifyProgressConsistency(childId) {
        const childCard = document.querySelector(`.child-content[data-child-id="${childId}"]`);
        if (!childCard) return;
        
        const childChores = this.chores.filter(chore => chore.child_id === childId);
        const childCompletions = this.completions.filter(comp => 
            childChores.some(chore => chore.id === comp.chore_id && comp.week_start === this.currentWeekStart)
        );
        
        // Count from DOM
        const completedCells = childCard.querySelectorAll('.chore-cell.completed');
        const domCount = completedCells.length;
        
        // Count from data
        const dataCount = childCompletions.length;
        
        console.log(`Progress consistency check for child ${childId}:`);
        console.log(`- DOM shows: ${domCount} completed cells`);
        console.log(`- Data shows: ${dataCount} completions`);
        console.log(`- Total possible: ${childChores.length * 7}`);
        
        if (domCount !== dataCount) {
            console.warn(`Inconsistency detected! DOM=${domCount}, Data=${dataCount}`);
            
            // Log which specific cells are inconsistent
            childCard.querySelectorAll('.chore-cell').forEach(cell => {
                const choreId = cell.dataset.choreId;
                const day = parseInt(cell.dataset.day);
                const isDOMCompleted = cell.classList.contains('completed');
                const isDataCompleted = childCompletions.some(comp => 
                    comp.chore_id === choreId && comp.day_of_week === day
                );
                
                if (isDOMCompleted !== isDataCompleted) {
                    console.warn(`Cell mismatch - Chore: ${choreId}, Day: ${day}, DOM: ${isDOMCompleted}, Data: ${isDataCompleted}`);
                }
            });
        }
        
        return { domCount, dataCount, isConsistent: domCount === dataCount };
    }

    // Add CSS for smoother animations:
    addSmoothUIStyles() {
        if (!document.getElementById('smooth-ui-styles')) {
            const styleSheet = document.createElement('style');
            styleSheet.id = 'smooth-ui-styles';
            styleSheet.textContent = `
                .chore-cell {
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    cursor: pointer;
                    position: relative;
                    overflow: hidden;
                }

                .chore-cell:hover {
                    transform: scale(1.02);
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }

                .chore-cell:active {
                    transform: scale(0.98);
                }

                .chore-cell.completed {
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: white;
                    transform: scale(1);
                }

                .progress-fill {
                    transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    will-change: width;
                }

                .stars-container {
                    transition: opacity 0.3s ease-in-out;
                    will-change: opacity;
                }

                .earnings-amount {
                    transition: transform 0.2s ease-in-out;
                    will-change: transform;
                }

                /* Prevent layout shifts during updates */
                .child-card {
                    contain: layout style;
                }

                .progress-section {
                    contain: layout;
                }

                .chore-grid {
                    contain: layout;
                }
            `;
            document.head.appendChild(styleSheet);
        }
    }



        addChoreCellHandlers(card, childChores, cardChildId) {
            // Add quick action handlers
            this.addQuickActionHandlers(card, childChores, cardChildId);
            
            // Add FAQ and Contact modal handlers
            this.setupHelpModals();
        
        // Add drag and drop functionality for chore row reordering (not individual cells)
        this.addChoreRowDragAndDrop(card, childChores, cardChildId);
            
            card.querySelectorAll('.chore-grid-table .chore-cell').forEach(cell => {
                const day = cell.dataset.day;
                const choreId = cell.dataset.choreId;

                cell.addEventListener('click', async () => {
                    if (cell.dataset.processing === 'true') {
                        return;
                    }
                    
                    const chore = childChores.find(ch => ch.id === choreId);
                    if (chore) {
                        // Use the chore's actual child_id, not the card's child_id
                        await this.handleChoreCellClick(cell, chore, chore.child_id, day);
                    }
                });
            });
    }

    populateManageChildrenList() {
        const manageChildrenList = document.getElementById('manage-children-list');
        if (!manageChildrenList) return;

        if (this.children.length === 0) {
            manageChildrenList.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: var(--space-6); color: var(--gray-600);">
                    <div style="font-size: 3em; margin-bottom: var(--space-3);">👶</div>
                    <h4>No Children Added Yet</h4>
                    <p>Add your first child to get started with ChoreStar!</p>
                </div>
            `;
            return;
        }

        let html = '';
        this.children.forEach(child => {
            // Get child's chores count
            const childChores = this.chores.filter(chore => chore.child_id === child.id);
            const choresCount = childChores.length;
            
            // Avatar logic
            let avatarHtml = '';
            if (child.avatar_url) {
                avatarHtml = `<img src="${child.avatar_url}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">`;
            } else if (child.avatar_file) {
                avatarHtml = `<img src="${child.avatar_file}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">`;
            } else {
                avatarHtml = `<div style="width:40px;height:40px;border-radius:50%;background:${child.avatar_color || '#6366f1'};display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:1.2em;">${child.name.charAt(0).toUpperCase()}</div>`;
            }

            html += `
                <div class="manage-child-item" data-child-id="${child.id}" style="display: flex; align-items: center; gap: var(--space-3); padding: var(--space-4); border: 1px solid var(--gray-200); border-radius: var(--radius); margin-bottom: var(--space-3); background: white;">
                    <div style="flex-shrink: 0;">
                        ${avatarHtml}
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <h5 style="margin: 0 0 var(--space-1) 0; font-size: 1.1em;">${child.name}</h5>
                        <p style="margin: 0; color: var(--gray-600); font-size: var(--font-size-sm);">
                            Age ${child.age} • ${choresCount} chore${choresCount !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <div style="display: flex; gap: var(--space-2); flex-shrink: 0;">
                        <button class="btn btn-sm btn-outline edit-child-manage" data-child-id="${child.id}" aria-label="Edit ${child.name}">
                            ✏️ Edit
                        </button>
                        <button class="btn btn-sm btn-danger remove-child-manage" data-child-id="${child.id}" aria-label="Remove ${child.name}">
                            🗑️ Remove
                        </button>
                    </div>
                </div>
            `;
        });

        manageChildrenList.innerHTML = html;
        
        // Add event handlers for the new buttons
        this.addManageChildrenHandlers();
    }

    addManageChildrenHandlers() {
        // Edit child buttons
        document.querySelectorAll('.edit-child-manage').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const childId = e.target.dataset.childId;
                const child = this.children.find(c => c.id === childId);
                if (child) {
                    this.openEditChildModal(child);
                }
            });
        });

        // Remove child buttons
        document.querySelectorAll('.remove-child-manage').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const childId = e.target.dataset.childId;
                const child = this.children.find(c => c.id === childId);
                if (child) {
                    const result = await this.deleteChild(childId);
                    if (result.success) {
                        // Refresh the manage children list
                        this.populateManageChildrenList();
                        // Also refresh the child tabs
                        this.generateChildTabs();
                        // Refresh the main view
                        this.renderChildren();
                    }
                }
            });
        });
    }

    addBulkEditHandlers() {
        // Bulk edit buttons
        document.querySelectorAll('.bulk-edit-chores').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const childId = btn.dataset.childId;
                this.openBulkEditModal(childId);
            });
        });
    }

    openBulkEditModal(childId) {
        const child = this.children.find(c => c.id === childId);
        const childChores = this.chores.filter(chore => chore.child_id === childId);
        
        if (childChores.length === 0) {
            this.showToast('No chores to edit for this child', 'info');
            return;
        }
        
        // Populate the bulk edit chores list
        const choresList = document.getElementById('bulk-edit-chores-list');
        let html = '';
        
        childChores.forEach(chore => {
            html += `
                <div class="bulk-edit-chore-item" data-chore-id="${chore.id}" style="display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3); border: 1px solid var(--gray-200); border-radius: var(--radius); margin-bottom: var(--space-2); background: white; cursor: pointer;">
                    <input type="checkbox" id="bulk-chore-${chore.id}" value="${chore.id}" checked onclick="event.stopPropagation();">
                    <div class="chore-item-content" style="flex: 1; display: flex; align-items: center; gap: var(--space-2);">
                        <span style="font-size: 1.2em;">${chore.icon || '📝'}</span>
                        <strong>${chore.name}</strong>
                        <span style="color: var(--gray-600); font-size: var(--font-size-sm); margin-left: var(--space-2);">
                            ${chore.reward_cents}¢ • ${chore.category || 'General'}
                        </span>
                    </div>
                    <button type="button" class="btn btn-sm btn-outline edit-single-chore" data-chore-id="${chore.id}" style="margin-left: auto;">
                        <span>✏️</span> Edit
                    </button>
                </div>
            `;
        });
        
        choresList.innerHTML = html;
        
        // Reset form fields
        document.getElementById('bulk-edit-form').reset();
        document.getElementById('bulk-edit-icon').value = '';
        
        // Reset icon picker
        const iconPicker = document.getElementById('bulk-edit-icon-picker');
        if (iconPicker) {
            iconPicker.querySelectorAll('.icon-option').forEach(btn => {
                btn.classList.remove('active');
            });
        }
        
        // Store child ID for the form submission
        document.getElementById('bulk-edit-form').dataset.childId = childId;
        
        // Add click handlers for individual chore editing
        this.addBulkEditChoreHandlers();
        
        // Show the modal
        this.showModal('bulk-edit-chores-modal');
    }

    addBulkEditChoreHandlers() {
        // Individual chore edit buttons
        document.querySelectorAll('.edit-single-chore').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const choreId = btn.dataset.choreId;
                this.openSingleChoreEditor(choreId);
            });
        });
        
        // Click on chore item to edit (but not on checkbox)
        document.querySelectorAll('.bulk-edit-chore-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('input[type="checkbox"]') && !e.target.closest('.edit-single-chore')) {
                    const choreId = item.dataset.choreId;
                    this.openSingleChoreEditor(choreId);
                }
            });
        });
    }

    openSingleChoreEditor(choreId) {
        const chore = this.chores.find(c => c.id === choreId);
        if (!chore) {
            this.showToast('Chore not found', 'error');
            return;
        }
        
        // Create a simple inline editor
        const choreItem = document.querySelector(`[data-chore-id="${choreId}"]`);
        if (!choreItem) return;
        
        const choreContent = choreItem.querySelector('.chore-item-content');
        const originalContent = choreContent.innerHTML;
        
        // Create editor HTML
        const editorHTML = `
            <div class="single-chore-editor" style="width: 100%;">
                <div class="form-group" style="margin-bottom: var(--space-3);">
                    <label style="font-size: var(--font-size-sm); color: var(--gray-600);">Chore Name</label>
                    <input type="text" class="chore-name-input" value="${chore.name}" style="width: 100%; padding: var(--space-2); border: 1px solid var(--gray-300); border-radius: var(--radius);">
                </div>
                
                <div class="form-group" style="margin-bottom: var(--space-3);">
                    <label style="font-size: var(--font-size-sm); color: var(--gray-600);">Icon</label>
                    <div class="icon-picker-small" style="display: flex; gap: var(--space-1); flex-wrap: wrap; max-height: 120px; overflow-y: auto;">
                        <button type="button" class="icon-option-small ${chore.icon === '📝' ? 'active' : ''}" data-icon="📝">📝</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🛏️' ? 'active' : ''}" data-icon="🛏️">🛏️</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🧹' ? 'active' : ''}" data-icon="🧹">🧹</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🧺' ? 'active' : ''}" data-icon="🧺">🧺</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🍽️' ? 'active' : ''}" data-icon="🍽️">🍽️</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🚿' ? 'active' : ''}" data-icon="🚿">🚿</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🧽' ? 'active' : ''}" data-icon="🧽">🧽</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🗑️' ? 'active' : ''}" data-icon="🗑️">🗑️</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🚪' ? 'active' : ''}" data-icon="🚪">🚪</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🪟' ? 'active' : ''}" data-icon="🪟">🪟</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🪑' ? 'active' : ''}" data-icon="🪑">🪑</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🛋️' ? 'active' : ''}" data-icon="🛋️">🛋️</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🪞' ? 'active' : ''}" data-icon="🪞">🪞</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🖼️' ? 'active' : ''}" data-icon="🖼️">🖼️</button>
                        <button type="button" class="icon-option-small ${chore.icon === '💡' ? 'active' : ''}" data-icon="💡">💡</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🔌' ? 'active' : ''}" data-icon="🔌">🔌</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🔋' ? 'active' : ''}" data-icon="🔋">🔋</button>
                        <button type="button" class="icon-option-small ${chore.icon === '👕' ? 'active' : ''}" data-icon="👕">👕</button>
                        <button type="button" class="icon-option-small ${chore.icon === '👖' ? 'active' : ''}" data-icon="👖">👖</button>
                        <button type="button" class="icon-option-small ${chore.icon === '👟' ? 'active' : ''}" data-icon="👟">👟</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🎒' ? 'active' : ''}" data-icon="🎒">🎒</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🧸' ? 'active' : ''}" data-icon="🧸">🧸</button>
                        <button type="button" class="icon-option-small ${chore.icon === '📚' ? 'active' : ''}" data-icon="📚">📚</button>
                        <button type="button" class="icon-option-small ${chore.icon === '📖' ? 'active' : ''}" data-icon="📖">📖</button>
                        <button type="button" class="icon-option-small ${chore.icon === '✏️' ? 'active' : ''}" data-icon="✏️">✏️</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🎨' ? 'active' : ''}" data-icon="🎨">🎨</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🧠' ? 'active' : ''}" data-icon="🧠">🧠</button>
                        <button type="button" class="icon-option-small ${chore.icon === '📱' ? 'active' : ''}" data-icon="📱">📱</button>
                        <button type="button" class="icon-option-small ${chore.icon === '💻' ? 'active' : ''}" data-icon="💻">💻</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🎮' ? 'active' : ''}" data-icon="🎮">🎮</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🐕' ? 'active' : ''}" data-icon="🐕">🐕</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🐱' ? 'active' : ''}" data-icon="🐱">🐱</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🐦' ? 'active' : ''}" data-icon="🐦">🐦</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🐠' ? 'active' : ''}" data-icon="🐠">🐠</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🐹' ? 'active' : ''}" data-icon="🐹">🐹</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🌱' ? 'active' : ''}" data-icon="🌱">🌱</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🌺' ? 'active' : ''}" data-icon="🌺">🌺</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🌳' ? 'active' : ''}" data-icon="🌳">🌳</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🌿' ? 'active' : ''}" data-icon="🌿">🌿</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🍃' ? 'active' : ''}" data-icon="🍃">🍃</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🌧️' ? 'active' : ''}" data-icon="🌧️">🌧️</button>
                        <button type="button" class="icon-option-small ${chore.icon === '☀️' ? 'active' : ''}" data-icon="☀️">☀️</button>
                        <button type="button" class="icon-option-small ${chore.icon === '❄️' ? 'active' : ''}" data-icon="❄️">❄️</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🚗' ? 'active' : ''}" data-icon="🚗">🚗</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🚲' ? 'active' : ''}" data-icon="🚲">🚲</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🛴' ? 'active' : ''}" data-icon="🛴">🛴</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🏠' ? 'active' : ''}" data-icon="🏠">🏠</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🏡' ? 'active' : ''}" data-icon="🏡">🏡</button>
                        <button type="button" class="icon-option-small ${chore.icon === '⚽' ? 'active' : ''}" data-icon="⚽">⚽</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🏀' ? 'active' : ''}" data-icon="🏀">🏀</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🎾' ? 'active' : ''}" data-icon="🎾">🎾</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🏊' ? 'active' : ''}" data-icon="🏊">🏊</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🚴' ? 'active' : ''}" data-icon="🚴">🚴</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🏃' ? 'active' : ''}" data-icon="🏃">🏃</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🧘' ? 'active' : ''}" data-icon="🧘">🧘</button>
                        <button type="button" class="icon-option-small ${chore.icon === '💪' ? 'active' : ''}" data-icon="💪">💪</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🎯' ? 'active' : ''}" data-icon="🎯">🎯</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🎵' ? 'active' : ''}" data-icon="🎵">🎵</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🎤' ? 'active' : ''}" data-icon="🎤">🎤</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🎧' ? 'active' : ''}" data-icon="🎧">🎧</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🎹' ? 'active' : ''}" data-icon="🎹">🎹</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🎸' ? 'active' : ''}" data-icon="🎸">🎸</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🥁' ? 'active' : ''}" data-icon="🥁">🥁</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🎺' ? 'active' : ''}" data-icon="🎺">🎺</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🎻' ? 'active' : ''}" data-icon="🎻">🎻</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🎼' ? 'active' : ''}" data-icon="🎼">🎼</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🎭' ? 'active' : ''}" data-icon="🎭">🎭</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🎬' ? 'active' : ''}" data-icon="🎬">🎬</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🎉' ? 'active' : ''}" data-icon="🎉">🎉</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🎊' ? 'active' : ''}" data-icon="🎊">🎊</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🎈' ? 'active' : ''}" data-icon="🎈">🎈</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🎁' ? 'active' : ''}" data-icon="🎁">🎁</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🎄' ? 'active' : ''}" data-icon="🎄">🎄</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🎃' ? 'active' : ''}" data-icon="🎃">🎃</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🎪' ? 'active' : ''}" data-icon="🎪">🎪</button>
                        <button type="button" class="icon-option-small ${chore.icon === '❤️' ? 'active' : ''}" data-icon="❤️">❤️</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🌟' ? 'active' : ''}" data-icon="🌟">🌟</button>
                        <button type="button" class="icon-option-small ${chore.icon === '⭐' ? 'active' : ''}" data-icon="⭐">⭐</button>
                        <button type="button" class="icon-option-small ${chore.icon === '✨' ? 'active' : ''}" data-icon="✨">✨</button>
                        <button type="button" class="icon-option-small ${chore.icon === '💎' ? 'active' : ''}" data-icon="💎">💎</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🏆' ? 'active' : ''}" data-icon="🏆">🏆</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🎖️' ? 'active' : ''}" data-icon="🎖️">🎖️</button>
                        <button type="button" class="icon-option-small ${chore.icon === '👑' ? 'active' : ''}" data-icon="👑">👑</button>
                        <button type="button" class="icon-option-small ${chore.icon === '💫' ? 'active' : ''}" data-icon="💫">💫</button>
                        <button type="button" class="icon-option-small ${chore.icon === '🌈' ? 'active' : ''}" data-icon="🌈">🌈</button>
                    </div>
                </div>
                
                <div class="form-group" style="margin-bottom: var(--space-3);">
                    <label style="font-size: var(--font-size-sm); color: var(--gray-600);">Category</label>
                    <select class="chore-category-input" style="width: 100%; padding: var(--space-2); border: 1px solid var(--gray-300); border-radius: var(--radius);">
                        <option value="General" ${chore.category === 'General' ? 'selected' : ''}>General</option>
                        <option value="Kitchen" ${chore.category === 'Kitchen' ? 'selected' : ''}>Kitchen</option>
                        <option value="Bedroom" ${chore.category === 'Bedroom' ? 'selected' : ''}>Bedroom</option>
                        <option value="Bathroom" ${chore.category === 'Bathroom' ? 'selected' : ''}>Bathroom</option>
                        <option value="Outdoor" ${chore.category === 'Outdoor' ? 'selected' : ''}>Outdoor</option>
                        <option value="School" ${chore.category === 'School' ? 'selected' : ''}>School</option>
                        <option value="Personal" ${chore.category === 'Personal' ? 'selected' : ''}>Personal</option>
                        <option value="Technology" ${chore.category === 'Technology' ? 'selected' : ''}>Technology</option>
                        <option value="Pets" ${chore.category === 'Pets' ? 'selected' : ''}>Pets</option>
                        <option value="Plants" ${chore.category === 'Plants' ? 'selected' : ''}>Plants</option>
                    </select>
                </div>
                
                <div class="form-group" style="margin-bottom: var(--space-3);">
                    <label style="font-size: var(--font-size-sm); color: var(--gray-600);">Reward (cents)</label>
                    <input type="number" class="chore-reward-input" value="${chore.reward_cents}" min="1" max="100" style="width: 100%; padding: var(--space-2); border: 1px solid var(--gray-300); border-radius: var(--radius);">
                </div>
                
                <div class="form-actions" style="display: flex; gap: var(--space-2); margin-top: var(--space-3);">
                    <button type="button" class="btn btn-sm btn-outline cancel-single-edit" data-chore-id="${choreId}">Cancel</button>
                    <button type="button" class="btn btn-sm btn-primary save-single-edit" data-chore-id="${choreId}">Save</button>
                </div>
            </div>
        `;
        
        // Replace content with editor
        choreContent.innerHTML = editorHTML;
        
        // Add event handlers for the editor
        this.addSingleChoreEditorHandlers(choreId, choreItem, originalContent);
    }

    addSingleChoreEditorHandlers(choreId, choreItem, originalContent) {
        // Icon picker handlers
        const iconPicker = choreItem.querySelector('.icon-picker-small');
        if (iconPicker) {
            iconPicker.addEventListener('click', (e) => {
                if (e.target.classList.contains('icon-option-small')) {
                    iconPicker.querySelectorAll('.icon-option-small').forEach(btn => {
                        btn.classList.remove('active');
                    });
                    e.target.classList.add('active');
                }
            });
        }
        
        // Save button handler
        const saveBtn = choreItem.querySelector('.save-single-edit');
        if (saveBtn) {
            saveBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.saveSingleChoreEdit(choreId, choreItem, originalContent);
            });
        }
        
        // Cancel button handler
        const cancelBtn = choreItem.querySelector('.cancel-single-edit');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.cancelSingleChoreEdit(choreItem, originalContent);
            });
        }
    }

    async saveSingleChoreEdit(choreId, choreItem, originalContent) {
        const nameInput = choreItem.querySelector('.chore-name-input');
        const categoryInput = choreItem.querySelector('.chore-category-input');
        const rewardInput = choreItem.querySelector('.chore-reward-input');
        const activeIcon = choreItem.querySelector('.icon-option-small.active');
        
        const name = nameInput.value.trim();
        const category = categoryInput.value;
        const reward = parseInt(rewardInput.value);
        const icon = activeIcon ? activeIcon.dataset.icon : '📝';
        
        if (!name) {
            this.showToast('Chore name is required', 'error');
            return;
        }
        
        if (reward < 1 || reward > 100) {
            this.showToast('Reward must be between 1 and 100 cents', 'error');
            return;
        }
        
        this.showLoading();
        
        try {
            const result = await this.apiClient.updateChore(choreId, {
                name,
                category,
                reward_cents: reward,
                icon
            });
            
            this.hideLoading();
            
            if (result.success) {
                this.showToast('Chore updated successfully!', 'success');
                
                // Update the chore in our local data
                const choreIndex = this.chores.findIndex(c => c.id === choreId);
                if (choreIndex !== -1) {
                    this.chores[choreIndex] = { ...this.chores[choreIndex], name, category, reward_cents: reward, icon };
                }
                
                // Refresh the bulk edit modal
                const childId = document.getElementById('bulk-edit-form').dataset.childId;
                this.openBulkEditModal(childId);
            } else {
                this.showToast(result.error || 'Failed to update chore', 'error');
            }
        } catch (error) {
            this.hideLoading();
            this.showToast('Error updating chore: ' + error.message, 'error');
        }
    }

    cancelSingleChoreEdit(choreItem, originalContent) {
        const choreContent = choreItem.querySelector('.chore-item-content');
        choreContent.innerHTML = originalContent;
    }

    async handleBulkEditChores() {
        const childId = document.getElementById('bulk-edit-form').dataset.childId;
        const selectedChores = Array.from(document.querySelectorAll('#bulk-edit-chores-list input[type="checkbox"]:checked'))
            .map(checkbox => checkbox.value);
        
        if (selectedChores.length === 0) {
            this.showToast('Please select at least one chore to edit', 'error');
            return;
        }
        
        const rewardCents = document.getElementById('bulk-edit-reward').value;
        const icon = document.getElementById('bulk-edit-icon').value;
        const category = document.getElementById('bulk-edit-category').value;
        
        // Validate inputs
        if (rewardCents && (rewardCents < 1 || rewardCents > 100)) {
            this.showToast('Reward must be between 1 and 100 cents', 'error');
            return;
        }
        
        this.showLoading();
        
        try {
            // Update each selected chore
            const updatePromises = selectedChores.map(async (choreId) => {
                const updateData = {};
                
                if (rewardCents) updateData.reward_cents = parseInt(rewardCents);
                if (icon) updateData.icon = icon;
                if (category) updateData.category = category;
                
                return await this.apiClient.updateChore(choreId, updateData);
            });
            
            const results = await Promise.all(updatePromises);
            const successCount = results.filter(result => result.success).length;
            
            this.hideLoading();
            
            if (successCount === selectedChores.length) {
                this.showToast(`Successfully updated ${successCount} chore${successCount !== 1 ? 's' : ''}!`, 'success');
                this.hideModal('bulk-edit-chores-modal');
                
                // Reload chores and regenerate tabs
                await this.loadChoresList();
                this.generateChildTabs();
                
                // Return to the chores tab and the specific child tab
                this.switchSettingsTab('chores');
                setTimeout(() => {
                    this.switchChildChoreTab(childId);
                }, 100);
            } else {
                this.showToast(`Updated ${successCount} of ${selectedChores.length} chores. Some updates failed.`, 'warning');
            }
        } catch (error) {
            this.hideLoading();
            this.showToast('Error updating chores: ' + error.message, 'error');
        }
    }

    // Fixed setupChoreColorSwatches function
    setupChoreColorSwatches() {
        // Color preset click handler
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('color-preset') && e.target.closest('.premium-features')) {
                const colorPickerRow = e.target.closest('.color-picker-row');
                const colorInput = colorPickerRow.querySelector('input[type="color"]');
                
                if (colorInput) {
                    colorInput.value = e.target.dataset.color;
                    colorInput.dispatchEvent(new Event('input'));
                }
                
                // Update active state
                colorPickerRow.querySelectorAll('.color-preset').forEach(btn => {
                    btn.classList.remove('selected');
                    btn.style.borderColor = '#fff';
                });
                e.target.classList.add('selected');
                e.target.style.borderColor = '#333';
            }
        });
        
        // When color input changes, update which preset is selected
        document.addEventListener('input', (e) => {
            if (e.target.type === 'color' && e.target.closest('.premium-features')) {
                const colorPickerRow = e.target.closest('.color-picker-row');
                if (colorPickerRow) {
                    colorPickerRow.querySelectorAll('.color-preset').forEach(btn => {
                        if (btn.dataset.color.toLowerCase() === e.target.value.toLowerCase()) {
                            btn.classList.add('selected');
                            btn.style.borderColor = '#333';
                        } else {
                            btn.classList.remove('selected');
                            btn.style.borderColor = '#fff';
                        }
                    });
                }
            }
        });
    }

    // Theme and Sound Management
    initializeToggles() {
        console.log('Initializing toggles...');
        
        // Prevent duplicate initialization
        if (this.togglesInitialized) {
            console.log('Toggles already initialized, skipping...');
            return;
        }
        this.togglesInitialized = true;
        
        // Initialize theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        console.log('Theme toggle element:', themeToggle);
        if (themeToggle) {
            console.log('Found theme toggle, setting up event listener');
            
            // Remove any existing listeners by cloning the element
            const newThemeToggle = themeToggle.cloneNode(true);
            themeToggle.parentNode.replaceChild(newThemeToggle, themeToggle);
            
            newThemeToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Theme toggle clicked');
                this.toggleTheme();
            });
            
            // Set initial state
            const iconSpan = newThemeToggle.querySelector('.toggle-icon');
            if (iconSpan) {
                iconSpan.textContent = this.settings.theme === 'dark' ? '☀️' : '🌙';
                console.log('Set theme icon to:', iconSpan.textContent);
            }
        } else {
            console.warn('Theme toggle button not found');
        }
        
        // Initialize sound toggle
        const soundToggle = document.getElementById('sound-toggle');
        console.log('Sound toggle element:', soundToggle);
        if (soundToggle) {
            console.log('Found sound toggle, setting up event listener');
            
            // Remove any existing listeners by cloning the element
            const newSoundToggle = soundToggle.cloneNode(true);
            soundToggle.parentNode.replaceChild(newSoundToggle, soundToggle);
            
            newSoundToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Sound toggle clicked');
                this.toggleSound();
            });
            
            // Set initial state
            this.updateSoundToggle();
        } else {
            console.warn('Sound toggle button not found');
        }
    }

    toggleTheme() {
        console.log('toggleTheme called');
        const currentTheme = this.settings.theme;
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        console.log('Switching from', currentTheme, 'to', newTheme);
        this.setTheme(newTheme);
        
        // Removed theme switching toast to reduce noise
        this.updateMobileMenuStates();
    }

    setTheme(theme) {
        console.log('setTheme called with:', theme);
        this.settings.theme = theme;
        
        // Apply theme to document root
        const root = document.documentElement;
        
        // Remove existing theme classes
        root.classList.remove('light-theme', 'dark-theme');
        
        // Add new theme class
        root.classList.add(`${theme}-theme`);
        
        // Set data attribute for CSS selectors on html and body for compatibility
        root.setAttribute('data-theme', theme);
        document.body.setAttribute('data-theme', theme);
        
        // Apply CSS custom properties for immediate effect
        if (theme === 'dark') {
            // Core theme variables
            root.style.setProperty('--bg-primary', '#0f0f23');
            root.style.setProperty('--bg-secondary', '#1a1a2e');
            root.style.setProperty('--text-primary', '#ffffff');
            root.style.setProperty('--text-secondary', '#b8b8d1');
            root.style.setProperty('--border-color', '#2d2d44');
            root.style.setProperty('--card-bg', '#1e1e3a');
            root.style.setProperty('--modal-bg', '#1e1e3a');
            
            // Extended dark mode variables
            root.style.setProperty('--header-bg', '#16162a');
            root.style.setProperty('--tab-bg', '#2a2a4a');
            root.style.setProperty('--tab-active-bg', '#4a4a8a');
            root.style.setProperty('--button-bg', '#2d2d4d');
            root.style.setProperty('--button-hover', '#3d3d6d');
            root.style.setProperty('--button-text', '#ffffff');
            root.style.setProperty('--progress-bg', '#2a2a4a');
            root.style.setProperty('--progress-fill', '#4a8a4a');
            root.style.setProperty('--table-header', '#2a2a4a');
            root.style.setProperty('--table-row', '#1e1e3a');
            root.style.setProperty('--table-row-hover', '#2a2a4a');
            root.style.setProperty('--checkbox-bg', '#2d2d4d');
            root.style.setProperty('--checkbox-checked', '#4a8a4a');
            
            // Enhanced shadows for dark mode
            root.style.setProperty('--shadow-sm', '0 1px 2px 0 rgba(0, 0, 0, 0.3)');
            root.style.setProperty('--shadow-md', '0 4px 6px -1px rgba(0, 0, 0, 0.4)');
            root.style.setProperty('--shadow-lg', '0 10px 15px -3px rgba(0, 0, 0, 0.5)');
            root.style.setProperty('--shadow-xl', '0 20px 25px -5px rgba(0, 0, 0, 0.6)');
        } else {
            // Light mode variables
            root.style.setProperty('--bg-primary', '#ffffff');
            root.style.setProperty('--bg-secondary', '#f9fafb');
            root.style.setProperty('--text-primary', '#111827');
            root.style.setProperty('--text-secondary', '#6b7280');
            root.style.setProperty('--border-color', '#e5e7eb');
            root.style.setProperty('--card-bg', 'rgba(255, 255, 255, 0.95)');
            root.style.setProperty('--modal-bg', '#ffffff');
            
            // Reset extended variables to defaults
            root.style.setProperty('--header-bg', '');
            root.style.setProperty('--tab-bg', '');
            root.style.setProperty('--tab-active-bg', '');
            root.style.setProperty('--button-bg', '');
            root.style.setProperty('--button-hover', '');
            root.style.setProperty('--button-text', '');
            root.style.setProperty('--progress-bg', '');
            root.style.setProperty('--progress-fill', '');
            root.style.setProperty('--table-header', '');
            root.style.setProperty('--table-row', '');
            root.style.setProperty('--table-row-hover', '');
            root.style.setProperty('--checkbox-bg', '');
            root.style.setProperty('--checkbox-checked', '');
            
            // Reset shadows to light mode
            root.style.setProperty('--shadow-sm', '0 1px 2px 0 rgb(0 0 0 / 0.05)');
            root.style.setProperty('--shadow-md', '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)');
            root.style.setProperty('--shadow-lg', '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)');
            root.style.setProperty('--shadow-xl', '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)');
        }
        
        console.log('Theme applied:', {
            'data-theme': root.getAttribute('data-theme'),
            'classes': root.classList.toString(),
            'bg-primary': root.style.getPropertyValue('--bg-primary')
        });
        
        this.saveSettings();
        
        // Update theme toggle button icon
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            const iconSpan = themeToggle.querySelector('.toggle-icon');
            if (iconSpan) {
                iconSpan.textContent = theme === 'dark' ? '☀️' : '🌙';
                console.log('Updated theme icon to:', iconSpan.textContent);
            }
        }
        
        // Update footer theme toggle button icon
        const footerThemeToggle = document.getElementById('footer-theme-toggle');
        if (footerThemeToggle) {
            const icon = footerThemeToggle.querySelector('.footer-icon');
            if (icon) {
                icon.textContent = theme === 'dark' ? '☀️' : '🌙';
                console.log('Updated footer theme icon to:', icon.textContent);
            }
        }
        
        // Update theme selector
        const themeSelector = document.getElementById('theme-selector');
        if (themeSelector) {
            themeSelector.value = theme;
        }
        
        // Force a repaint to ensure theme changes are applied
        root.style.display = 'none';
        root.offsetHeight; // Trigger reflow
        root.style.display = '';
    }

    setColorScheme(scheme) {
        this.settings.colorScheme = scheme;
        document.documentElement.setAttribute('data-color-scheme', scheme);
        this.saveSettings();
        
        // Update color scheme selector
        const colorSelector = document.getElementById('color-scheme');
        if (colorSelector) {
            colorSelector.value = scheme;
        }
    }

    toggleSound() {
        console.log('toggleSound called');
        this.settings.soundEnabled = !this.settings.soundEnabled;
        console.log('Sound enabled:', this.settings.soundEnabled);
        this.updateSoundToggle();
        this.saveSettings();
        
        // Play test sound when enabling (only once)
        if (this.settings.soundEnabled && !this.justToggled) {
            this.justToggled = true;
            setTimeout(() => {
                this.playSound('notification');
                this.justToggled = false;
            }, 100);
        }
        this.updateMobileMenuStates();
    }

    updateSoundToggle() {
        console.log('updateSoundToggle called, soundEnabled:', this.settings.soundEnabled);
        
        // Try to find the sound toggle button
        let soundToggle = document.getElementById('sound-toggle');
        
        // If not found by ID, try to find it another way
        if (!soundToggle) {
            soundToggle = document.querySelector('[data-toggle="sound"]') || 
                         document.querySelector('.sound-toggle') ||
                         document.querySelector('button[onclick*="toggleSound"]');
        }
        
        if (soundToggle) {
            const iconSpan = soundToggle.querySelector('.toggle-icon') || 
                            soundToggle.querySelector('span') || 
                            soundToggle;
            
            if (iconSpan) {
                if (this.settings.soundEnabled) {
                    iconSpan.textContent = '🔊';
                    soundToggle.classList.remove('muted');
                    console.log('Sound enabled - showing 🔊');
                } else {
                    iconSpan.textContent = '🔇';
                    soundToggle.classList.add('muted');
                    console.log('Sound disabled - showing 🔇');
                }
            }
        } else {
            console.warn('Sound toggle button not found in DOM');
        }
        
        // Update sound enabled checkbox
        const soundEnabled = document.getElementById('sound-enabled');
        if (soundEnabled) {
            soundEnabled.checked = this.settings.soundEnabled;
        }
        
        // Update footer sound toggle button
        const footerSoundToggle = document.getElementById('footer-sound-toggle');
        if (footerSoundToggle) {
            const icon = footerSoundToggle.querySelector('.footer-icon');
            if (icon) {
                icon.textContent = this.settings.soundEnabled ? '🔊' : '🔇';
                console.log('Updated footer sound icon to:', icon.textContent);
            }
        }
    }

    playSound(soundType = 'success') {
        if (!this.settings.soundEnabled) return;
        
        const volume = this.settings.soundVolume / 100;
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        const sounds = {
            success: { frequency: 800, duration: 0.2 },
            error: { frequency: 400, duration: 0.3 },
            celebration: { frequency: 600, duration: 0.1, pattern: [600, 700, 800, 900] },
            notification: { frequency: 500, duration: 0.15 }
        };
        
        const sound = sounds[soundType];
        if (!sound) return;
        
        if (sound.pattern) {
            // Play pattern of sounds
            sound.pattern.forEach((freq, index) => {
                setTimeout(() => {
                    this.playTone(audioContext, freq, sound.duration, volume);
                }, index * 100);
            });
        } else {
            this.playTone(audioContext, sound.frequency, sound.duration, volume);
        }
    }

    playTone(audioContext, frequency, duration, volume) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
    }

    // Streak Management
    updateStreak(childId, choreId) {
        const today = new Date().toISOString().split('T')[0];
        const streakKey = `${childId}-${choreId}`;
        
        if (!this.streaks[streakKey]) {
            this.streaks[streakKey] = { count: 0, lastDate: null };
        }
        
        const streak = this.streaks[streakKey];
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        if (streak.lastDate === yesterdayStr) {
            // Consecutive day
            streak.count++;
        } else if (streak.lastDate === today) {
            // Already completed today
            return streak.count;
        } else {
            // New streak or broken streak
            streak.count = 1;
        }
        
        streak.lastDate = today;
        this.saveStreaks();
        this.updateStreakDisplay();
        
        return streak.count;
    }

    getStreak(childId, choreId) {
        const streakKey = `${childId}-${choreId}`;
        return this.streaks[streakKey]?.count || 0;
    }

    updateStreakDisplay() {
        const streakDisplay = document.getElementById('streak-display');
        if (!streakDisplay) return;
        
        let html = '';
        this.children.forEach(child => {
            const childChores = this.chores.filter(chore => chore.child_id === child.id);
            const totalStreak = childChores.reduce((sum, chore) => {
                return sum + this.getStreak(child.id, chore.id);
            }, 0);
            
            if (totalStreak > 0) {
                html += `
                    <div class="streak-card">
                        <div class="streak-count">${totalStreak}</div>
                        <div class="streak-label">${child.name}'s Total Streak</div>
                    </div>
                `;
            }
        });
        
        if (html === '') {
            html = '<p style="color: var(--gray-600); text-align: center;">No active streaks yet. Complete chores to start building streaks!</p>';
        }
        
        streakDisplay.innerHTML = html;
    }

    async resetAllStreaks() {
        const confirmed = await this.showConfirmation(
            'Are you sure you want to reset all streaks? This will erase all streak progress and cannot be undone.',
            'Reset All Streaks',
            'danger',
            'Yes, Reset All',
            'Cancel'
        );
        
        if (confirmed) {
            this.streaks = {};
            this.saveStreaks();
            this.updateStreakDisplay();
            this.showToast('All streaks have been reset', 'success');
        }
    }

    exportStreakData() {
        const data = JSON.stringify(this.streaks, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'streak-data.json';
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('Streak data exported successfully!', 'success');
    }

    showStreakHistory() {
        let html = '<h4>Streak History</h4>';
        let hasStreaks = false;
        
        this.children.forEach(child => {
            const childChores = this.chores.filter(chore => chore.child_id === child.id);
            childChores.forEach(chore => {
                const streak = this.getStreak(child.id, chore.id);
                if (streak > 0) {
                    hasStreaks = true;
                    html += `
                        <div style="margin-bottom: var(--space-2); padding: var(--space-2); background: var(--gray-50); border-radius: var(--radius);">
                            <strong>${child.name}</strong> - ${chore.name}: <span style="color: var(--primary); font-weight: bold;">${streak} day${streak !== 1 ? 's' : ''}</span>
                        </div>
                    `;
                }
            });
        });
        
        if (!hasStreaks) {
            html += '<p style="color: var(--gray-600);">No active streaks found.</p>';
        }
        
        this.showToast(html, 'info', 5000);
    }

    // Settings Management
    loadSettings() {
        console.log('Loading settings...');
        const saved = localStorage.getItem('familyChoreChartSettings');
        if (saved) {
            try {
                const parsedSettings = JSON.parse(saved);
                this.settings = { ...this.settings, ...parsedSettings };
                console.log('Loaded settings:', this.settings);
            } catch (error) {
                console.error('Error parsing saved settings:', error);
            }
        }
        
        // Apply settings immediately
        this.setTheme(this.settings.theme);
        this.setColorScheme(this.settings.colorScheme);
        
        // Delay sound toggle update to ensure DOM is ready
        setTimeout(() => {
            this.updateSoundToggle();
        }, 200);
        
        // Update UI elements
        const soundVolume = document.getElementById('sound-volume');
        if (soundVolume) {
            soundVolume.value = this.settings.soundVolume;
        }
        
        console.log('Settings loaded and applied');
    }

    saveSettings() {
        console.log('Saving settings:', this.settings);
        try {
            localStorage.setItem('familyChoreChartSettings', JSON.stringify(this.settings));
            console.log('Settings saved successfully');
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }

    // Add method to force refresh theme
    forceApplyTheme() {
        console.log('Force applying theme:', this.settings.theme);
        const root = document.documentElement;
        
        // Force remove and re-add classes
        root.classList.remove('light-theme', 'dark-theme');
        root.setAttribute('data-theme', this.settings.theme);
        document.body.setAttribute('data-theme', this.settings.theme);
        root.classList.add(`${this.settings.theme}-theme`);
        
        // Force apply CSS variables
        if (this.settings.theme === 'dark') {
            // Core theme variables
            root.style.setProperty('--bg-primary', '#0f0f23');
            root.style.setProperty('--bg-secondary', '#1a1a2e');
            root.style.setProperty('--text-primary', '#ffffff');
            root.style.setProperty('--text-secondary', '#b8b8d1');
            root.style.setProperty('--border-color', '#2d2d44');
            root.style.setProperty('--card-bg', '#1e1e3a');
            root.style.setProperty('--modal-bg', '#1e1e3a');
            
            // Extended dark mode variables
            root.style.setProperty('--header-bg', '#16162a');
            root.style.setProperty('--tab-bg', '#2a2a4a');
            root.style.setProperty('--tab-active-bg', '#4a4a8a');
            root.style.setProperty('--button-bg', '#2d2d4d');
            root.style.setProperty('--button-hover', '#3d3d6d');
            root.style.setProperty('--button-text', '#ffffff');
            root.style.setProperty('--progress-bg', '#2a2a4a');
            root.style.setProperty('--progress-fill', '#4a8a4a');
            root.style.setProperty('--table-header', '#2a2a4a');
            root.style.setProperty('--table-row', '#1e1e3a');
            root.style.setProperty('--table-row-hover', '#2a2a4a');
            root.style.setProperty('--checkbox-bg', '#2d2d4d');
            root.style.setProperty('--checkbox-checked', '#4a8a4a');
            
            // Enhanced shadows for dark mode
            root.style.setProperty('--shadow-sm', '0 1px 2px 0 rgba(0, 0, 0, 0.3)');
            root.style.setProperty('--shadow-md', '0 4px 6px -1px rgba(0, 0, 0, 0.4)');
            root.style.setProperty('--shadow-lg', '0 10px 15px -3px rgba(0, 0, 0, 0.5)');
            root.style.setProperty('--shadow-xl', '0 20px 25px -5px rgba(0, 0, 0, 0.6)');
            
            // Don't override body background if seasonal theme is active - let CSS handle it
            if (!this.hasActiveSeasonalTheme()) {
                document.body.style.backgroundColor = '#0f0f23';
            }
            document.body.style.color = '#ffffff';
        } else {
            // Light mode variables
            root.style.setProperty('--bg-primary', '#ffffff');
            root.style.setProperty('--bg-secondary', '#f9fafb');
            root.style.setProperty('--text-primary', '#111827');
            root.style.setProperty('--text-secondary', '#6b7280');
            root.style.setProperty('--border-color', '#e5e7eb');
            root.style.setProperty('--card-bg', 'rgba(255, 255, 255, 0.95)');
            root.style.setProperty('--modal-bg', '#ffffff');
            
            // Reset extended variables to defaults
            root.style.setProperty('--header-bg', '');
            root.style.setProperty('--tab-bg', '');
            root.style.setProperty('--tab-active-bg', '');
            root.style.setProperty('--button-bg', '');
            root.style.setProperty('--button-hover', '');
            root.style.setProperty('--button-text', '');
            root.style.setProperty('--progress-bg', '');
            root.style.setProperty('--progress-fill', '');
            root.style.setProperty('--table-header', '');
            root.style.setProperty('--table-row', '');
            root.style.setProperty('--table-row-hover', '');
            root.style.setProperty('--checkbox-bg', '');
            root.style.setProperty('--checkbox-checked', '');
            
            // Reset shadows to light mode
            root.style.setProperty('--shadow-sm', '0 1px 2px 0 rgb(0 0 0 / 0.05)');
            root.style.setProperty('--shadow-md', '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)');
            root.style.setProperty('--shadow-lg', '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)');
            root.style.setProperty('--shadow-xl', '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)');
            
            // Don't override body background if seasonal theme is active - let CSS handle it
            if (!this.hasActiveSeasonalTheme()) {
                document.body.style.backgroundColor = '#ffffff';
            }
            document.body.style.color = '#111827';
        }
        
        // If a seasonal theme is active, reapply it to respect dark mode
        if (this.hasActiveSeasonalTheme()) {
            const currentThemeKey = localStorage.getItem('current-seasonal-theme');
            if (currentThemeKey && this.seasonalThemes[currentThemeKey]) {
                this.applySpecificTheme(this.seasonalThemes[currentThemeKey]);
            }
        }
        
        console.log('Theme force applied');
    }

    saveStreaks() {
        localStorage.setItem('familyChoreChartStreaks', JSON.stringify(this.streaks));
    }

    loadStreaks() {
        const saved = localStorage.getItem('familyChoreChartStreaks');
        if (saved) {
            this.streaks = JSON.parse(saved);
        }
    }

    // Add this method to FamilyChoreChart
    rerenderChildCard(childId) {
        // Find the child and its data
        const child = this.children.find(c => c.id === childId);
        if (!child) return;
        const childChores = this.chores.filter(chore => chore.child_id === child.id);
        const childCompletions = this.completions.filter(comp => childChores.some(chore => chore.id === comp.chore_id));
        // Create a new card
        const newCard = this.createChildCard(child);
        newCard.className = 'child-content active';
        newCard.dataset.childId = childId;
        // Replace the old card in the DOM
        const oldCard = document.querySelector(`.child-content[data-child-id="${childId}"]`);
        if (oldCard && oldCard.parentNode) {
            oldCard.parentNode.replaceChild(newCard, oldCard);
        }
    }

    // SMOOTH: Refresh only the chore section and preserve active tab






    // Smooth version of updateProgressSection (just add transitions):
    updateProgressSectionSmooth(childId, childChores, childCompletions, childCard) {
        const progressFill = childCard.querySelector('.progress-fill');
        const progressStats = childCard.querySelector('.progress-stats');
        const starsContainer = childCard.querySelector('.stars-container');
        const earningsAmount = childCard.querySelector('.earnings-amount');
        
        console.log('Progress elements found:', {
            progressFill: !!progressFill,
            progressStats: !!progressStats,
            starsContainer: !!starsContainer,
            earningsAmount: !!earningsAmount
        });
        
        if (progressFill && progressStats && starsContainer && earningsAmount) {
            // Calculate real progress
            const progress = this.calculateChildProgress(childId, childChores, childCompletions);
            console.log('Calculated progress:', progress);
            
            // SMOOTH: Batch updates in requestAnimationFrame to prevent jumpiness
            requestAnimationFrame(() => {
                // Progress bar with smooth transition
                progressFill.style.transition = 'width 0.3s ease-out';
                progressFill.style.width = `${progress.completionPercentage}%`;
                
                // Stats update (no transition needed)
                progressStats.innerHTML = `<span>${progress.completionPercentage}% complete</span>`;
                
                // Stars with fade effect
                const newStars = this.calculateStars(progress.completionPercentage);
                if (starsContainer.innerHTML !== newStars) {
                    starsContainer.style.transition = 'opacity 0.2s ease-in-out';
                    starsContainer.style.opacity = '0.7';
                    setTimeout(() => {
                        starsContainer.innerHTML = newStars;
                        starsContainer.style.opacity = '1';
                    }, 100);
                }
                
                // Earnings with subtle scale effect
                earningsAmount.style.transition = 'transform 0.2s ease-out';
                earningsAmount.style.transform = 'scale(1.02)';
                earningsAmount.textContent = this.formatCents(progress.totalEarnings);
                setTimeout(() => {
                    earningsAmount.style.transform = 'scale(1)';
                }, 200);
            });
            
            console.log('Progress elements updated smoothly');
        }
    }

    // Add this new method to update just the chore grid section:


    // Add bounce animation to make the refresh feel intentional and satisfying
    addBounceAnimation(card) {
        // Add CSS for smooth bounce animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes bounceIn {
                0% { 
                    transform: scale(0.95); 
                    opacity: 0.8;
                }
                50% { 
                    transform: scale(1.02); 
                    opacity: 1;
                }
                100% { 
                    transform: scale(1); 
                    opacity: 1;
                }
            }
            
            .bounce-in {
                animation: bounceIn 0.4s ease-out;
            }
            
            @keyframes cellBounce {
                0% { 
                    transform: scale(1); 
                }
                50% { 
                    transform: scale(1.1); 
                }
                100% { 
                    transform: scale(1); 
                }
            }
            
            .cell-bounce {
                animation: cellBounce 0.2s ease-out;
            }
        `;
        
        // Only add the style once
        if (!document.querySelector('#bounce-animation-style')) {
            style.id = 'bounce-animation-style';
            document.head.appendChild(style);
        }
        
        // Add bounce class to the card
        card.classList.add('bounce-in');
        
        // Remove the class after animation completes
        setTimeout(() => {
            card.classList.remove('bounce-in');
        }, 400);
        
        console.log('Bounce animation added to card');
    }
    
    // Add a quick bounce to individual cells for satisfying feedback
    addCellBounce(cell) {
        // Add bounce class to the cell
        cell.classList.add('cell-bounce');
        
        // Remove the class after animation completes
        setTimeout(() => {
            cell.classList.remove('cell-bounce');
        }, 200);
    }

    // Simple method to regenerate a child card with bounce animation
    rerenderChildCard(childId) {
        // Find the child and its data
        const child = this.children.find(c => c.id === childId);
        if (!child) return;
        
        const childChores = this.chores.filter(chore => chore.child_id === child.id);
        const childCompletions = this.completions.filter(comp => 
            childChores.some(chore => chore.id === comp.chore_id)
        );
        
        // Create a new card
        const newCard = this.createChildCard(child);
        newCard.className = 'child-content active';
        newCard.dataset.childId = childId;
        
        // Replace the old card
        const oldCard = document.querySelector(`.child-content[data-child-id="${childId}"]`);
        if (oldCard && oldCard.parentNode) {
            oldCard.parentNode.replaceChild(newCard, oldCard);
            console.log('Child card regenerated for:', childId);
            
            // Add bounce animation to the new card
            this.addBounceAnimation(newCard);
        }
    }

    setupHelpModals() {
        // FAQ button
        const faqBtn = document.getElementById('faq-btn');
        if (faqBtn && !faqBtn.hasListener) {
            faqBtn.addEventListener('click', () => {
                this.showModal('faq-modal');
            });
            faqBtn.hasListener = true;
        }

        // Contact button
        const contactBtn = document.getElementById('contact-btn');
        if (contactBtn && !contactBtn.hasListener) {
            contactBtn.addEventListener('click', () => {
                this.showModal('contact-modal');
            });
            contactBtn.hasListener = true;
        }

        // Contact form submission
        const contactForm = document.getElementById('contact-form');
        if (contactForm && !contactForm.hasListener) {
            contactForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleContactForm();
            });
            contactForm.hasListener = true;
        }

        // Character counter for message
        const messageTextarea = document.getElementById('contact-message');
        if (messageTextarea && !messageTextarea.hasListener) {
            messageTextarea.addEventListener('input', (e) => {
                const charCount = e.target.value.length;
                const charCountElement = e.target.parentNode.querySelector('.char-count');
                if (charCountElement) {
                    charCountElement.textContent = `${charCount}/1000 characters`;
                    charCountElement.style.color = charCount > 900 ? '#ef4444' : '#6b7280';
                }
            });
            messageTextarea.hasListener = true;
        }
    }

    async handleContactForm() {
        try {
            // Get form data
            const name = document.getElementById('contact-name').value.trim();
            const email = document.getElementById('contact-email').value.trim();
            const subject = document.getElementById('contact-subject').value;
            const message = document.getElementById('contact-message').value.trim();
            const verification = document.getElementById('contact-verification').value;
            
            // Anti-spam checks
            const honeypotWebsite = document.getElementById('contact-website').value;
            const honeypotEmail = document.getElementById('contact-email-confirm').value;
            
            // Check honeypot fields (bots often fill these)
            if (honeypotWebsite || honeypotEmail) {
                console.log('Spam detected: honeypot fields filled');
                this.showToast('Invalid submission detected.', 'error');
                return;
            }
            
            // Check verification answer
            if (verification !== '8') {
                this.showToast('Please answer the verification question correctly.', 'error');
                return;
            }
            
            // Validate required fields
            if (!name || !email || !subject || !message) {
                this.showToast('Please fill in all required fields.', 'error');
                return;
            }
            
            // Check for spam keywords in message
            const spamKeywords = ['viagra', 'casino', 'loan', 'debt', 'make money', 'earn money', 'work from home', 'click here', 'buy now', 'free money'];
            const messageLower = message.toLowerCase();
            const hasSpamKeywords = spamKeywords.some(keyword => messageLower.includes(keyword));
            
            if (hasSpamKeywords) {
                console.log('Spam detected: suspicious keywords');
                this.showToast('Your message contains suspicious content. Please revise and try again.', 'error');
                return;
            }
            
            // Rate limiting check
            const lastSubmission = localStorage.getItem('lastContactSubmission');
            const now = Date.now();
            if (lastSubmission && (now - parseInt(lastSubmission)) < 60000) { // 1 minute cooldown
                this.showToast('Please wait a moment before sending another message.', 'error');
                return;
            }
            
            // Show loading state
            const submitBtn = document.getElementById('contact-submit-btn');
            const btnText = submitBtn.querySelector('.btn-text');
            const btnLoading = submitBtn.querySelector('.btn-loading');
            
            btnText.style.display = 'none';
            btnLoading.style.display = 'inline';
            submitBtn.disabled = true;
            
            // Store in Supabase only (no email sending)
            const result = await this.apiClient.submitContactForm(name, email, subject, message);
            
            if (result.success) {
                // Store submission time for rate limiting
                localStorage.setItem('lastContactSubmission', now.toString());
                
                // Reset form
                document.getElementById('contact-form').reset();
                document.querySelector('.char-count').textContent = '0/1000 characters';
                
                // Hide modal and show success
                this.hideModal('contact-modal');
                this.showToast('Message sent successfully! We\'ll get back to you within 24 hours.', 'success');
            } else {
                throw new Error(result.error || 'Failed to send message');
            }
            
        } catch (error) {
            console.error('Contact form error:', error);
            this.showToast('Failed to send message. Please try again.', 'error');
        } finally {
            // Reset button state
            const submitBtn = document.getElementById('contact-submit-btn');
            const btnText = submitBtn.querySelector('.btn-text');
            const btnLoading = submitBtn.querySelector('.btn-loading');
            
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
            submitBtn.disabled = false;
        }
    }

    setupMobileMenu() {
        const hamburgerBtn = document.getElementById('hamburger-menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');
        const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
        const mobileMenuClose = document.getElementById('mobile-menu-close');
        
        // Open mobile menu
        hamburgerBtn.addEventListener('click', () => {
            mobileMenu.classList.add('active');
            mobileMenuOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
        
        // Close mobile menu
        const closeMobileMenu = () => {
            mobileMenu.classList.remove('active');
            mobileMenuOverlay.classList.remove('active');
            document.body.style.overflow = '';
        };
        
        mobileMenuClose.addEventListener('click', closeMobileMenu);
        
        // Close mobile menu when clicking on overlay
        mobileMenuOverlay.addEventListener('click', (e) => {
            // Only close if clicking directly on the overlay, not on child elements
            if (e.target === mobileMenuOverlay) {
                closeMobileMenu();
            }
        });
        
        // Prevent mobile menu clicks from bubbling up to overlay
        mobileMenu.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && mobileMenu.classList.contains('active')) {
                closeMobileMenu();
            }
        });
        
        // Connect mobile menu buttons to desktop buttons
        const mobileButtons = {
            'mobile-theme-toggle': 'theme-toggle',
            'mobile-sound-toggle': 'sound-toggle',
            'mobile-faq-btn': 'faq-btn',
            'mobile-contact-btn': 'contact-btn',
            'mobile-settings-btn': 'settings-btn',
            'mobile-logout-btn': 'logout-btn'
        };
        
        Object.entries(mobileButtons).forEach(([mobileId, desktopId]) => {
            const mobileBtn = document.getElementById(mobileId);
            const desktopBtn = document.getElementById(desktopId);
            
            if (mobileBtn && desktopBtn) {
                mobileBtn.addEventListener('click', () => {
                    // Trigger the desktop button's click event
                    desktopBtn.click();
                    // Close the mobile menu
                    closeMobileMenu();
                });
            }
        });
        
        // Update mobile menu button states based on desktop button states
        this.updateMobileMenuStates();
    }
    
    updateMobileMenuStates() {
        // Update theme toggle state
        const themeToggle = document.getElementById('theme-toggle');
        const mobileThemeToggle = document.getElementById('mobile-theme-toggle');
        if (themeToggle && mobileThemeToggle) {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            mobileThemeToggle.querySelector('.mobile-menu-text').textContent = isDark ? 'Light Mode' : 'Dark Mode';
            mobileThemeToggle.querySelector('.mobile-menu-icon').textContent = isDark ? '☀️' : '🌙';
        }
        
        // Update footer theme toggle state
        const footerThemeToggle = document.getElementById('footer-theme-toggle');
        if (footerThemeToggle) {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            const icon = footerThemeToggle.querySelector('.footer-icon');
            if (icon) {
                icon.textContent = isDark ? '☀️' : '🌙';
            }
        }
        
        // Update sound toggle state
        const soundToggle = document.getElementById('sound-toggle');
        const mobileSoundToggle = document.getElementById('mobile-sound-toggle');
        if (soundToggle && mobileSoundToggle) {
            const isMuted = soundToggle.classList.contains('muted');
            mobileSoundToggle.querySelector('.mobile-menu-text').textContent = isMuted ? 'Unmute' : 'Mute';
            mobileSoundToggle.querySelector('.mobile-menu-icon').textContent = isMuted ? '🔇' : '🔊';
        }
        
        // Update footer sound toggle state
        const footerSoundToggle = document.getElementById('footer-sound-toggle');
        if (footerSoundToggle) {
            const isMuted = !this.settings.soundEnabled;
            const icon = footerSoundToggle.querySelector('.footer-icon');
            if (icon) {
                icon.textContent = isMuted ? '🔇' : '🔊';
            }
        }
    }

    closeMobileMenu() {
        const mobileMenu = document.getElementById('mobile-menu');
        const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
        if (mobileMenu && mobileMenuOverlay) {
            mobileMenu.classList.remove('active');
            mobileMenuOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    // Analytics Dashboard Methods
    async initializeAnalytics() {
        console.log('Initializing analytics...');
        if (!this.apiClient) {
            console.log('No API client available');
            return;
        }
        
        console.log('Analytics data state:', {
            children: this.children?.length || 0,
            chores: this.chores?.length || 0,
            completions: this.completions?.length || 0
        });
        
        // Check if required DOM elements exist
        const requiredElements = [
            'weekly-progress-value',
            'total-earnings-value', 
            'best-streak-value',
            'perfect-days-value',
            'progress-chart',
            'comparison-chart',
            'activity-chart',
            'insights-grid',
            'analytics-date-range'
        ];
        
        const missingElements = requiredElements.filter(id => !document.getElementById(id));
        if (missingElements.length > 0) {
            console.error('Missing required DOM elements:', missingElements);
            return;
        }
        
        // Load analytics data
        await this.loadAnalyticsData();
        
        // Set up event listeners
        this.setupAnalyticsHandlers();
        
        // Initialize charts
        this.initializeCharts();
        
        // Generate insights
        this.generateInsights();
        
        console.log('Analytics initialization complete');
    }

    async loadAnalyticsData() {
        try {
            console.log('Loading analytics data...');
            // Check if we have the necessary data
            if (!this.children || !this.chores || !this.completions) {
                console.log('Analytics: Missing data:', {
                    children: !!this.children,
                    chores: !!this.chores,
                    completions: !!this.completions
                });
                this.showNoDataMessage();
                return;
            }
            
            const days = parseInt(document.getElementById('analytics-date-range')?.value || 30);
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            
            this.analyticsData = {
                startDate,
                endDate,
                days,
                children: this.children,
                chores: this.chores,
                completions: this.completions,
                familySettings: this.familySettings
            };
            
            // Calculate analytics metrics
            this.calculateAnalyticsMetrics();
            
        } catch (error) {
            console.error('Error loading analytics data:', error);
            this.showNoDataMessage();
        }
    }

    calculateAnalyticsMetrics() {
        if (!this.analyticsData) return;
        
        const { children, chores, completions, startDate, endDate } = this.analyticsData;
        
        // Check if we have any data
        if (!children || children.length === 0) {
            this.showNoDataMessage();
            return;
        }
        
        // Calculate metrics for each child
        this.analyticsMetrics = children.map(child => {
            const childChores = chores.filter(chore => chore.child_id === child.id);
            const childCompletions = completions.filter(comp => {
                const chore = childChores.find(c => c.id === comp.chore_id);
                if (!chore) return false;
                
                // Convert week_start + day_of_week to a proper date
                const weekStart = new Date(comp.week_start);
                const dayOffset = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(comp.day_of_week);
                const compDate = new Date(weekStart);
                compDate.setDate(weekStart.getDate() + dayOffset);
                
                return compDate >= startDate && compDate <= endDate;
            });
            
            const totalPossible = childChores.length * this.analyticsData.days;
            const completionRate = totalPossible > 0 ? (childCompletions.length / totalPossible) * 100 : 0;
            const totalEarnings = childCompletions.length * (this.familySettings?.daily_reward_cents || 7);
            
            // Calculate streak
            const streak = this.calculateStreak(child.id);
            
            // Calculate perfect days
            const perfectDays = this.calculatePerfectDays(child.id, startDate, endDate);
            
            return {
                childId: child.id,
                childName: child.name,
                completionRate: Math.round(completionRate),
                totalCompletions: childCompletions.length,
                totalPossible,
                totalEarnings,
                streak,
                perfectDays
            };
        });
        
        // Check if we have any meaningful data
        const hasData = this.analyticsMetrics.some(m => m.totalCompletions > 0);
        if (!hasData) {
            this.showNoDataMessage();
            return;
        }
        
        // Calculate family-wide metrics
        this.familyMetrics = {
            totalEarnings: this.analyticsMetrics.reduce((sum, m) => sum + m.totalEarnings, 0),
            averageCompletionRate: Math.round(this.analyticsMetrics.reduce((sum, m) => sum + m.completionRate, 0) / this.analyticsMetrics.length),
            bestStreak: Math.max(...this.analyticsMetrics.map(m => m.streak)),
            totalPerfectDays: this.analyticsMetrics.reduce((sum, m) => sum + m.perfectDays, 0)
        };
        
        // Update UI
        this.updateAnalyticsCards();
        this.hideNoDataMessage();
    }

    updateAnalyticsCards() {
        if (!this.familyMetrics) return;
        
        // Weekly Progress
        const weeklyProgressEl = document.getElementById('weekly-progress-value');
        if (weeklyProgressEl) {
            weeklyProgressEl.textContent = `${this.familyMetrics.averageCompletionRate}%`;
        }
        
        // Total Earnings
        const totalEarningsEl = document.getElementById('total-earnings-value');
        if (totalEarningsEl) {
            totalEarningsEl.textContent = this.formatCents(this.familyMetrics.totalEarnings);
        }
        
        // Best Streak
        const bestStreakEl = document.getElementById('best-streak-value');
        if (bestStreakEl) {
            bestStreakEl.textContent = `${this.familyMetrics.bestStreak} days`;
        }
        
        // Perfect Days
        const perfectDaysEl = document.getElementById('perfect-days-value');
        if (perfectDaysEl) {
            perfectDaysEl.textContent = this.familyMetrics.totalPerfectDays;
        }
    }

    showNoDataMessage() {
        console.log('Showing no data message...');
        // Hide charts and insights
        const chartsSection = document.querySelector('.charts-section');
        const insightsSection = document.querySelector('.insights-section');
        const exportSection = document.querySelector('.export-section');
        
        if (chartsSection) chartsSection.style.display = 'none';
        if (insightsSection) insightsSection.style.display = 'none';
        if (exportSection) exportSection.style.display = 'none';
        
        // Show no data message
        const analyticsContent = document.querySelector('.analytics-content');
        if (analyticsContent) {
            let noDataMessage = analyticsContent.querySelector('.no-data-message');
            if (!noDataMessage) {
                noDataMessage = document.createElement('div');
                noDataMessage.className = 'no-data-message';
                noDataMessage.innerHTML = `
                    <div style="font-size: 4rem; margin-bottom: var(--space-4);">📊</div>
                    <h3>No Data Collected Yet</h3>
                    <p>Start completing chores to see beautiful analytics, charts, and insights here!</p>
                    <div class="steps-grid">
                        <div class="step-card">
                            <div class="step-icon">👶</div>
                            <div class="step-title">Add Children</div>
                            <div class="step-description">Create profiles for your kids</div>
                        </div>
                        <div class="step-card">
                            <div class="step-icon">📝</div>
                            <div class="step-title">Add Chores</div>
                            <div class="step-description">Create daily tasks</div>
                        </div>
                        <div class="step-card">
                            <div class="step-icon">✅</div>
                            <div class="step-title">Complete Chores</div>
                            <div class="step-description">Mark them as done</div>
                        </div>
                    </div>
                `;
                analyticsContent.appendChild(noDataMessage);
            }
            noDataMessage.style.display = 'block';
        }
        
        // Clear analytics cards
        const cardValues = ['weekly-progress-value', 'total-earnings-value', 'best-streak-value', 'perfect-days-value'];
        cardValues.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '--';
        });
    }

    hideNoDataMessage() {
        // Show charts and insights
        const chartsSection = document.querySelector('.charts-section');
        const insightsSection = document.querySelector('.insights-section');
        const exportSection = document.querySelector('.export-section');
        
        if (chartsSection) chartsSection.style.display = 'grid';
        if (insightsSection) insightsSection.style.display = 'block';
        if (exportSection) exportSection.style.display = 'block';
        
        // Hide no data message
        const noDataMessage = document.querySelector('.no-data-message');
        if (noDataMessage) {
            noDataMessage.style.display = 'none';
        }
    }

    calculateStreak(childId) {
        // Simple streak calculation - can be enhanced
        const childCompletions = this.completions.filter(comp => {
            const chore = this.chores.find(c => c.id === comp.chore_id && c.child_id === childId);
            return chore;
        });
        
        return childCompletions.length; // Simplified for now
    }

    calculatePerfectDays(childId, startDate, endDate) {
        const childChores = this.chores.filter(chore => chore.child_id === childId);
        const childCompletions = this.completions.filter(comp => {
            const chore = childChores.find(c => c.id === comp.chore_id);
            if (!chore) return false;
            
            // Convert week_start + day_of_week to a proper date
            const weekStart = new Date(comp.week_start);
            const dayOffset = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(comp.day_of_week);
            const compDate = new Date(weekStart);
            compDate.setDate(weekStart.getDate() + dayOffset);
            
            return compDate >= startDate && compDate <= endDate;
        });
        
        // Group completions by date
        const completionsByDate = {};
        childCompletions.forEach(comp => {
            const weekStart = new Date(comp.week_start);
            const dayOffset = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(comp.day_of_week);
            const compDate = new Date(weekStart);
            compDate.setDate(weekStart.getDate() + dayOffset);
            const date = compDate.toDateString();
            if (!completionsByDate[date]) completionsByDate[date] = 0;
            completionsByDate[date]++;
        });
        
        // Count perfect days (all chores completed)
        let perfectDays = 0;
        Object.values(completionsByDate).forEach(count => {
            if (count >= childChores.length) perfectDays++;
        });
        
        return perfectDays;
    }

    initializeCharts() {
        this.createProgressChart();
        this.createComparisonChart();
        this.createActivityChart();
    }

    createProgressChart() {
        const ctx = document.getElementById('progress-chart');
        if (!ctx) return;
        
        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.error('Chart.js not loaded');
            return;
        }
        
        const labels = this.analyticsMetrics?.map(m => m.childName) || [];
        const data = this.analyticsMetrics?.map(m => m.completionRate) || [];
        
        // Don't create chart if no data
        if (labels.length === 0 || data.every(d => d === 0)) {
            return;
        }
        
        this.progressChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Completion Rate (%)',
                    data,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
    }

    createComparisonChart() {
        const ctx = document.getElementById('comparison-chart');
        if (!ctx) return;
        
        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.error('Chart.js not loaded');
            return;
        }
        
        const labels = this.analyticsMetrics?.map(m => m.childName) || [];
        const earningsData = this.analyticsMetrics?.map(m => m.totalEarnings / 100) || [];
        const completionsData = this.analyticsMetrics?.map(m => m.totalCompletions) || [];
        
        // Don't create chart if no data
        if (labels.length === 0 || (earningsData.every(d => d === 0) && completionsData.every(d => d === 0))) {
            return;
        }
        
        this.comparisonChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Earnings ($)',
                    data: earningsData,
                    backgroundColor: '#10b981',
                    yAxisID: 'y'
                }, {
                    label: 'Completions',
                    data: completionsData,
                    backgroundColor: '#667eea',
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Earnings ($)'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Completions'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                }
            }
        });
    }

    createActivityChart() {
        const ctx = document.getElementById('activity-chart');
        if (!ctx) return;
        
        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.error('Chart.js not loaded');
            return;
        }
        
        // Generate daily activity data
        const days = this.analyticsData?.days || 30;
        const labels = [];
        const data = [];
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            labels.push(this.formatShortDate(date));
            
            // Count completions for this day
            const dayCompletions = this.completions.filter(comp => {
                const weekStart = new Date(comp.week_start);
                const dayOffset = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(comp.day_of_week);
                const compDate = new Date(weekStart);
                compDate.setDate(weekStart.getDate() + dayOffset);
                return compDate.toDateString() === date.toDateString();
            });
            data.push(dayCompletions.length);
        }
        
        // Don't create chart if no activity
        if (data.every(d => d === 0)) {
            return;
        }
        
        this.activityChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Daily Completions',
                    data,
                    backgroundColor: '#f59e0b',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    generateInsights() {
        if (!this.analyticsMetrics || !this.familyMetrics) return;
        
        const insightsGrid = document.getElementById('insights-grid');
        if (!insightsGrid) return;
        
        // Check if we have any meaningful data
        const hasData = this.analyticsMetrics.some(m => m.totalCompletions > 0);
        if (!hasData) {
            insightsGrid.innerHTML = '';
            return;
        }
        
        const insights = [];
        
        // Best performer
        const bestPerformer = this.analyticsMetrics.reduce((best, current) => 
            current.completionRate > best.completionRate ? current : best
        );
        insights.push({
            icon: '🏆',
            title: 'Top Performer',
            description: `${bestPerformer.childName} leads with ${bestPerformer.completionRate}% completion rate!`,
            type: 'positive'
        });
        
        // Most earnings
        const topEarner = this.analyticsMetrics.reduce((best, current) => 
            current.totalEarnings > best.totalEarnings ? current : best
        );
        insights.push({
            icon: '💰',
            title: 'Highest Earner',
            description: `${topEarner.childName} earned ${this.formatCents(topEarner.totalEarnings)}!`,
            type: 'positive'
        });
        
        // Streak insight
        if (this.familyMetrics.bestStreak > 5) {
            insights.push({
                icon: '🔥',
                title: 'Amazing Streak',
                description: `Your family has a ${this.familyMetrics.bestStreak}-day streak!`,
                type: 'positive'
            });
        }
        
        // Perfect days insight
        if (this.familyMetrics.totalPerfectDays > 0) {
            insights.push({
                icon: '⭐',
                title: 'Perfect Days',
                description: `${this.familyMetrics.totalPerfectDays} perfect days this period!`,
                type: 'positive'
            });
        }
        
        // Areas for improvement
        const lowestPerformer = this.analyticsMetrics.reduce((worst, current) => 
            current.completionRate < worst.completionRate ? current : worst
        );
        if (lowestPerformer.completionRate < 50) {
            insights.push({
                icon: '📈',
                title: 'Room for Growth',
                description: `${lowestPerformer.childName} could use some encouragement.`,
                type: 'neutral'
            });
        }
        
        // Render insights
        insightsGrid.innerHTML = insights.map(insight => `
            <div class="insight-card ${insight.type}">
                <div class="insight-icon">${insight.icon}</div>
                <div class="insight-title">${insight.title}</div>
                <div class="insight-description">${insight.description}</div>
            </div>
        `).join('');
    }

    setupAnalyticsHandlers() {
        // Date range selector
        const dateRangeSelect = document.getElementById('analytics-date-range');
        if (dateRangeSelect) {
            dateRangeSelect.addEventListener('change', async () => {
                await this.loadAnalyticsData();
                this.updateAnalyticsCards();
                this.updateCharts();
                this.generateInsights();
            });
        }
        
        // Export buttons
        const exportPdfBtn = document.getElementById('export-pdf');
        if (exportPdfBtn) {
            exportPdfBtn.addEventListener('click', () => this.exportPDF());
        }
        
        const exportCsvBtn = document.getElementById('export-csv');
        if (exportCsvBtn) {
            exportCsvBtn.addEventListener('click', () => this.exportCSV());
        }
        
        const exportWeeklyBtn = document.getElementById('export-weekly');
        if (exportWeeklyBtn) {
            exportWeeklyBtn.addEventListener('click', () => this.exportWeekly());
        }
    }

    updateCharts() {
        if (this.progressChart) {
            this.progressChart.destroy();
            this.createProgressChart();
        }
        if (this.comparisonChart) {
            this.comparisonChart.destroy();
            this.createComparisonChart();
        }
        if (this.activityChart) {
            this.activityChart.destroy();
            this.createActivityChart();
        }
    }

    async exportPDF() {
        try {
            // Check if jsPDF is available
            if (typeof window.jspdf === 'undefined') {
                this.showToast('PDF library not loaded. Please refresh the page.', 'error');
                return;
            }
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Get family data
            const children = this.children;
            const chores = this.chores;
            const completions = await this.apiClient.getChoreCompletions();
            const weekStart = this.apiClient.getWeekStart();
            
            // Header
            doc.setFontSize(20);
            doc.text('ChoreStar Family Report', 20, 30);
            doc.setFontSize(12);
            doc.text(`Generated on ${this.formatDate(new Date())}`, 20, 40);
            doc.text(`Week of ${this.formatDate(weekStart)}`, 20, 50);
            
            let yPosition = 70;
            
            // Family Overview
            doc.setFontSize(16);
            doc.text('Family Overview', 20, yPosition);
            yPosition += 15;
            
            doc.setFontSize(10);
            doc.text(`Total Children: ${children.length}`, 20, yPosition);
            yPosition += 10;
            doc.text(`Total Chores: ${chores.length}`, 20, yPosition);
            yPosition += 10;
            doc.text(`Total Completions This Week: ${completions.filter(c => c.week_start === weekStart.toISOString().split('T')[0]).length}`, 20, yPosition);
            yPosition += 20;
            
            // Individual Child Reports
            for (const child of children) {
                // Check if we need a new page
                if (yPosition > 250) {
                    doc.addPage();
                    yPosition = 30;
                }
                
                const childChores = chores.filter(c => c.child_id === child.id);
                const childCompletions = completions.filter(c => 
                    childChores.some(chore => chore.id === c.chore_id) && 
                    c.week_start === weekStart.toISOString().split('T')[0]
                );
                
                const totalPossibleCompletions = childChores.length * 7;
                const completionRate = totalPossibleCompletions > 0 
                    ? Math.round((childCompletions.length / totalPossibleCompletions) * 100)
                    : 0;
                
                const totalEarnings = childCompletions.reduce((sum, comp) => {
                    const chore = childChores.find(c => c.id === comp.chore_id);
                    return sum + (chore ? chore.reward_cents : 0);
                }, 0);
                
                // Child header
                doc.setFontSize(14);
                doc.text(`${child.name} (Age ${child.age})`, 20, yPosition);
                yPosition += 15;
                
                // Child stats
                doc.setFontSize(10);
                doc.text(`Completion Rate: ${completionRate}%`, 20, yPosition);
                yPosition += 8;
                doc.text(`Total Completions: ${childCompletions.length}`, 20, yPosition);
                yPosition += 8;
                doc.text(`Total Earnings: $${(totalEarnings / 100).toFixed(2)}`, 20, yPosition);
                yPosition += 8;
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);
                doc.text(`Perfect Days: ${this.calculatePerfectDays(child.id, weekStart, weekEnd)}`, 20, yPosition);
                yPosition += 15;
                
                // Chore breakdown
                if (childChores.length > 0) {
                    doc.text('Chore Breakdown:', 20, yPosition);
                    yPosition += 8;
                    
                    for (const chore of childChores) {
                        const choreCompletions = childCompletions.filter(c => c.chore_id === chore.id);
                        doc.text(`• ${chore.name}: ${choreCompletions.length}/7 days ($${(chore.reward_cents / 100).toFixed(2)} each)`, 30, yPosition);
                        yPosition += 6;
                    }
                }
                
                yPosition += 15;
            }
            
            // Footer
            doc.setFontSize(8);
            doc.text('Generated by ChoreStar - Making chores fun for the whole family!', 20, 280);
            
            // Save the PDF
            const fileName = `chorestar-report-${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);
            
            this.showToast('PDF report exported successfully!', 'success');
            
        } catch (error) {
            console.error('Error exporting PDF:', error);
            this.showToast('Failed to export PDF report', 'error');
        }
    }

    exportCSV() {
        if (!this.analyticsMetrics) return;
        
        const csvContent = [
            ['Child Name', 'Completion Rate (%)', 'Total Completions', 'Total Earnings ($)', 'Streak (days)', 'Perfect Days'],
            ...this.analyticsMetrics.map(m => [
                m.childName,
                m.completionRate,
                m.totalCompletions,
                (m.totalEarnings / 100).toFixed(2),
                m.streak,
                m.perfectDays
            ])
        ].map(row => row.join(',')).join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chorestar-analytics-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        this.showToast('CSV exported successfully!', 'success');
    }

    async exportWeekly() {
        try {
            // Get current week's data
            const weekStart = this.apiClient.getWeekStart();
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            
            // Get children and chores
            const children = this.children;
            const chores = this.chores;
            const completions = await this.apiClient.getChoreCompletions();
            
            // Filter completions for current week
            const weekCompletions = completions.filter(comp => 
                comp.week_start === weekStart.toISOString().split('T')[0]
            );
            
            // Calculate weekly stats for each child
            const weeklyStats = children.map(child => {
                const childChores = chores.filter(c => c.child_id === child.id);
                const childCompletions = weekCompletions.filter(c => 
                    childChores.some(chore => chore.id === c.chore_id)
                );
                
                const totalPossibleCompletions = childChores.length * 7; // 7 days
                const completionRate = totalPossibleCompletions > 0 
                    ? Math.round((childCompletions.length / totalPossibleCompletions) * 100)
                    : 0;
                
                const totalEarnings = childCompletions.reduce((sum, comp) => {
                    const chore = childChores.find(c => c.id === comp.chore_id);
                    return sum + (chore ? chore.reward_cents : 0);
                }, 0);
                
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);
                const perfectDays = this.calculatePerfectDays(child.id, weekStart, weekEnd);
                
                return {
                    name: child.name,
                    age: child.age,
                    completionRate,
                    totalCompletions: childCompletions.length,
                    totalEarnings: (totalEarnings / 100).toFixed(2),
                    perfectDays,
                    chores: childChores.map(chore => ({
                        name: chore.name,
                        completions: childCompletions.filter(c => c.chore_id === chore.id).length,
                        earnings: (chore.reward_cents / 100).toFixed(2)
                    }))
                };
            });
            
            // Create CSV content
            const csvContent = [
                ['Weekly Summary Report', `Week of ${this.formatDate(weekStart)}`],
                [''],
                ['Child Name', 'Age', 'Completion Rate (%)', 'Total Completions', 'Total Earnings ($)', 'Perfect Days'],
                ...weeklyStats.map(child => [
                    child.name,
                    child.age,
                    child.completionRate,
                    child.totalCompletions,
                    child.totalEarnings,
                    child.perfectDays
                ]),
                [''],
                ['Detailed Chore Breakdown'],
                ['Child', 'Chore', 'Completions', 'Earnings ($)'],
                ...weeklyStats.flatMap(child => 
                    child.chores.map(chore => [
                        child.name,
                        chore.name,
                        chore.completions,
                        chore.earnings
                    ])
                )
            ].map(row => row.join(',')).join('\n');
            
            // Download CSV
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `chorestar-weekly-summary-${weekStart.toISOString().split('T')[0]}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
            
            this.showToast('Weekly summary exported successfully!', 'success');
            
        } catch (error) {
            console.error('Error exporting weekly summary:', error);
            this.showToast('Failed to export weekly summary', 'error');
        }
    }

    // Interactive Chore Card Methods (Premium Features)
    addSwipeGestures(cell, childChores, childId) {
        let startX = 0;
        let startY = 0;
        let currentX = 0;
        let isSwiping = false;
        let swipeThreshold = 50;
        
        // Add swipe feedback element
        const feedback = document.createElement('div');
        feedback.className = 'swipe-feedback';
        cell.appendChild(feedback);
        
        const handleStart = (e) => {
            const touch = e.touches ? e.touches[0] : e;
            startX = touch.clientX;
            startY = touch.clientY;
            currentX = startX;
            isSwiping = false;
            cell.classList.add('swiping');
        };
        
        const handleMove = (e) => {
            if (!startX) return;
            
            const touch = e.touches ? e.touches[0] : e;
            currentX = touch.clientX;
            const deltaX = currentX - startX;
            const deltaY = Math.abs(touch.clientY - startY);
            
            // Only handle horizontal swipes
            if (Math.abs(deltaX) > 10 && deltaY < 50) {
                e.preventDefault();
                isSwiping = true;
                
                // Visual feedback
                if (deltaX > 0) {
                    cell.classList.add('swipe-complete');
                    cell.classList.remove('swipe-undo');
                    feedback.textContent = '✅';
                    feedback.className = 'swipe-feedback show complete';
                } else {
                    cell.classList.add('swipe-undo');
                    cell.classList.remove('swipe-complete');
                    feedback.textContent = '↩️';
                    feedback.className = 'swipe-feedback show undo';
                }
            }
        };
        
        const handleEnd = (e) => {
            if (!isSwiping) {
                cell.classList.remove('swiping');
                return;
            }
            
            const deltaX = currentX - startX;
            
            if (Math.abs(deltaX) > swipeThreshold) {
                const choreId = cell.dataset.choreId;
                const day = cell.dataset.day;
                const chore = childChores.find(c => c.id === parseInt(choreId));
                
                if (chore) {
                    if (deltaX > 0) {
                        // Swipe right to complete
                        this.handleChoreCellClick(cell, chore, childId, day);
                    } else {
                        // Swipe left to undo
                        this.handleChoreCellClick(cell, chore, childId, day);
                    }
                }
            }
            
            // Reset
            setTimeout(() => {
                cell.classList.remove('swiping', 'swipe-complete', 'swipe-undo');
                feedback.className = 'swipe-feedback';
            }, 300);
            
            startX = 0;
            startY = 0;
            isSwiping = false;
        };
        
        // Touch events for mobile
        cell.addEventListener('touchstart', handleStart, { passive: false });
        cell.addEventListener('touchmove', handleMove, { passive: false });
        cell.addEventListener('touchend', handleEnd);
        
        // Mouse events for desktop
        cell.addEventListener('mousedown', handleStart);
        cell.addEventListener('mousemove', handleMove);
        cell.addEventListener('mouseup', handleEnd);
        cell.addEventListener('mouseleave', handleEnd);
    }

    addChoreRowDragAndDrop(card, childChores, childId) {
        const table = card.querySelector('.chore-grid-table');
        if (!table) return;
        
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            row.draggable = true;
            row.style.cursor = 'grab';
            
            row.addEventListener('dragstart', (e) => {
                row.classList.add('dragging');
                row.style.opacity = '0.5';
                
                // Create drag image
                const dragImage = row.cloneNode(true);
                dragImage.style.opacity = '0.8';
                dragImage.style.backgroundColor = 'white';
                dragImage.style.border = '2px solid var(--primary)';
                dragImage.style.borderRadius = '8px';
                dragImage.style.padding = '8px';
                dragImage.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                document.body.appendChild(dragImage);
                e.dataTransfer.setDragImage(dragImage, 0, 0);
                
                setTimeout(() => {
                    document.body.removeChild(dragImage);
                }, 0);
            });
            
            row.addEventListener('dragend', () => {
                row.classList.remove('dragging');
                row.style.opacity = '1';
                // Remove drag-over class from all rows
                rows.forEach(r => r.classList.remove('drag-over'));
            });
            
            row.addEventListener('dragover', (e) => {
                e.preventDefault();
                
                const draggedRow = document.querySelector('.dragging');
                if (!draggedRow || draggedRow === row) return;
                
                const rect = row.getBoundingClientRect();
                const centerY = rect.top + rect.height / 2;
                
                if (e.clientY < centerY) {
                    row.classList.add('drag-over');
                } else {
                    row.classList.remove('drag-over');
                }
            });
            
            row.addEventListener('drop', (e) => {
                e.preventDefault();
                row.classList.remove('drag-over');
                
                const draggedRow = document.querySelector('.dragging');
                if (draggedRow && draggedRow !== row) {
                    // Get chore IDs from the rows
                    const draggedChoreId = this.getChoreIdFromRow(draggedRow);
                    const targetChoreId = this.getChoreIdFromRow(row);
                    
                    if (draggedChoreId && targetChoreId && draggedChoreId !== targetChoreId) {
                        this.reorderChoresById(draggedChoreId, targetChoreId, childId);
                    }
                }
            });
            
            row.addEventListener('dragleave', () => {
                row.classList.remove('drag-over');
            });
        });
    }
    
    getChoreIdFromRow(row) {
        // Get the first chore cell in the row to find the chore ID
        const firstCell = row.querySelector('.chore-cell');
        return firstCell ? firstCell.dataset.choreId : null;
    }
    
    reorderChoresById(draggedChoreId, targetChoreId, childId) {
        try {
            const childChores = this.chores.filter(c => c.child_id === childId);
            
            const draggedChore = childChores.find(c => c.id == draggedChoreId);
            const targetChore = childChores.find(c => c.id == targetChoreId);
            
            if (!draggedChore || !targetChore) {
                return;
            }
            
            // Get current order indices
            const draggedIndex = childChores.findIndex(c => c.id == draggedChoreId);
            const targetIndex = childChores.findIndex(c => c.id == targetChoreId);
            
            // Reorder the chores array
            const reorderedChores = [...childChores];
            const [movedChore] = reorderedChores.splice(draggedIndex, 1);
            reorderedChores.splice(targetIndex, 0, movedChore);
            
            // Update the chores array with new order
            const otherChores = this.chores.filter(c => c.child_id !== childId);
            this.chores = [...otherChores, ...reorderedChores];
            
            // Re-render the chore grid to reflect new order
            this.renderChildrenContent();
            
            // Show success message
            this.showToast('Chores reordered!', 'success');
            
        } catch (error) {
            console.error('Error reordering chores:', error);
            this.showToast('Failed to reorder chores', 'error');
        }
    }

    addDragAndDrop(cell, childChores, childId) {
        cell.draggable = true;
        
        cell.addEventListener('dragstart', (e) => {
            cell.classList.add('dragging');
            
            // Create drag image
            const dragImage = cell.cloneNode(true);
            dragImage.style.opacity = '0.5';
            document.body.appendChild(dragImage);
            e.dataTransfer.setDragImage(dragImage, 0, 0);
            
            setTimeout(() => {
                document.body.removeChild(dragImage);
            }, 0);
        });
        
        cell.addEventListener('dragend', () => {
            cell.classList.remove('dragging');
            // Remove drag-over class from all cells
            document.querySelectorAll('.chore-cell').forEach(c => c.classList.remove('drag-over'));
        });
        
        cell.addEventListener('dragover', (e) => {
            e.preventDefault();
            
            const draggedCell = document.querySelector('.dragging');
            if (!draggedCell || draggedCell === cell) return;
            
            const rect = cell.getBoundingClientRect();
            const centerY = rect.top + rect.height / 2;
            
            if (e.clientY < centerY) {
                cell.classList.add('drag-over');
            } else {
                cell.classList.remove('drag-over');
            }
        });
        
        cell.addEventListener('drop', (e) => {
            e.preventDefault();
            cell.classList.remove('drag-over');
            
            const draggedCell = document.querySelector('.dragging');
            if (draggedCell && draggedCell !== cell) {
                // Reorder chores - implement local reordering
                this.reorderChores(draggedCell, cell);
            }
        });
        
        cell.addEventListener('dragleave', () => {
            cell.classList.remove('drag-over');
        });
    }
    
    populateEditChoreReorderSection(childId) {
        const reorderSection = document.getElementById('edit-chore-reorder-section');
        const reorderList = document.getElementById('edit-chore-reorder-list');
        
        if (!reorderSection || !reorderList) return;
        
        // Get chores for this child
        const childChores = this.chores.filter(c => c.child_id === childId);
        
        if (childChores.length <= 1) {
            // Hide section if there's only one or no chores
            reorderSection.style.display = 'none';
            return;
        }
        
        // Show section and populate with chores
        reorderSection.style.display = 'block';
        
        let html = '';
        childChores.forEach(chore => {
            html += `
                <div class="chore-reorder-item" data-chore-id="${chore.id}">
                    <span class="chore-reorder-icon">${chore.icon || '📝'}</span>
                    <div class="chore-reorder-details">
                        <div class="chore-reorder-name">${chore.name}</div>
                        <div class="chore-reorder-category">${chore.category || 'General'}</div>
                    </div>
                    <span class="chore-reorder-handle">⋮⋮</span>
                </div>
            `;
        });
        
        reorderList.innerHTML = html;
        
        // Add drag and drop functionality to the reorder items
        this.addEditModalDragAndDrop(reorderList, childId);
    }
    
    addEditModalDragAndDrop(container, childId) {
        const items = container.querySelectorAll('.chore-reorder-item');
        
        items.forEach(item => {
            item.draggable = true;
            
            item.addEventListener('dragstart', (e) => {
                item.classList.add('dragging');
                
                // Create drag image
                const dragImage = item.cloneNode(true);
                dragImage.style.opacity = '0.8';
                dragImage.style.backgroundColor = 'white';
                dragImage.style.border = '2px solid var(--primary)';
                dragImage.style.borderRadius = '8px';
                dragImage.style.padding = '8px';
                dragImage.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                document.body.appendChild(dragImage);
                e.dataTransfer.setDragImage(dragImage, 0, 0);
                
                setTimeout(() => {
                    document.body.removeChild(dragImage);
                }, 0);
            });
            
            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                // Remove drag-over class from all items
                items.forEach(i => i.classList.remove('drag-over'));
            });
            
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                
                const draggedItem = container.querySelector('.dragging');
                if (!draggedItem || draggedItem === item) return;
                
                const rect = item.getBoundingClientRect();
                const centerY = rect.top + rect.height / 2;
                
                if (e.clientY < centerY) {
                    item.classList.add('drag-over');
                } else {
                    item.classList.remove('drag-over');
                }
            });
            
            item.addEventListener('drop', (e) => {
                e.preventDefault();
                item.classList.remove('drag-over');
                
                const draggedItem = container.querySelector('.dragging');
                if (draggedItem && draggedItem !== item) {
                    const draggedChoreId = draggedItem.dataset.choreId;
                    const targetChoreId = item.dataset.choreId;
                    
                    if (draggedChoreId && targetChoreId && draggedChoreId !== targetChoreId) {
                        this.reorderChoresById(draggedChoreId, targetChoreId, childId);
                        // Re-populate the list to reflect the new order
                        this.populateEditChoreReorderSection(childId);
                    }
                }
            });
            
            item.addEventListener('dragleave', () => {
                item.classList.remove('drag-over');
            });
        });
    }

    // Chore reordering functionality
    reorderChores(draggedCell, targetCell) {
        try {
            // Get the chore IDs from the cells
            const draggedChoreId = draggedCell.dataset.choreId;
            const targetChoreId = targetCell.dataset.choreId;
            
            if (!draggedChoreId || !targetChoreId || draggedChoreId === targetChoreId) {
                return;
            }
            
            // Find the chores in the current child's chore list
            const currentChildId = this.activeChildId;
            const childChores = this.chores.filter(c => c.child_id === currentChildId);
            
            const draggedChore = childChores.find(c => c.id === draggedChoreId);
            const targetChore = childChores.find(c => c.id === targetChoreId);
            
            if (!draggedChore || !targetChore) {
                return;
            }
            
            // Get current order indices
            const draggedIndex = childChores.findIndex(c => c.id === draggedChoreId);
            const targetIndex = childChores.findIndex(c => c.id === targetChoreId);
            
            // Reorder the chores array
            const reorderedChores = [...childChores];
            const [movedChore] = reorderedChores.splice(draggedIndex, 1);
            reorderedChores.splice(targetIndex, 0, movedChore);
            
            // Update the chores array with new order
            const otherChores = this.chores.filter(c => c.child_id !== currentChildId);
            this.chores = [...otherChores, ...reorderedChores];
            
            // Re-render the chore grid to reflect new order
            this.renderChildrenContent();
            
            // Show success message
            this.showToast('Chores reordered!', 'success');
            
            // TODO: In the future, save the new order to the backend
            // await this.apiClient.updateChoreOrder(currentChildId, reorderedChores.map(c => c.id));
            
        } catch (error) {
            console.error('Error reordering chores:', error);
            this.showToast('Failed to reorder chores', 'error');
        }
    }

    // New Features and Changelog System
    checkNewFeatures() {
        try {
            const lastSeenVersion = localStorage.getItem('chorestar_last_seen_version');
            const currentVersion = '2025.1.0'; // Current version with new features
            
            // If user hasn't seen this version yet, show notification badge
            if (!lastSeenVersion || lastSeenVersion !== currentVersion) {
                // Show the notification badges
                this.showNewFeaturesBadge();
            } else {
                // Hide the notification badges if already seen
                this.hideNewFeaturesBadge();
            }
        } catch (error) {
            console.error('Error checking new features:', error);
        }
    }

    showNewFeaturesBadge() {
        const desktopBadge = document.getElementById('whats-new-badge');
        const mobileBadge = document.getElementById('mobile-whats-new-badge');
        if (desktopBadge) desktopBadge.style.display = 'block';
        if (mobileBadge) mobileBadge.style.display = 'block';
    }

    hideNewFeaturesBadge() {
        const desktopBadge = document.getElementById('whats-new-badge');
        const mobileBadge = document.getElementById('mobile-whats-new-badge');
        if (desktopBadge) desktopBadge.style.display = 'none';
        if (mobileBadge) mobileBadge.style.display = 'none';
    }

    markNewFeaturesAsSeen() {
        const currentVersion = '2025.1.0';
        localStorage.setItem('chorestar_last_seen_version', currentVersion);
        this.hideNewFeaturesBadge();
    }

    // Method to manually show new features (for testing or user request)
    showNewFeatures() {
        this.showModal('new-features-modal');
    }

    // Method to reset version tracking (for testing)
    resetVersionTracking() {
        localStorage.removeItem('chorestar_last_seen_version');
        this.showToast('Version tracking reset. New features will show on next login.', 'info');
    }

    // Changelog data for future updates
    getChangelogData() {
        return {
            '2025.1.0': {
                version: '2025.1.0',
                date: 'January 2025',
                title: 'Major Feature Update',
                features: [
                    {
                        icon: '📊',
                        title: 'Weekly Summary Export',
                        description: 'Export detailed weekly reports showing completion rates, earnings, and perfect days for each child.'
                    },
                    {
                        icon: '📄',
                        title: 'PDF Reports',
                        description: 'Generate professional PDF reports of your family\'s chore progress.'
                    },
                    {
                        icon: '🔄',
                        title: 'Chore Reordering',
                        description: 'Drag and drop to reorder chores for each child.'
                    },
                    {
                        icon: '📧',
                        title: 'Enhanced Contact Support',
                        description: 'Improved contact form with better email integration.'
                    },
                    {
                        icon: '🎨',
                        title: 'New Icon Picker',
                        description: 'Choose from 50+ fun icons for chores!'
                    }
                ]
            }
            // Future versions can be added here
        };
    }

    addQuickEdit(cell, childChores, childId) {
        let longPressTimer = null;
        let isLongPressed = false;
        
        const handleStart = () => {
            longPressTimer = setTimeout(() => {
                isLongPressed = true;
                cell.classList.add('quick-edit');
                
                // Show quick edit menu
                this.showQuickEditMenu(cell, childChores, childId);
            }, 500);
        };
        
        const handleEnd = () => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
            
            if (isLongPressed) {
                setTimeout(() => {
                    cell.classList.remove('quick-edit');
                    isLongPressed = false;
                }, 300);
            }
        };
        
        // Touch events
        cell.addEventListener('touchstart', handleStart);
        cell.addEventListener('touchend', handleEnd);
        cell.addEventListener('touchcancel', handleEnd);
        
        // Mouse events
        cell.addEventListener('mousedown', handleStart);
        cell.addEventListener('mouseup', handleEnd);
        cell.addEventListener('mouseleave', handleEnd);
    }

    showQuickEditMenu(cell, childChores, childId) {
        const choreId = cell.dataset.choreId;
        const chore = childChores.find(c => c.id === parseInt(choreId));
        
        if (!chore) return;
        
        // Create quick edit menu
        const menu = document.createElement('div');
        menu.className = 'quick-edit-menu';
        menu.innerHTML = `
            <div class="quick-edit-item" data-action="edit">
                <span>✏️</span> Edit
            </div>
            <div class="quick-edit-item" data-action="delete">
                <span>🗑️</span> Delete
            </div>
            <div class="quick-edit-item" data-action="duplicate">
                <span>📋</span> Duplicate
            </div>
        `;
        
        // Position menu
        const rect = cell.getBoundingClientRect();
        menu.style.position = 'absolute';
        menu.style.top = `${rect.bottom + 5}px`;
        menu.style.left = `${rect.left}px`;
        menu.style.zIndex = '1000';
        
        // Add to DOM
        cell.appendChild(menu);
        
        // Handle menu actions
        menu.addEventListener('click', (e) => {
            const action = e.target.closest('.quick-edit-item')?.dataset.action;
            
            switch (action) {
                case 'edit':
                    this.openEditChoreModal(chore.id, chore.name, chore.reward, chore.notes);
                    break;
                case 'delete':
                    this.deleteChore(chore.id);
                    break;
                case 'duplicate':
                    this.duplicateChore(chore);
                    break;
            }
            
            menu.remove();
        });
        
        // Auto-remove menu after 3 seconds
        setTimeout(() => {
            if (menu.parentNode) {
                menu.remove();
            }
        }, 3000);
        
        // Remove menu when clicking outside
        document.addEventListener('click', function removeMenu(e) {
            if (!menu.contains(e.target) && !cell.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', removeMenu);
            }
        });
    }

    async duplicateChore(chore) {
        try {
            const newChore = {
                ...chore,
                name: `${chore.name} (Copy)`,
                id: undefined
            };
            
            const result = await this.apiClient.addChore(newChore);
            if (result.success) {
                this.showToast('Chore duplicated successfully!', 'success');
                await this.loadChores();
                this.renderChildren();
            } else {
                this.showToast('Failed to duplicate chore.', 'error');
            }
        } catch (error) {
            console.error('Error duplicating chore:', error);
            this.showToast('Error duplicating chore.', 'error');
        }
    }

    // 1. Fix the missing updateChildProgressOptimistically method
    updateChildProgressOptimistically(childId, changeInCompletions) {
        const childCard = document.querySelector(`.child-content[data-child-id="${childId}"]`);
        if (!childCard) return;

        const childChores = this.chores.filter(chore => chore.child_id === childId);
        const childCompletions = this.completions.filter(comp => 
            childChores.some(chore => chore.id === comp.chore_id)
        );

        // Calculate updated progress
        const progress = this.calculateChildProgress(childId, childChores, childCompletions);
        
        // Update progress elements immediately
        this.updateProgressElements(childCard, progress);
    }

    // 2. Add the missing updateProgressSection method
    updateProgressSection(childId, childChores, childCompletions, childCard) {
        if (!childCard) {
            childCard = document.querySelector(`.child-content[data-child-id="${childId}"]`);
        }
        if (!childCard) return;

        const progress = this.calculateChildProgress(childId, childChores, childCompletions);
        this.updateProgressElements(childCard, progress);
    }

    // 3. Create a helper method to update progress elements
    updateProgressElements(childCard, progress) {
        const progressFill = childCard.querySelector('.progress-fill');
        const progressStats = childCard.querySelector('.progress-stats');
        const starsContainer = childCard.querySelector('.stars-container');
        const earningsAmount = childCard.querySelector('.earnings-amount');
        
        if (progressFill) {
            progressFill.style.width = `${progress.completionPercentage}%`;
        }
        
        if (progressStats) {
            progressStats.innerHTML = `<span>${progress.completionPercentage}% complete</span>`;
        }
        
        if (starsContainer) {
            const stars = this.calculateStars(progress.completionPercentage);
            starsContainer.innerHTML = stars;
        }
        
        if (earningsAmount) {
            earningsAmount.textContent = this.formatCents(progress.totalEarnings);
        }
    }

    // 4. IMPROVED: Better progress calculation that counts perfect days correctly
    calculateChildProgress(childId, childChores, childCompletions) {
        if (childChores.length === 0) {
            return {
                completionPercentage: 0,
                totalEarnings: 0,
                completedDays: 0,
                totalDays: 7
            };
        }

        // Get current week completions only
        const currentWeekStart = this.currentWeekStart;
        const weekCompletions = childCompletions.filter(comp => {
            return comp.week_start === currentWeekStart;
        });

        // Count completions per day (0-6, where 0 = Sunday)
        const completionsPerDay = new Map();
        weekCompletions.forEach(comp => {
            const day = comp.day_of_week;
            if (!completionsPerDay.has(day)) {
                completionsPerDay.set(day, 0);
            }
            completionsPerDay.set(day, completionsPerDay.get(day) + 1);
        });

        // Count perfect days (days where ALL chores are completed)
        let perfectDays = 0;
        
        for (let day = 0; day < 7; day++) {
            const completionsForDay = completionsPerDay.get(day) || 0;
            const isPerfectDay = completionsForDay >= childChores.length;
            if (isPerfectDay) {
                perfectDays++;
            }
        }

        // Calculate percentage based on perfect days
        const completionPercentage = Math.round((perfectDays / 7) * 100);

        // Calculate earnings
        const dailyRewardCents = this.familySettings?.daily_reward_cents || 7;
        const weeklyBonusCents = this.familySettings?.weekly_bonus_cents || 0;
        
        const daysWithAnyCompletions = completionsPerDay.size;
        const totalEarnings = (daysWithAnyCompletions * dailyRewardCents) + 
            (perfectDays === 7 ? weeklyBonusCents : 0);

        console.log(`Progress calculated for child ${childId}:`, {
            perfectDays,
            completionPercentage,
            totalChores: childChores.length,
            completionsPerDay: Object.fromEntries(completionsPerDay)
        });

        return {
            completionPercentage,
            totalEarnings,
            completedDays: perfectDays,
            totalDays: 7
        };
    }

    calculateStars(percentage) {
        // Each perfect day = 1 star (since 7 perfect days = 7 stars = 100%)
        // So percentage / 14.29 = number of stars (100/7 = 14.29 per star)
        // Use Math.ceil to ensure we don't lose stars due to rounding
        const starCount = Math.ceil(percentage / 14.29);
        const clampedStars = Math.max(0, Math.min(7, starCount)); // Ensure 0-7 stars
        
        let stars = '';
        
        // Add filled stars
        for (let i = 0; i < clampedStars; i++) {
            stars += '⭐';
        }
        
        // Add empty stars
        for (let i = clampedStars; i < 7; i++) {
            stars += '☆';
        }
        
        return stars;
    }

    calculateStarsFromPerfectDays(perfectDays) {
        // Direct calculation: each perfect day = 1 star
        const clampedStars = Math.max(0, Math.min(7, perfectDays)); // Ensure 0-7 stars
        
        let stars = '';
        
        // Add filled stars
        for (let i = 0; i < clampedStars; i++) {
            stars += '⭐';
        }
        
        // Add empty stars
        for (let i = clampedStars; i < 7; i++) {
            stars += '☆';
        }
        
        return stars;
    }

    formatCents(cents, currency = null) {
        // Use family settings currency if available, otherwise default to USD
        const currencyCode = currency || this.familySettings?.currency_code || 'USD';
        
        try {
            const formatter = new Intl.NumberFormat(this.getLocale(), {
                style: 'currency',
                currency: currencyCode,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
            return formatter.format(cents / 100);
        } catch (error) {
            // Fallback to USD if currency is not supported
            console.warn('Currency not supported, falling back to USD:', currencyCode);
            const formatter = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
            return formatter.format(cents / 100);
        }
    }
    
    getLocale() {
        // Get user's locale from browser or family settings
        return this.familySettings?.locale || navigator.language || 'en-US';
    }
    
    // International Date Formatting Functions
    formatDate(date, options = {}) {
        const locale = this.getLocale();
        const dateFormat = this.familySettings?.date_format || 'auto';
        
        // Handle custom date formats
        if (dateFormat !== 'auto') {
            return this.formatCustomDate(date, dateFormat);
        }
        
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };
        
        const formatOptions = { ...defaultOptions, ...options };
        
        try {
            const dateObj = new Date(date);
            
            // Handle invalid dates
            if (isNaN(dateObj.getTime())) {
                console.warn('Invalid date provided to formatDate:', date);
                return 'Invalid Date';
            }
            
            return dateObj.toLocaleDateString(locale, formatOptions);
        } catch (error) {
            console.warn('Date formatting failed, using fallback:', error);
            try {
                return new Date(date).toLocaleDateString('en-US', formatOptions);
            } catch (fallbackError) {
                console.warn('Fallback date formatting also failed:', fallbackError);
                return 'Invalid Date';
            }
        }
    }
    
    formatCustomDate(date, format) {
        const d = new Date(date);
        
        // Handle invalid dates
        if (isNaN(d.getTime())) {
            console.warn('Invalid date provided to formatCustomDate:', date);
            return 'Invalid Date';
        }
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        
        switch (format) {
            case 'MM/DD/YYYY':
                return `${month}/${day}/${year}`;
            case 'DD/MM/YYYY':
                return `${day}/${month}/${year}`;
            case 'YYYY-MM-DD':
                return `${year}-${month}-${day}`;
            case 'DD.MM.YYYY':
                return `${day}.${month}.${year}`;
            default:
                return this.formatDate(date);
        }
    }
    
    formatTime(date, options = {}) {
        const locale = this.getLocale();
        const defaultOptions = {
            hour: '2-digit',
            minute: '2-digit'
        };
        
        const formatOptions = { ...defaultOptions, ...options };
        
        try {
            const dateObj = new Date(date);
            
            // Handle invalid dates
            if (isNaN(dateObj.getTime())) {
                console.warn('Invalid date provided to formatTime:', date);
                return 'Invalid Time';
            }
            
            return dateObj.toLocaleTimeString(locale, formatOptions);
        } catch (error) {
            console.warn('Time formatting failed, using fallback:', error);
            try {
                return new Date(date).toLocaleTimeString('en-US', formatOptions);
            } catch (fallbackError) {
                console.warn('Fallback time formatting also failed:', fallbackError);
                return 'Invalid Time';
            }
        }
    }
    
    formatDateTime(date, options = {}) {
        const locale = this.getLocale();
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        
        const formatOptions = { ...defaultOptions, ...options };
        
        try {
            return new Date(date).toLocaleString(locale, formatOptions);
        } catch (error) {
            console.warn('DateTime formatting failed, using fallback:', error);
            return new Date(date).toLocaleString('en-US', formatOptions);
        }
    }
    
    formatShortDate(date) {
        // Short format like "Jan 15" or "15 Jan" depending on locale
        const locale = this.getLocale();
        const isUSFormat = locale.startsWith('en-US') || locale.startsWith('en-CA');
        
        const options = {
            month: 'short',
            day: 'numeric'
        };
        
        try {
            return new Date(date).toLocaleDateString(locale, options);
        } catch (error) {
            console.warn('Short date formatting failed, using fallback:', error);
            return new Date(date).toLocaleDateString('en-US', options);
        }
    }
    
    formatWeekLabel(date) {
        // Format week labels like "Jan 15, 2024"
        return this.formatDate(date, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
    
    formatThemeDate(dateStr) {
        // Enhanced theme date formatting with international support
        const [month, day] = dateStr.split('-');
        const date = new Date(2024, parseInt(month) - 1, parseInt(day));
        return this.formatShortDate(date);
    }
    
    formatRelativeDate(date) {
        // Format relative dates like "2 days ago", "Last week"
        const locale = this.getLocale();
        const now = new Date();
        const targetDate = new Date(date);
        const diffTime = now - targetDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return 'Today';
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return weeks === 1 ? 'Last week' : `${weeks} weeks ago`;
        } else {
            return this.formatShortDate(date);
        }
    }

    getCategoryInfo(category) {
        const categories = {
            household_chores: { 
                color: '#3b82f6', 
                label: 'Household Chores', 
                icon: '🏠',
                bgColor: 'rgba(59, 130, 246, 0.1)'
            },
            learning_education: { 
                color: '#8b5cf6', 
                label: 'Learning & Education', 
                icon: '📚',
                bgColor: 'rgba(139, 92, 246, 0.1)'
            },
            physical_activity: { 
                color: '#f97316', 
                label: 'Physical Activity', 
                icon: '🏃',
                bgColor: 'rgba(249, 115, 22, 0.1)'
            },
            creative_time: { 
                color: '#ec4899', 
                label: 'Creative Time', 
                icon: '🎨',
                bgColor: 'rgba(236, 72, 153, 0.1)'
            },
            games_play: { 
                color: '#10b981', 
                label: 'Games & Play', 
                icon: '🎮',
                bgColor: 'rgba(16, 185, 129, 0.1)'
            },
            reading: { 
                color: '#14b8a6', 
                label: 'Reading', 
                icon: '📖',
                bgColor: 'rgba(20, 184, 166, 0.1)'
            },
            family_time: { 
                color: '#f59e0b', 
                label: 'Family Time', 
                icon: '❤️',
                bgColor: 'rgba(245, 158, 11, 0.1)'
            },
            custom: { 
                color: '#6b7280', 
                label: 'Custom', 
                icon: '⚙️',
                bgColor: 'rgba(107, 114, 128, 0.1)'
            }
        };
        return categories[category] || categories.household_chores;
    }

    updateCategoryFilterCount() {
        const countElement = document.getElementById('category-filter-count');
        const headerElement = document.getElementById('category-header');
        const descriptionElement = document.getElementById('category-description');
        
        if (!countElement || !headerElement || !descriptionElement) return;
        
        if (this.categoryFilter === 'all') {
            headerElement.innerHTML = '<span aria-hidden="true">🏠</span> All Activities';
            descriptionElement.textContent = 'View all your family\'s activities and tasks in one place';
            countElement.textContent = `${this.chores.length} total activities`;
        } else {
            const categoryInfo = this.getCategoryInfo(this.categoryFilter);
            const filteredCount = this.chores.filter(chore => chore.category === this.categoryFilter).length;
            
            headerElement.innerHTML = `<span aria-hidden="true">${categoryInfo.icon}</span> ${categoryInfo.label}`;
            descriptionElement.textContent = `Showing ${filteredCount} ${filteredCount === 1 ? 'activity' : 'activities'} in this category`;
            countElement.textContent = `${filteredCount} ${filteredCount === 1 ? 'activity' : 'activities'}`;
        }
    }

    checkAchievements(childId, choreId) {
        // This method checks for achievements when a chore is completed
        // In a full implementation, this would:
        // 1. Check for streak achievements
        // 2. Check for completion milestones
        // 3. Check for perfect day/week achievements
        // 4. Award badges if criteria are met
        
        // For now, we'll just return without doing anything specific
        return;
    }



    // 7. Add smooth progress update method (no table re-rendering)
    updateProgressSmoothly(childId) {
        const childCard = document.querySelector(`.child-content[data-child-id="${childId}"]`);
        if (!childCard) return;

        const childChores = this.chores.filter(chore => chore.child_id === childId);
        const childCompletions = this.completions.filter(comp => 
            childChores.some(chore => chore.id === comp.chore_id)
        );

        // Calculate progress
        const progress = this.calculateChildProgress(childId, childChores, childCompletions);
        
        // Update ONLY the progress elements - don't touch the table
        const progressFill = childCard.querySelector('.progress-fill');
        const progressStats = childCard.querySelector('.progress-stats');
        const starsContainer = childCard.querySelector('.stars-container');
        const earningsAmount = childCard.querySelector('.earnings-amount');
        
        // Use requestAnimationFrame for smooth updates
        requestAnimationFrame(() => {
            if (progressFill) {
                progressFill.style.transition = 'width 0.3s ease-out';
                progressFill.style.width = `${progress.completionPercentage}%`;
            }
            
            if (progressStats) {
                progressStats.innerHTML = `<span>${progress.completionPercentage}% complete</span>`;
            }
            
            if (starsContainer) {
                const newStars = this.calculateStars(progress.completionPercentage);
                // Only update if stars changed to prevent unnecessary reflow
                if (starsContainer.innerHTML !== newStars) {
                    starsContainer.style.transition = 'opacity 0.2s ease-in-out';
                    starsContainer.style.opacity = '0.7';
                    setTimeout(() => {
                        starsContainer.innerHTML = newStars;
                        starsContainer.style.opacity = '1';
                    }, 100);
                }
            }
            
            if (earningsAmount) {
                earningsAmount.style.transition = 'transform 0.2s ease-out';
                earningsAmount.style.transform = 'scale(1.02)';
                earningsAmount.textContent = this.formatCents(progress.totalEarnings);
                setTimeout(() => {
                    earningsAmount.style.transform = 'scale(1)';
                }, 200);
            }
        });
    }

    // 8. Add CSS to prevent layout jumping
    addAntiJumpCSS() {
        const style = document.createElement('style');
        style.id = 'anti-jump-css';
        style.textContent = `
            /* Prevent table jumping */
            .chore-grid-table {
                table-layout: fixed;
                contain: layout style;
            }
            
            .child-card {
                contain: layout style;
            }
            
            .progress-section {
                contain: layout;
                height: auto;
                min-height: 120px; /* Prevent height changes */
            }
            
            .chore-grid {
                contain: layout;
            }
            
            /* Smooth progress bar transitions */
            .progress-fill {
                transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                will-change: width;
            }
            
            /* Prevent star container jumping */
            .stars-container {
                min-height: 1.5em;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            /* Prevent earnings jumping */
            .earnings-amount {
                transition: transform 0.2s ease-out;
                will-change: transform;
            }
            
            /* Smooth cell updates */
            .chore-cell {
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            /* Prevent content shifting during updates */
            .child-content {
                overflow: hidden;
            }
        `;
        
        // Only add once
        if (!document.getElementById('anti-jump-css')) {
            document.head.appendChild(style);
        }
    }

    // 9. Replace any calls to rerenderChildCard with this smooth version
    updateChildCardSmoothly(childId) {
        // Instead of re-rendering the entire card, just update what changed
        this.updateProgressSmoothly(childId);
    }

    // 10. Add method to update today's focus without table re-render


    // 11. Create a minimal progress update that touches NOTHING else
    updateProgressElementsOnly(childId) {
        // Find the correct child content card (not the tab button)
        const childCard = document.querySelector(`.child-content[data-child-id="${childId}"]`);
        
        if (!childCard) {
            console.error('❌ Child content card not found for childId:', childId);
            return;
        }

        const childChores = this.chores.filter(chore => chore.child_id === childId);
        const childCompletions = this.completions.filter(comp => 
            childChores.some(chore => chore.id === comp.chore_id)
        );

        // Calculate progress
        const progress = this.calculateChildProgress(childId, childChores, childCompletions);
        
        // Update ONLY these 4 elements - nothing else!
        const progressFill = childCard.querySelector('.progress-fill');
        const progressStats = childCard.querySelector('.progress-stats span');
        const starsContainer = childCard.querySelector('.stars-container');
        const earningsAmount = childCard.querySelector('.earnings-amount');
        
        // CRITICAL: Force immediate updates without waiting
        if (progressFill) {
            progressFill.style.width = `${progress.completionPercentage}%`;
            // Force style recalculation
            progressFill.style.transform = 'translateZ(0)';
            progressFill.offsetWidth; // Force reflow
            progressFill.style.transform = '';
        }
        
        if (progressStats) {
            progressStats.textContent = `${progress.completionPercentage}% complete`;
        }
        
        if (starsContainer) {
            // Calculate stars DIRECTLY from perfect days for accuracy
            const perfectDays = progress.completedDays;
            const newStars = this.calculateStarsFromPerfectDays(perfectDays);
            
            // FORCE the stars update with style changes to trigger repaint
            starsContainer.style.opacity = '0.8';
            starsContainer.innerHTML = newStars;
            starsContainer.style.opacity = '1';
            
            // Force DOM reflow
            starsContainer.offsetHeight;
        } else {
            console.error('❌ Stars container not found!');
        }
        
        if (earningsAmount) {
            earningsAmount.textContent = this.formatCents(progress.totalEarnings);
        }
        
        // Also force a DOM update to ensure changes are visible
        setTimeout(() => {
            if (progressFill) progressFill.style.width = progressFill.style.width;
            if (starsContainer) starsContainer.innerHTML = starsContainer.innerHTML;
        }, 10);
    }















    // 19. Fix the tab switching to ensure correct child is active
    switchChildTab(childId) {
        // Update activeChildId
        this.activeChildId = childId;
        
        // Update tab buttons
        document.querySelectorAll('.child-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        const activeTab = document.querySelector(`[data-child-id="${childId}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
        
        // Update content
        document.querySelectorAll('.child-content').forEach(content => {
            content.classList.remove('active');
        });
        const activeContent = document.querySelector(`.child-content[data-child-id="${childId}"]`);
        if (activeContent) {
            activeContent.classList.add('active');
        }
    }

    // 20. Add method to fix child tab data
    fixChildTabs() {
        // Find children with chores
        const childrenWithChores = this.children.filter(child => {
            const hasChores = this.chores.some(chore => chore.child_id === child.id);
            return hasChores;
        });
        
        if (childrenWithChores.length > 0) {
            // Switch to first child with chores
            const firstChildWithChores = childrenWithChores[0];
            this.switchChildTab(firstChildWithChores.id);
        }
    }


}

// Initialize the application
let app;
let isInitializing = false;

// Force reset any stuck loading buttons immediately
function forceResetStuckButtons() {
    const stuckButtons = document.querySelectorAll('button[data-original-content], .btn[data-original-content]');
    stuckButtons.forEach(button => {
        console.log('Force resetting stuck button:', button);
        // Clear all loading state data
        delete button.dataset.originalContent;
        delete button.dataset.originalDisabled;
        button.disabled = false;
        button.classList.remove('loading');
        
        // Reset button content based on form type
        if (button.type === 'submit') {
            if (button.closest('#login-form')) {
                button.innerHTML = 'Sign In';
            } else if (button.closest('#signup-form')) {
                button.innerHTML = 'Create Account';
            } else if (button.closest('#forgot-form')) {
                button.innerHTML = 'Send Reset Link';
            }
        }
    });
    
    if (stuckButtons.length > 0) {
        console.log(`Force reset ${stuckButtons.length} stuck buttons`);
    }
}

// Run immediate reset as soon as possible
forceResetStuckButtons();

// Only run main app initialization if not on settings.html
if (!window.location.pathname.endsWith('settings.html')) {
    document.addEventListener('DOMContentLoaded', async () => {
        // Reset stuck buttons again after DOM is ready
        forceResetStuckButtons();
        // Ensure API client is loaded before initializing app
        const initApp = () => {
            if (isInitializing) {
                console.log('App already initializing, skipping...');
                return;
            }
            
            if (window.apiClient && typeof window.apiClient.getSubscriptionType === 'function') {
                isInitializing = true;
                console.log('Initializing app...');
                app = new FamilyChoreChart();
                app.init();
                window.app = app;
            } else {
                // Wait a bit and try again, but with a timeout
                setTimeout(initApp, 100);
            }
        };
        
        // Add a timeout to prevent infinite waiting
        setTimeout(() => {
            if (!app && !isInitializing) {
                console.error('API client failed to load, initializing with fallback');
                isInitializing = true;
                app = new FamilyChoreChart();
                app.init();
                window.app = app;
            }
        }, 5000); // 5 second timeout
        
        initApp();

    });
}

// Global functions for external access
async function isPremiumUser() {
    return app ? await app.isPremiumUser() : false;
}

function renderAddDicebearPicker(name) {
    if (app) {
        app.renderAddDicebearPicker(name);
    }
}

function renderEditDicebearPicker(name) {
    if (app) {
        app.renderEditDicebearPicker(name);
    }
}

function updateAddChildAvatarPreview() {
    if (app) {
        app.updateAddChildAvatarPreview();
    }
}

function updateEditChildAvatarPreview2() {
    if (app) {
        app.updateEditChildAvatarPreview2();
    }
}

function openEditChildModal(child) {
    if (app) {
        app.openEditChildModal(child);
    }
}

// Global debug function for footer
function debugFooter() {
    if (app) {
        app.debugFooter();
    } else {
        console.log('App not initialized yet');
    }
}



function openEditChildrenPage() {
    if (app) {
        app.openEditChildrenPage();
    }
}

function closeEditChildrenPage() {
    if (app) {
        app.closeEditChildrenPage();
    }
}

function nextChild() {
    if (app) {
        app.nextChild();
    }
}

function previousChild() {
    if (app) {
        app.previousChild();
    }
}

// Icon Picker Functions
function openIconPicker(currentIcon = '', callback = null) {
    if (app) {
        app.openIconPicker(currentIcon, callback);
    }
}

function closeIconPicker() {
    if (app) {
        app.closeIconPicker();
    }
}

function selectIcon(iconUrl, iconType) {
    if (app) {
        app.selectIcon(iconUrl, iconType);
    }
}