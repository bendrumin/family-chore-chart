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

// Family Chore Chart - Main Application Script

class FamilyChoreChart {
    constructor() {
        this.apiClient = window.apiClient;
        this.currentUser = null;
        this.children = [];
        this.chores = [];
        this.completions = [];
        this.familySettings = null;
        this.currentWeekStart = null;
        this.subscription = null;
        this.toastDebounce = new Map(); // Prevent duplicate toasts
        this.formSubmissions = new Map(); // Prevent duplicate form submissions
        this.isLoadingChildren = false; // Prevent multiple simultaneous loads
        this.isInitialized = false; // Prevent double initialization
        
        this.init();
    }

    async init() {
        if (this.isInitialized) {
            console.log('App already initialized, skipping...');
            return;
        }
        
        try {
            this.isInitialized = true;
            console.log('Starting app initialization...');
            
            // Show loading screen
            this.showLoading();
            
            // Handle payment success/cancel
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('success') === 'true') {
                this.showToast('Payment successful! Welcome to Premium!', 'success');
                // Clear URL params
                window.history.replaceState({}, document.title, window.location.pathname);
            } else if (urlParams.get('canceled') === 'true') {
                this.showToast('Payment was canceled.', 'warning');
                // Clear URL params
                window.history.replaceState({}, document.title, window.location.pathname);
            }
            
            // Ensure API client is initialized
            if (!this.apiClient) {
                console.error('API client not initialized');
                this.showToast('Error initializing app', 'error');
                this.showAuth();
                return;
            }
            
            // Check authentication status
            const user = await this.apiClient.getCurrentUser();
            
            if (user) {
                this.currentUser = user;
                await this.loadApp();
            } else {
                this.showAuth();
            }
        } catch (error) {
            console.error('Initialization error:', error);
            this.showToast('Error loading application', 'error');
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
            
            // Load family settings
            this.familySettings = await this.apiClient.getFamilySettings();
            
            // Update family name in header
            const profile = await this.apiClient.getProfile();
            
            if (profile) {
                document.getElementById('family-name').textContent = profile.family_name;
            }
            
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
                profile?.email === 'bsiegel13@gmail.com' ? 'admin' : 'user',
                subscriptionType || 'free',
                this.children.length
            );
            window.analytics.trackPageView('Dashboard');
            
            // Initialize notifications
            try {
                await window.notificationManager.init();
                
                // Send welcome notification for new users
                if (profile && this.children.length === 0) {
                    setTimeout(() => {
                        window.notificationManager.sendWelcomeNotification(profile.family_name);
                    }, 2000);
                }
            } catch (error) {
                console.error('Notification initialization failed:', error);
            }
            
            // Set up real-time subscriptions
            this.setupRealtime();
            
            // Handle WebSocket connection issues
            this.handleWebSocketIssues();
            
            // Show main app
            this.showApp();
            
            // Render everything
            this.renderChildren();
            
        } catch (error) {
            console.error('Load app error:', error);
            window.analytics.trackError('load_app', error.message);
            this.showToast('Error loading family data', 'error');
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
                        this.renderChildren();
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
        this.setupAppHandlers();
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

        // PIN login handlers
        document.getElementById('show-pin-login').addEventListener('click', (e) => {
            e.preventDefault();
            this.switchAuthForm('pin-login');
        });

        document.getElementById('back-to-email-login').addEventListener('click', (e) => {
            e.preventDefault();
            this.switchAuthForm('login');
        });

        document.getElementById('show-signup-from-pin').addEventListener('click', (e) => {
            e.preventDefault();
            this.switchAuthForm('signup');
        });

        // PIN login form
        document.getElementById('pin-login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handlePinLogin();
        });

        // PIN input formatting
        document.getElementById('pin-code').addEventListener('input', (e) => {
            // Only allow numbers
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
        });
    }

    async handleLogin() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        if (!email || !password) {
            this.showToast('Please fill in all fields', 'error');
            return;
        }

        this.showLoading();
        const result = await this.apiClient.signIn(email, password);
        this.hideLoading();

        if (result.success) {
            this.currentUser = result.user;
            window.analytics.trackLogin(email);
            await this.loadApp();
        } else {
            window.analytics.trackError('login', result.error);
            this.showToast(result.error, 'error');
        }
    }

    async handleSignup() {
        const email = document.getElementById('signup-email').value;
        const familyName = document.getElementById('signup-family-name').value;
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm-password').value;
        const pin = document.getElementById('signup-pin').value;

        if (!email || !familyName || !password || !confirmPassword) {
            this.showToast('Please fill in all fields', 'error');
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

        if (pin.length !== 6) {
            this.showToast('PIN must be 6 digits', 'error');
            return;
        }

        this.showLoading();
        const result = await this.apiClient.signUp(email, password, familyName, pin);
        this.hideLoading();

        if (result.success) {
            window.analytics.trackRegistration(email, familyName);
            this.showToast('Account created! Please check your email to verify your account.', 'success');
            this.switchAuthForm('login');
        } else {
            window.analytics.trackError('signup', result.error);
            this.showToast(result.error, 'error');
        }
    }

    async handleForgotPassword() {
        const email = document.getElementById('forgot-email').value;

        if (!email) {
            this.showToast('Please enter your email', 'error');
            return;
        }

        this.showLoading();
        const result = await this.apiClient.resetPassword(email);
        this.hideLoading();

        if (result.success) {
            this.showToast('Password reset email sent!', 'success');
            this.switchAuthForm('login');
        } else {
            this.showToast(result.error, 'error');
        }
    }

    async handlePinLogin() {
        const pin = document.getElementById('pin-code').value;

        if (!pin || pin.length !== 6) {
            this.showToast('Please enter a 6-digit PIN', 'error');
            return;
        }

        this.showLoading();
        const result = await this.apiClient.signInWithPin(pin);
        this.hideLoading();

        if (result.success) {
            this.currentUser = result.user;
            window.analytics.trackLogin('pin_login');
            this.showToast(`Welcome back, ${result.familyName}!`, 'success');
            await this.loadApp();
        } else {
            window.analytics.trackError('pin_login', result.error);
            this.showToast(result.error, 'error');
        }
    }

    switchAuthForm(form) {
        const forms = ['login-form', 'signup-form', 'forgot-form', 'pin-login-form'];
        forms.forEach(formId => {
            document.getElementById(formId).classList.add('hidden');
        });

        if (form === 'signup') {
            document.getElementById('signup-form').classList.remove('hidden');
        } else if (form === 'forgot') {
            document.getElementById('forgot-form').classList.remove('hidden');
        } else if (form === 'pin-login') {
            document.getElementById('pin-login-form').classList.remove('hidden');
        } else {
            document.getElementById('login-form').classList.remove('hidden');
        }
    }

    // App Handlers
    setupAppHandlers() {
        // Logout
        document.getElementById('logout-btn').addEventListener('click', async () => {
            await this.handleLogout();
        });

        // Add child
        document.getElementById('add-child-btn').addEventListener('click', () => {
            this.showModal('add-child-modal');
        });

        document.getElementById('empty-add-child-btn').addEventListener('click', () => {
            this.showModal('add-child-modal');
        });

        // Settings
        document.getElementById('settings-btn').addEventListener('click', () => {
            this.showSettingsModal();
        });

        // Family sharing
        this.setupFamilySharing();

        // Notification permission
        this.setupNotificationPermission();

        // Modal handlers
        this.setupModalHandlers();
    }

    setupNotificationPermission() {
        // Check if notifications are enabled
        if (!window.notificationManager.isEnabled()) {
            // Show notification permission prompt after 5 seconds
            setTimeout(() => {
                this.showNotificationPrompt();
            }, 5000);
        }
    }

    showNotificationPrompt() {
        const toast = document.createElement('div');
        toast.className = 'toast toast-info notification-prompt';
        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-icon">🔔</div>
                <div class="toast-message">
                    <div class="toast-title">Enable Notifications</div>
                    <div class="toast-description">Get daily chore reminders and weekly progress reports!</div>
                </div>
            </div>
            <div class="toast-actions">
                <button class="toast-action btn btn-primary btn-sm">Enable</button>
                <button class="toast-close" title="Dismiss">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        `;
        
        document.getElementById('toast-container').appendChild(toast);
        
        // Add hover effects and better styling
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.transform = 'scale(1.1)';
        });
        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.transform = 'scale(1)';
        });
        
        toast.querySelector('.toast-action').addEventListener('click', async () => {
            const success = await window.notificationManager.requestPermission();
            if (success) {
                window.analytics.trackEngagement('notification_enabled');
                this.showToast('Notifications enabled! You\'ll get daily reminders.', 'success');
            } else {
                window.analytics.trackEngagement('notification_declined');
                this.showToast('Please enable notifications in your browser settings.', 'warning');
            }
            toast.remove();
        });
        
        closeBtn.addEventListener('click', () => {
            // Add a subtle animation before removing
            toast.style.transform = 'translateX(100%)';
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 200);
        });
        
        // Auto-remove after 15 seconds with fade out
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.transform = 'translateX(100%)';
                toast.style.opacity = '0';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.remove();
                    }
                }, 200);
            }
        }, 15000);
    }

    async handleLogout() {
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
    }

    // Modal Management
    setupModalHandlers() {
        // Close modal when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                const modalId = e.target.id;
                this.hideModal(modalId);
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

        // Close modal with X button
        document.querySelectorAll('.modal-close').forEach(button => {
            button.addEventListener('click', (e) => {
                const modalId = e.target.dataset.modal;
                this.hideModal(modalId);
            });
        });

        // Add child form
        document.getElementById('add-child-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleAddChild();
        });

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
                
                // Update active state
                document.querySelectorAll('.color-preset').forEach(p => p.classList.remove('active'));
                preset.classList.add('active');
            });
        });

        // Add more chore button
        document.getElementById('add-more-chore').addEventListener('click', () => {
            this.addChoreEntry();
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
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        // Close all other modals first
        const allModals = document.querySelectorAll('.modal');
        allModals.forEach(m => {
            if (m.id !== modalId) {
                m.classList.add('hidden');
            }
        });
        modal.classList.remove('hidden');
        // Populate child select for chore form
        if (modalId === 'add-chore-modal') {
            this.populateChildSelect();
        }
    }

    hideModal(modalId) {
        document.getElementById(modalId).classList.add('hidden');
        
        // Reset forms
        if (modalId === 'add-child-modal') {
            document.getElementById('add-child-form').reset();
        } else if (modalId === 'add-chore-modal') {
            document.getElementById('add-chore-form').reset();
            // Reset chore entries to just one
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
                    <div class="form-group">
                        <small style="color: var(--gray-600);">Each completed day earns 7¢</small>
                    </div>
                </div>
            `;
        } else if (modalId === 'settings-modal') {
            document.getElementById('settings-form').reset();
        }
    }

    async handleAddChild() {
        const name = document.getElementById('child-name').value;
        const age = parseInt(document.getElementById('child-age').value);
        const color = document.getElementById('child-color').value;
        let avatarUrl = '';
        let avatarFile = '';
        const avatarPreview = document.getElementById('child-avatar-preview');
        if (avatarPreview) {
            if (avatarPreview.dataset.avatarUrl) {
                avatarUrl = avatarPreview.dataset.avatarUrl;
            } else if (avatarPreview.dataset.avatarFile) {
                avatarFile = avatarPreview.dataset.avatarFile;
            }
        }

        if (!name || !age) {
            this.showToast('Please fill in all fields', 'error');
            return;
        }

        // Prevent duplicate submissions
        const submissionKey = `add-child-${name}-${age}`;
        const now = Date.now();
        const lastSubmission = this.formSubmissions.get(submissionKey);
        if (lastSubmission && (now - lastSubmission) < 3000) { // 3 second debounce
            console.log('Preventing duplicate child submission');
            return;
        }
        this.formSubmissions.set(submissionKey, now);

        // Check subscription limits
        const limits = await this.apiClient.checkSubscriptionLimits();
        if (!limits.canAddChildren) {
            this.showUpgradeModal();
            return;
        }

        // Pass avatar info to createChild
        const result = await this.apiClient.createChild(name, age, color, avatarUrl, avatarFile);
        
        if (result.success) {
            window.analytics.trackAddChild(name, age);
            this.hideModal('add-child-modal');
            this.showToast(`Added ${name} to your family!`, 'success');
            await this.loadChildren();
            this.renderChildren();
        } else {
            window.analytics.trackError('add_child', result.error);
            this.showToast(result.error, 'error');
        }
    }

    async handleAddChore() {
        const childId = document.getElementById('chore-child').value;
        
        if (!childId) {
            this.showToast('Please select a child', 'error');
            return;
        }

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

            if (name) {
                choresToAdd.push({ name, childId });
            }
        }

        if (choresToAdd.length === 0) {
            this.showToast('Please fill in at least one chore', 'error');
            return;
        }

        // Prevent duplicate submissions
        const submissionKey = `add-chore-${childId}-${choresToAdd.length}`;
        const now = Date.now();
        const lastSubmission = this.formSubmissions.get(submissionKey);
        if (lastSubmission && (now - lastSubmission) < 2000) { // 2 second debounce
            console.log('Preventing duplicate chore submission');
            return;
        }
        this.formSubmissions.set(submissionKey, now);

        // Create all chores
        let successCount = 0;
        let errorCount = 0;

        for (const chore of choresToAdd) {
            const result = await this.apiClient.createChore(chore.name, 7, chore.childId); // Fixed 7 cents reward
            
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
            this.hideModal('add-chore-modal');
            
            if (successCount === choresToAdd.length) {
                this.showToast(`Added ${successCount} chore${successCount > 1 ? 's' : ''}!`, 'success');
            } else {
                this.showToast(`Added ${successCount} chore${successCount > 1 ? 's' : ''}, ${errorCount} failed`, 'warning');
            }
        } else {
            this.showToast('Failed to add any chores', 'error');
        }
    }

    async handleUpdateSettings() {
        const dailyReward = parseInt(document.getElementById('daily-reward').value);
        const weeklyBonus = parseInt(document.getElementById('weekly-bonus').value);

        if (!dailyReward || !weeklyBonus) {
            this.showToast('Please fill in all fields', 'error');
            return;
        }

        const result = await this.apiClient.updateFamilySettings({
            daily_reward_cents: dailyReward,
            weekly_bonus_cents: weeklyBonus
        });
        
        if (result.success) {
            this.familySettings = result.settings;
            this.renderChildren();
            this.hideModal('settings-modal');
            this.showToast('Settings updated!', 'success');
        } else {
            this.showToast(result.error, 'error');
        }
    }

    async showSettingsModal() {
        this.showModal('settings-modal');
        await this.loadFamilySettings();
        await this.loadChildrenList();
        await this.loadChoresList();
        await this.loadFamilyPin();
    }

    async loadFamilyPin() {
        try {
            const pin = await this.apiClient.getFamilyPin();
            if (pin) {
                document.getElementById('family-pin').value = pin;
            }
        } catch (error) {
            console.error('Error loading family PIN:', error);
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

    async loadChildrenList() {
        try {
            const children = await this.apiClient.getChildren();
            this.populateChildrenList(children);
        } catch (error) {
            console.error('Error loading children list:', error);
        }
    }

    async loadChoresList() {
        try {
            const chores = await this.apiClient.getChores();
            this.populateChoresList(chores);
        } catch (error) {
            console.error('Error loading chores list:', error);
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

    populateChildrenList(children) {
        const container = document.getElementById('children-list');
        if (!container) return;

        if (children.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: var(--space-8); color: var(--gray-500);">
                    <div style="font-size: 3rem; margin-bottom: var(--space-3);">👶</div>
                    <h4 style="margin-bottom: var(--space-2); color: var(--gray-700);">No children yet</h4>
                    <p style="margin-bottom: var(--space-4);">Add your first child to get started with ChoreStar!</p>
                    <button class="btn btn-primary" id="add-first-child-btn">
                        <span>➕</span> Add Your First Child
                    </button>
                </div>
            `;
            return;
        }

        let html = '';
        
        children.forEach(child => {
            const gradient = this.getChildGradient(child.avatar_color);
            html += `
                <div class="child-item" data-child-id="${child.id}">
                    <div class="child-info">
                        <div class="child-avatar-small" style="background: ${gradient}">
                            ${child.name.charAt(0).toUpperCase()}
                        </div>
                        <div class="child-details">
                            <h4>${child.name}</h4>
                            <p>Age ${child.age}</p>
                        </div>
                    </div>
                    <div class="child-actions">
                        <button type="button" class="btn btn-outline btn-sm edit-child" data-child-id="${child.id}">
                            ✏️ Edit
                        </button>
                        <button type="button" class="btn btn-danger btn-sm delete-child" data-child-id="${child.id}">
                            🗑️ Delete
                        </button>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        // Add event listeners for edit and delete buttons
        container.querySelectorAll('.edit-child').forEach(button => {
            button.addEventListener('click', (e) => {
                const childId = e.target.dataset.childId;
                const child = this.children.find(c => c.id === childId);
                if (child && window.openEditChildModal) {
                    window.openEditChildModal(child);
                }
            });
        });
        container.querySelectorAll('.delete-child').forEach(button => {
            button.addEventListener('click', (e) => {
                const childId = e.target.dataset.childId;
                this.deleteChild(childId);
            });
        });

        // Add event listener for "Add First Child" button
        const addFirstChildBtn = container.querySelector('#add-first-child-btn');
        if (addFirstChildBtn) {
            addFirstChildBtn.addEventListener('click', () => {
                this.showModal('add-child-modal');
            });
        }
    }

    // Rendering
    renderChildren() {
        const container = document.getElementById('children-grid');
        const emptyState = document.getElementById('empty-state');

        // Deduplicate children by ID and name to prevent duplicates
        const uniqueChildren = this.children.filter((child, index, self) => {
            const firstIndex = self.findIndex(c => c.id === child.id);
            const nameIndex = self.findIndex(c => c.name === child.name && c.age === child.age);
            return index === firstIndex && index === nameIndex;
        });
        
        console.log('Rendering children:', uniqueChildren);

        if (uniqueChildren.length === 0) {
            container.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        container.innerHTML = '';

        uniqueChildren.forEach(child => {
            const childCard = this.createChildCard(child);
            container.appendChild(childCard);
        });
    }

    createChildCard(child) {
        const card = document.createElement('div');
        card.className = 'child-card fade-in';
        
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
            avatarHtml = `<div class="child-avatar">${child.name.charAt(0).toUpperCase()}</div>`;
        }

        const childChores = this.chores.filter(chore => chore.child_id === child.id);
        const childCompletions = this.completions.filter(comp => 
            childChores.some(chore => chore.id === comp.chore_id)
        );

        // Calculate progress
        const progress = this.calculateChildProgress(child.id, childChores, childCompletions);

        // Calculate stars based on completion percentage
        const stars = this.calculateStars(progress.completionPercentage);
        
        card.innerHTML = `
            <div class="child-header">
                ${avatarHtml}
                <div class="child-info">
                    <h3>${child.name}</h3>
                    <p>Age ${child.age}</p>
                </div>
            </div>
            <div class="progress-section">
                <div class="progress-header">
                    <div class="progress-title">🌟 This Week's Progress</div>
                    <div class="progress-stats">
                        <span>${Math.floor(progress.totalEarnings / 7)}/7 days</span>
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
            <div class="chore-grid">
                ${this.renderChoreGrid(childChores, childCompletions)}
            </div>
            <div class="earnings-section">
                <div class="earnings-amount">${this.formatCents(progress.totalEarnings)}</div>
                <div class="earnings-label">💰 Earnings (7¢ per completed day)</div>
            </div>
        `;

        // Add click handlers for chore cells
        this.addChoreCellHandlers(card, childChores);

        return card;
    }

    renderChoreGrid(chores, completions) {
        if (chores.length === 0) {
            return `
                <div style="text-align: center; padding: 2rem; color: var(--gray-500);">
                    <p>No chores yet! Add some chores to get started.</p>
                    <button class="btn btn-primary" id="add-chore-empty-btn">
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

        chores.forEach(chore => {
            const choreCompletions = completions.filter(comp => comp.chore_id === chore.id);
            
            html += `
                <tr>
                    <td>
                        <span>${chore.name}</span>
                    </td>
            `;

            for (let day = 0; day < 7; day++) {
                const isCompleted = choreCompletions.some(comp => comp.day_of_week === day);
                const cellClass = isCompleted ? 'completed' : 'empty';
                const cellContent = isCompleted ? '✓' : '';
                
                html += `
                    <td>
                        <div class="chore-cell ${cellClass}" 
                             data-chore-id="${chore.id}" 
                             data-day="${day}">
                            ${cellContent}
                        </div>
                    </td>
                `;
            }

            html += '</tr>';
        });

        html += `
                </tbody>
            </table>
        `;

        // Add "Add Chore" button below the table
        html += `
            <div style="text-align: center; margin-top: var(--space-4);">
                <button class="btn btn-secondary" id="add-chore-grid-btn">
                    <span>📝</span> Add More Chores
                </button>
            </div>
        `;

        return html;
    }

    addChoreCellHandlers(card, chores) {
        // Add event listeners for "Add Chore" buttons
        const addChoreEmptyBtn = card.querySelector('#add-chore-empty-btn');
        if (addChoreEmptyBtn) {
            addChoreEmptyBtn.addEventListener('click', () => {
                this.showModal('add-chore-modal');
            });
        }

        const addChoreGridBtn = card.querySelector('#add-chore-grid-btn');
        if (addChoreGridBtn) {
            addChoreGridBtn.addEventListener('click', () => {
                this.showModal('add-chore-modal');
            });
        }

        card.querySelectorAll('.chore-cell').forEach(cell => {
            cell.addEventListener('click', async () => {
                const choreId = cell.dataset.choreId;
                const day = parseInt(cell.dataset.day);
                
                if (!choreId || day === undefined) return;

                // Optimistic update
                const wasCompleted = cell.classList.contains('completed');
                cell.classList.toggle('completed');
                cell.textContent = wasCompleted ? '' : '✓';

                // API call
                const result = await this.apiClient.toggleChoreCompletion(choreId, day, this.currentWeekStart);
                
                if (!result.success) {
                    // Revert on error
                    cell.classList.toggle('completed');
                    cell.textContent = wasCompleted ? '✓' : '';
                    this.showToast(result.error, 'error');
                } else {
                    // Update completions array
                    if (result.completed) {
                        this.completions.push({
                            chore_id: choreId,
                            day_of_week: day,
                            week_start: this.currentWeekStart
                        });
                    } else {
                        this.completions = this.completions.filter(comp => 
                            !(comp.chore_id === choreId && comp.day_of_week === day)
                        );
                    }
                    
                    // Update progress
                    this.updateProgress();
                }
            });
        });
    }

    calculateChildProgress(childId, chores, completions) {
        if (chores.length === 0) {
            return {
                totalChores: 0,
                completedChores: 0,
                completionPercentage: 0,
                totalEarnings: 0
            };
        }

        // Calculate earnings based on completed days (7 cents per completed day)
        const dailyReward = 7; // cents per completed day
        let totalEarnings = 0;
        let completedDays = new Set();

        // Count unique completed days across all chores
        completions.forEach(comp => {
            completedDays.add(comp.day_of_week);
        });

        // Each completed day earns 7 cents
        totalEarnings = completedDays.size * dailyReward;

        // Calculate completion percentage based on fully completed chores
        let completedChores = 0;
        chores.forEach(chore => {
            const choreCompletions = completions.filter(comp => comp.chore_id === chore.id);
            if (choreCompletions.length === 7) {
                completedChores++;
            }
        });

        const completionPercentage = Math.round((completedChores / chores.length) * 100);

        return {
            totalChores: chores.length,
            completedChores,
            completionPercentage,
            totalEarnings
        };
    }

    getChildGradient(color) {
        // Convert hex to RGB and create gradient
        const gradients = [
            'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
            'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
            'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
            'linear-gradient(135deg, #a8caba 0%, #5d4e75 100%)',
            'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
            'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'
        ];
        
        // Use color to determine gradient
        const index = parseInt(color.replace('#', ''), 16) % gradients.length;
        return gradients[index];
    }

    formatCents(cents) {
        return `$${(cents / 100).toFixed(2)}`;
    }

    calculateStars(percentage) {
        let stars = '';
        if (percentage >= 25) stars += '<span class="star earned">⭐</span>';
        if (percentage >= 50) stars += '<span class="star earned">⭐</span>';
        if (percentage >= 75) stars += '<span class="star earned">⭐</span>';
        if (percentage >= 100) stars += '<span class="star earned">🏆</span>';
        return stars;
    }

    addChoreEntry() {
        const container = document.getElementById('chores-container');
        const choreCount = container.children.length + 1;
        
        const choreEntry = document.createElement('div');
        choreEntry.className = 'chore-entry';
        choreEntry.innerHTML = `
            <div class="chore-entry-header">
                <h3>Chore #${choreCount}</h3>
                <button type="button" class="btn btn-outline btn-sm remove-chore">Remove</button>
            </div>
            <div class="form-group">
                <label for="chore-name-${choreCount}">Chore Name</label>
                <input type="text" id="chore-name-${choreCount}" required placeholder="e.g., Make bed">
            </div>
            <div class="form-group">
                <small style="color: var(--gray-600);">Each completed day earns 7¢</small>
            </div>
        `;
        
        container.appendChild(choreEntry);
        
        // Show remove button for the first entry if we have more than one
        if (choreCount > 1) {
            container.querySelector('.chore-entry:first-child .remove-chore').style.display = 'inline-block';
        }
    }

    removeChoreEntry(entry) {
        const container = document.getElementById('chores-container');
        entry.remove();
        
        // Renumber remaining entries
        const entries = container.querySelectorAll('.chore-entry');
        entries.forEach((entry, index) => {
            const number = index + 1;
            entry.querySelector('h3').textContent = `Chore #${number}`;
            
            const nameInput = entry.querySelector('input[type="text"]');
            nameInput.id = `chore-name-${number}`;
        });
        
        // Hide remove button if only one entry remains
        if (entries.length === 1) {
            entries[0].querySelector('.remove-chore').style.display = 'none';
        }
    }

    populateChoresList(chores) {
        const container = document.getElementById('chores-list');
        if (!container) return;

        if (chores.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: var(--space-8); color: var(--gray-500);">
                    <div style="font-size: 3rem; margin-bottom: var(--space-3);">📝</div>
                    <h4 style="margin-bottom: var(--space-2); color: var(--gray-700);">No chores yet</h4>
                    <p style="margin-bottom: var(--space-4);">Add some chores to get started with your family's routine!</p>
                    <button class="btn btn-primary" id="add-first-chore-btn">
                        <span>➕</span> Add Your First Chore
                    </button>
                </div>
            `;
            return;
        }

        // Group chores by child
        const choresByChild = {};
        chores.forEach(chore => {
            const child = this.children.find(c => c.id === chore.child_id);
            const childName = child ? child.name : 'Unknown';
            if (!choresByChild[childName]) {
                choresByChild[childName] = [];
            }
            choresByChild[childName].push(chore);
        });

        // Add summary header
        const childCount = Object.keys(choresByChild).length;
        const totalChores = chores.length;
        
        let html = `
            <div style="background: linear-gradient(135deg, var(--primary), #8b5cf6); color: white; padding: var(--space-4); border-radius: var(--radius-lg); margin-bottom: var(--space-6);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-size: var(--font-size-sm); opacity: 0.9;">Total Chores</div>
                        <div style="font-size: var(--font-size-2xl); font-weight: 700;">${totalChores}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: var(--font-size-sm); opacity: 0.9;">Children</div>
                        <div style="font-size: var(--font-size-2xl); font-weight: 700;">${childCount}</div>
                    </div>
                </div>
            </div>
        `;
        
        // Create sections for each child
        Object.keys(choresByChild).forEach(childName => {
            const childChores = choresByChild[childName];
            
            html += `
                <div class="child-chores-section">
                    <div class="child-chores-header">
                        <h4>${childName}'s Chores</h4>
                        <span class="chore-count">${childChores.length} chore${childChores.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="child-chores-list">
            `;
            
            childChores.forEach(chore => {
                html += `
                    <div class="chore-item" data-chore-id="${chore.id}">
                        <div class="chore-info">
                            <span class="chore-name" data-chore-id="${chore.id}">${chore.name}</span>
                        </div>
                        <div class="chore-actions">
                            <button type="button" class="btn btn-danger btn-sm delete-chore" data-chore-id="${chore.id}">
                                🗑️ Delete
                            </button>
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        // Inline editing logic for settings page only
        if (window.location.pathname.endsWith('settings.html')) {
            container.querySelectorAll('.chore-name').forEach(span => {
                span.addEventListener('click', async (e) => {
                    const choreId = span.dataset.choreId;
                    const originalName = span.textContent;
                    // Prevent multiple editors
                    if (span.parentNode.querySelector('input')) return;
                    // Create input
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.value = originalName;
                    input.className = 'inline-edit-input';
                    input.style.marginRight = '8px';
                    // Create Save button
                    const saveBtn = document.createElement('button');
                    saveBtn.textContent = 'Save';
                    saveBtn.className = 'btn btn-primary btn-sm';
                    // Create Cancel button
                    const cancelBtn = document.createElement('button');
                    cancelBtn.textContent = 'Cancel';
                    cancelBtn.className = 'btn btn-outline btn-sm';
                    cancelBtn.style.marginLeft = '4px';
                    // Replace span with input and buttons
                    span.style.display = 'none';
                    span.parentNode.appendChild(input);
                    span.parentNode.appendChild(saveBtn);
                    span.parentNode.appendChild(cancelBtn);
                    input.focus();
                    // Save handler
                    saveBtn.addEventListener('click', async () => {
                        const newName = input.value.trim();
                        if (!newName || newName === originalName) {
                            cleanup();
                            return;
                        }
                        // Update in Supabase
                        const result = await app.apiClient.updateChore(choreId, newName, undefined);
                        if (result.success) {
                            span.textContent = newName;
                            // Also update in app.chores
                            const idx = app.chores.findIndex(c => c.id === choreId);
                            if (idx !== -1) app.chores[idx].name = newName;
                            app.showToast('Chore name updated!', 'success');
                        } else {
                            app.showToast(result.error || 'Failed to update chore', 'error');
                        }
                        cleanup();
                    });
                    // Cancel handler
                    cancelBtn.addEventListener('click', cleanup);
                    // Blur handler (optional: treat as cancel)
                    input.addEventListener('blur', () => {
                        setTimeout(cleanup, 100); // allow click on buttons
                    });
                    function cleanup() {
                        input.remove();
                        saveBtn.remove();
                        cancelBtn.remove();
                        span.style.display = '';
                    }
                });
            });
        }

        // Delete handler (shared)
        container.querySelectorAll('.delete-chore').forEach(button => {
            button.addEventListener('click', (e) => {
                const choreId = e.target.dataset.choreId;
                this.deleteChore(choreId);
            });
        });

        // Add event listener for "Add First Chore" button
        const addFirstChoreBtn = container.querySelector('#add-first-chore-btn');
        if (addFirstChoreBtn) {
            addFirstChoreBtn.addEventListener('click', () => {
                this.showModal('add-chore-modal');
            });
        }
    }

    showEditChoreModal(choreId) {
        if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/' && window.location.pathname !== '') {
            // Only run on main app page
            return;
        }
        const chore = this.chores.find(c => c.id === choreId);
        if (!chore) return;

        // Populate the edit form
        document.getElementById('edit-chore-name').value = chore.name;
        
        // Populate child select
        const childSelect = document.getElementById('edit-chore-child');
        childSelect.innerHTML = '<option value="">Select a child...</option>';
        this.children.forEach(child => {
            const option = document.createElement('option');
            option.value = child.id;
            option.textContent = child.name;
            option.selected = child.id === chore.child_id;
            childSelect.appendChild(option);
        });

        // Store chore ID for the form submission
        document.getElementById('edit-chore-form').dataset.choreId = choreId;
        
        this.showModal('edit-chore-modal');
    }

    async handleEditChore() {
        const choreId = document.getElementById('edit-chore-form').dataset.choreId;
        const name = document.getElementById('edit-chore-name').value;
        const childId = document.getElementById('edit-chore-child').value;

        if (!name || !childId) {
            this.showToast('Please fill in all fields', 'error');
            return;
        }

        const result = await this.apiClient.updateChore(choreId, {
            name,
            child_id: childId
        });

        if (result.success) {
            // Update the chore in our local array
            const choreIndex = this.chores.findIndex(c => c.id === choreId);
            if (choreIndex !== -1) {
                this.chores[choreIndex] = result.chore;
            }

            this.renderChildren();
            this.hideModal('edit-chore-modal');
            this.showToast(`Updated "${name}" chore!`, 'success');
            
            // Refresh the chores list in settings
            this.populateChoresList();
        } else {
            this.showToast(result.error, 'error');
        }
    }

    async deleteChore(choreId) {
        const chore = this.chores.find(c => c.id === choreId);
        if (!chore) return;

        if (!confirm(`Are you sure you want to delete "${chore.name}"? This action cannot be undone.`)) {
            return;
        }

        const result = await this.apiClient.deleteChore(choreId);
        
        if (result.success) {
            // Remove the chore from our local array
            this.chores = this.chores.filter(c => c.id !== choreId);
            
            this.renderChildren();
            this.showToast(`Deleted "${chore.name}" chore!`, 'success');
            
            // Refresh the chores list in settings
            this.populateChoresList();
        } else {
            this.showToast(result.error, 'error');
        }
    }

    async deleteChild(childId) {
        const child = this.children.find(c => c.id === childId);
        if (!child) {
            this.showToast('Child not found', 'error');
            return;
        }

        // Check if child has chores
        const childChores = this.chores.filter(chore => chore.child_id === childId);
        if (childChores.length > 0) {
            const choreText = childChores.length === 1 ? 'chore' : 'chores';
            if (!confirm(`Are you sure you want to delete ${child.name}? This will also delete ${childChores.length} ${choreText} associated with this child. This action cannot be undone.`)) {
                return;
            }
        } else {
            if (!confirm(`Are you sure you want to delete ${child.name}? This action cannot be undone.`)) {
                return;
            }
        }

        const result = await this.apiClient.deleteChild(childId);
        
        if (result.success) {
            // Remove from local arrays
            this.children = this.children.filter(child => child.id !== childId);
            this.chores = this.chores.filter(chore => chore.child_id !== childId);
            
            // Reload data to ensure consistency
            await this.loadChildren();
            await this.loadChores();
            this.renderChildren();
            
            // Update settings modal if open
            if (!document.getElementById('settings-modal').classList.contains('hidden')) {
                this.populateChildrenList();
                this.populateChoresList();
            }
            
            this.showToast(`${child.name} deleted successfully`, 'success');
        } else {
            this.showToast(result.error || 'Failed to delete child', 'error');
        }
    }

    // Toast Notifications
    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            console.warn('No toast container found, skipping toast:', message);
            return;
        }
        // Create a unique key for this toast
        const toastKey = `${message}-${type}`;
        
        // Check if this exact toast is already showing
        const existingToast = document.querySelector(`.toast.toast-${type}[data-message="${message}"]`);
        if (existingToast) {
            return; // Don't show duplicate
        }
        
        // Check debounce map to prevent rapid-fire toasts
        const now = Date.now();
        const lastShown = this.toastDebounce.get(toastKey);
        if (lastShown && (now - lastShown) < 2000) { // 2 second debounce
            return;
        }
        
        // Update debounce map
        this.toastDebounce.set(toastKey, now);

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.setAttribute('data-message', message);
        
        const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
        
        toast.innerHTML = `
            <button class="toast-close" title="Dismiss">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
            <div class="toast-content">
                <span>${icon}</span>
                <div>
                    <strong>${type.charAt(0).toUpperCase() + type.slice(1)}</strong>
                    <p>${message}</p>
                </div>
            </div>
        `;

        toastContainer.appendChild(toast);

        // Add close functionality
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            toast.style.transform = 'translateX(100%)';
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 200);
        });

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.transform = 'translateX(100%)';
                toast.style.opacity = '0';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.remove();
                    }
                }, 200);
            }
        }, 5000);
    }

    showUpgradeModal() {
        window.analytics.trackUpgradeModalShown();
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'upgrade-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>🌟 Upgrade to Premium</h2>
                    <button class="modal-close" onclick="app.hideModal('upgrade-modal')">&times;</button>
                </div>
                <div class="modal-form">
                    <div class="upgrade-content">
                        <h3>Free Plan Limits</h3>
                        <p>You've reached the limit of 2 children on the free plan.</p>
                        
                        <div class="plan-comparison">
                            <div class="plan free">
                                <h4>Free Plan</h4>
                                <ul>
                                    <li>✅ 2 children maximum</li>
                                    <li>✅ Basic chore tracking</li>
                                    <li>✅ 7-day progress</li>
                                    <li>❌ No advanced features</li>
                                </ul>
                            </div>
                            <div class="plan premium">
                                <h4>Premium Plan - $4.99/month</h4>
                                <ul>
                                    <li>✅ Unlimited children</li>
                                    <li>✅ Photo proof uploads</li>
                                    <li>✅ Push notifications</li>
                                    <li>✅ Progress analytics</li>
                                    <li>✅ Family sharing</li>
                                </ul>
                            </div>
                        </div>
                        
                        <div class="upgrade-actions">
                            <button class="btn btn-primary" onclick="app.handleUpgrade()">
                                💳 Upgrade to Premium
                            </button>
                            <button class="btn btn-outline" onclick="app.hideModal('upgrade-modal')">
                                Maybe Later
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.showModal('upgrade-modal');
    }

    async handleUpgrade() {
        try {
            this.hideModal('upgrade-modal');
            window.analytics.trackPaymentStart();
            this.showToast('Redirecting to payment...', 'info');
            await window.paymentManager.handleUpgrade();
        } catch (error) {
            window.analytics.trackError('payment', error.message);
            this.showToast('Payment failed. Please try again.', 'error');
        }
    }

    // Notification functions
    async testNotification() {
        const success = await window.notificationManager.sendLocalNotification(
            '🧪 Test Notification',
            'This is a test notification from ChoreStar!',
            { type: 'test' }
        );
        
        if (success) {
            this.showToast('Test notification sent!', 'success');
            window.analytics.trackEngagement('test_notification');
        } else {
            this.showToast('Please enable notifications first.', 'warning');
        }
    }

    async enableNotifications() {
        const success = await window.notificationManager.requestPermission();
        if (success) {
            this.showToast('Notifications enabled!', 'success');
            window.analytics.trackEngagement('notification_enabled');
            // Refresh settings modal
            this.showSettingsModal();
        } else {
            this.showToast('Please enable notifications in your browser settings.', 'warning');
            window.analytics.trackEngagement('notification_declined');
        }
    }

    // Family Sharing Functions
    setupFamilySharing() {
        // Add family sharing button to header
        const headerRight = document.querySelector('.header-right');
        if (headerRight) {
            const familyShareBtn = document.createElement('button');
            familyShareBtn.className = 'btn btn-secondary btn-sm';
            familyShareBtn.innerHTML = '👨‍👩‍👧‍👦 Share';
            familyShareBtn.onclick = () => this.showFamilySharingModal();
            headerRight.appendChild(familyShareBtn);
        }

        // Setup join family form
        document.getElementById('join-family-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleJoinFamily();
        });
    }

    async showFamilySharingModal() {
        this.showModal('family-sharing-modal');
        await this.loadFamilyCode();
        await this.loadFamilyMembers();
    }

    async loadFamilyCode() {
        try {
            const code = await window.familySharing.getOrCreateFamilyCode();
            if (code) {
                document.getElementById('family-code').textContent = code;
            } else {
                document.getElementById('family-code').textContent = 'Error loading code';
            }
        } catch (error) {
            console.error('Error loading family code:', error);
            document.getElementById('family-code').textContent = 'Error loading code';
        }
    }

    async loadFamilyMembers() {
        try {
            const members = await window.familySharing.getFamilyMembers();
            const membersList = document.getElementById('family-members-list');
            
            if (members.length === 0) {
                membersList.innerHTML = '<p style="color: var(--gray-500); font-style: italic;">No family members yet</p>';
                return;
            }

            membersList.innerHTML = members.map(member => `
                <div class="family-member-item">
                    <div class="family-member-avatar">
                        ${member.profiles?.email?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div class="family-member-info">
                        <div class="family-member-name">${member.profiles?.family_name || 'Unknown'}</div>
                        <div class="family-member-email">${member.profiles?.email || 'Unknown'}</div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading family members:', error);
            document.getElementById('family-members-list').innerHTML = '<p style="color: var(--red-500);">Error loading members</p>';
        }
    }

    async copyFamilyCode() {
        try {
            const result = await window.familySharing.shareFamilyCode();
            if (result.success) {
                this.showToast('Family code copied to clipboard!', 'success');
                window.analytics.trackEngagement('family_code_copied');
            } else {
                this.showToast('Failed to copy code', 'error');
            }
        } catch (error) {
            console.error('Error copying family code:', error);
            this.showToast('Failed to copy code', 'error');
        }
    }

    async handleJoinFamily() {
        const codeInput = document.getElementById('join-family-code');
        const code = codeInput.value.trim();

        if (!window.familySharing.isValidCode(code)) {
            this.showToast('Please enter a valid 6-digit code', 'warning');
            return;
        }

        try {
            const result = await window.familySharing.joinFamily(code);
            if (result.success) {
                this.showToast('Successfully joined family!', 'success');
                window.analytics.trackEngagement('family_joined');
                this.hideModal('family-sharing-modal');
                // Reload app data
                await this.loadApp();
            } else {
                this.showToast(result.error || 'Failed to join family', 'error');
            }
        } catch (error) {
            console.error('Error joining family:', error);
            this.showToast('Failed to join family', 'error');
        }
    }

    // Settings Functions
    setupSettings() {
        document.getElementById('settings-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSaveSettings();
        });

        // PIN management
        document.getElementById('save-pin-btn').addEventListener('click', () => {
            this.handleSavePin();
        });

        // PIN input formatting
        document.getElementById('family-pin').addEventListener('input', (e) => {
            // Only allow numbers
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
        });
    }

    async handleSaveSettings() {
        const dailyReward = parseInt(document.getElementById('daily-reward').value);
        const weeklyBonus = parseInt(document.getElementById('weekly-bonus').value);

        if (!dailyReward || !weeklyBonus) {
            this.showToast('Please fill in all fields', 'error');
            return;
        }

        const result = await this.apiClient.updateFamilySettings({
            daily_reward_cents: dailyReward,
            weekly_bonus_cents: weeklyBonus
        });
        
        if (result.success) {
            this.familySettings = result.settings;
            this.renderChildren();
            this.hideModal('settings-modal');
            this.showToast('Settings updated!', 'success');
        } else {
            this.showToast(result.error, 'error');
        }
    }

    async handleSavePin() {
        const pin = document.getElementById('family-pin').value;
        if (!pin || pin.length !== 6) {
            this.showToast('Please enter a 6-digit PIN', 'error');
            return;
        }

        const result = await this.apiClient.createFamilyPin(pin);

        if (result.success) {
            this.showToast('Family PIN saved! Your family can now sign in with this PIN.', 'success');
        } else {
            this.showToast(result.error, 'error');
        }
    }
}

// Initialize the application
let app;
let isInitializing = false;

// Only run main app initialization if not on settings.html
if (!window.location.pathname.endsWith('settings.html')) {
    document.addEventListener('DOMContentLoaded', async () => {
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

    // --- Custom Avatar Logic for Add/Edit Child Modals ---
    async function isPremiumUser() {
        if (!window.apiClient) return false;
        const type = await window.apiClient.getSubscriptionType();
        return type === 'premium';
    }

    // DiceBear avatar seeds (for free users)
    const diceBearSeeds = ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Mason', 'Sophia', 'Lucas', 'Mia', 'Ethan'];
    function getDiceBearUrl(seed) {
        return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(seed)}`;
    }

    // Add Child Modal logic
    const addAvatarBtn = document.getElementById('child-avatar-upload-btn');
    const addAvatarInput = document.getElementById('child-avatar-upload');
    const addAvatarPreview = document.getElementById('child-avatar-preview');
    const addAvatarUploadDiv = document.getElementById('add-child-avatar-upload');
    let addAvatarUploadUrl = '';

    addAvatarBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (await isPremiumUser()) {
            addAvatarInput.click();
        } else {
            if (window.app && typeof window.app.showUpgradeModal === 'function') {
                window.app.showUpgradeModal();
            }
        }
    });
    addAvatarInput.addEventListener('change', async () => {
        const file = addAvatarInput.files[0];
        if (file) {
            addAvatarPreview.innerHTML = '<span>Uploading...</span>';
            // Upload to Supabase Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `child-${Date.now()}.${fileExt}`;
            const { data, error } = await window.supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
            if (error) {
                addAvatarPreview.innerHTML = '<span style="color:red">Upload failed</span>';
                return;
            }
            // Get public URL
            const { data: publicUrlData } = window.supabase.storage.from('avatars').getPublicUrl(fileName);
            addAvatarUploadUrl = publicUrlData.publicUrl;
            addAvatarPreview.innerHTML = `<img src="${addAvatarUploadUrl}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">`;
            addAvatarPreview.dataset.avatarUrl = addAvatarUploadUrl;
            delete addAvatarPreview.dataset.avatarFile;
        }
    });

    // Edit Child Modal logic (if present)
    const editChildModal = document.getElementById('edit-child-modal');
    if (editChildModal) {
        // Helper to open the edit modal with current child data
        window.openEditChildModal = function(child) {
            document.getElementById('edit-child-name').value = child.name;
            document.getElementById('edit-child-age').value = child.age;
            document.getElementById('edit-child-color').value = child.avatar_color || '#6366f1';
            // Show current avatar
            const preview = document.getElementById('edit-child-avatar-preview');
            preview.innerHTML = '';
            delete preview.dataset.avatarUrl;
            delete preview.dataset.avatarFile;
            if (child.avatar_url) {
                const img = document.createElement('img');
                img.src = child.avatar_url;
                img.style.width = '40px';
                img.style.height = '40px';
                img.style.borderRadius = '50%';
                img.style.objectFit = 'cover';
                preview.appendChild(img);
                preview.dataset.avatarUrl = child.avatar_url;
            } else if (child.avatar_file) {
                const img = document.createElement('img');
                img.src = child.avatar_file;
                img.style.width = '40px';
                img.style.height = '40px';
                img.style.borderRadius = '50%';
                img.style.objectFit = 'cover';
                preview.appendChild(img);
                preview.dataset.avatarFile = child.avatar_file;
            }
            // Add clear button
            let clearBtn = document.getElementById('edit-avatar-clear-btn');
            if (!clearBtn) {
                clearBtn = document.createElement('button');
                clearBtn.id = 'edit-avatar-clear-btn';
                clearBtn.type = 'button';
                clearBtn.className = 'btn btn-outline btn-sm';
                clearBtn.textContent = 'Remove Avatar';
                clearBtn.style.marginLeft = '8px';
                preview.parentNode.appendChild(clearBtn);
            }
            clearBtn.onclick = () => {
                preview.innerHTML = '';
                delete preview.dataset.avatarUrl;
                delete preview.dataset.avatarFile;
            };
            // Show modal
            editChildModal.classList.remove('hidden');
            editChildModal.dataset.childId = child.id;
        };
        // Save handler for edit child
        document.getElementById('edit-child-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const childId = editChildModal.dataset.childId;
            const name = document.getElementById('edit-child-name').value;
            const age = parseInt(document.getElementById('edit-child-age').value);
            const color = document.getElementById('edit-child-color').value;
            let avatarUrl = '';
            let avatarFile = '';
            const preview = document.getElementById('edit-child-avatar-preview');
            if (preview) {
                if (preview.dataset.avatarUrl) {
                    avatarUrl = preview.dataset.avatarUrl;
                } else if (preview.dataset.avatarFile) {
                    avatarFile = preview.dataset.avatarFile;
                }
            }
            // Update child in Supabase
            const updates = { name, age, avatar_color: color, avatar_url: avatarUrl, avatar_file: avatarFile };
            const result = await app.apiClient.updateChild(childId, updates);
            if (result.success) {
                editChildModal.classList.add('hidden');
                await app.loadChildren();
                app.renderChildren();
                app.showToast('Child updated!', 'success');
            } else {
                app.showToast(result.error || 'Failed to update child', 'error');
            }
        });
    }
});
} 

// Add a helper to open the settings modal from the header button
if (typeof window !== 'undefined') {
    window.app = window.app || {};
    window.app.openModal = function(modalId) {
        if (window.app && typeof window.app.showModal === 'function') {
            window.app.showModal(modalId);
        } else {
            // fallback: show the modal directly
            const modal = document.getElementById(modalId);
            if (modal) modal.classList.remove('hidden');
        }
    };
} 