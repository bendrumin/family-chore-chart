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
        this.children = [];
        this.chores = [];
        this.completions = [];
        this.currentWeekStart = null;
        this.currentChildTab = null;
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
        this.handlersInitialized = false; // ADD THIS FLAG
        this.init();
    }

    async init() {
        try {
            this.showLoading();
            
            // Load settings and streaks
            this.loadSettings();
            this.loadStreaks();
            
            // Check authentication
            const user = await this.apiClient.getCurrentUser();
            if (user) {
                this.currentUser = user;
                await this.loadApp();
            } else {
                this.showAuth();
            }
        } catch (error) {
            console.error('Initialization error:', error);
            this.showToast('Failed to initialize app. Please refresh the page.', 'error');
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

        this.showLoading();
        const result = await this.apiClient.signUp(email, password, familyName);
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
        console.log('Setting up app handlers...');
        
        // Check if already initialized to prevent duplicates
        if (this.appHandlersSetup) {
            console.log('App handlers already set up, skipping...');
            return;
        }
        this.appHandlersSetup = true;

        // Add child button
        const addChildBtn = document.getElementById('add-child-btn');
        if (addChildBtn && !addChildBtn.hasListener) {
            addChildBtn.addEventListener('click', () => {
                this.showModal('add-child-modal');
            });
            addChildBtn.hasListener = true;
        }

        // Settings button
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn && !settingsBtn.hasListener) {
            settingsBtn.addEventListener('click', () => {
                this.showSettingsModal();
            });
            settingsBtn.hasListener = true;
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
                this.hideModal(e.target.id);
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

        // Icon picker functionality
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('icon-option')) {
                const iconPicker = e.target.closest('.icon-picker');
                const hiddenInput = iconPicker.nextElementSibling;
                
                // Update active state
                iconPicker.querySelectorAll('.icon-option').forEach(option => {
                    option.classList.remove('active');
                });
                e.target.classList.add('active');
                
                // Update hidden input
                if (hiddenInput && hiddenInput.type === 'hidden') {
                    hiddenInput.value = e.target.dataset.icon;
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
            this.checkPremiumFeatures();
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
        }
        
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
        } else if (modalId === 'edit-chore-modal') {
            document.getElementById('edit-chore-form').reset();
            delete document.getElementById('edit-chore-form').dataset.choreId;
            delete document.getElementById('edit-chore-form').dataset.returnChildId;
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
            const icon = entry.querySelector(`#chore-icon-${i + 1}`)?.value || '📝';
            const category = entry.querySelector(`#chore-category-${i + 1}`)?.value || 'General';

            if (name) {
                choresToAdd.push({ name, childId, icon, category });
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
            const result = await this.apiClient.createChore(chore.name, 7, chore.childId, chore.icon, chore.category);
            
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
            // Don't reload the entire view, just close the modal
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
        this.generateChildTabs();
        this.populateManageChildrenList();
        this.checkPremiumFeatures();
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
            const tabIcon = child.avatar_color ? `🎨` : `👶`;
            
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
                            <span>✏️</span> Bulk Edit
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
                    <p>No chores yet for ${child.name}.</p>
                    <button class="btn btn-primary" onclick="app.showModal('add-chore-modal'); document.getElementById('chore-child').value='${child.id}';">
                        <span>📝</span> Add First Chore
                    </button>
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
        document.getElementById('edit-chore-notes').value = choreNotes;
        
        // Set icon and category
        document.getElementById('edit-chore-icon').value = chore.icon || '📝';
        document.getElementById('edit-chore-category').value = chore.category || 'General';
        
        // Update icon picker active state
        const iconPicker = document.getElementById('edit-chore-icon-picker');
        if (iconPicker) {
            iconPicker.querySelectorAll('.icon-option').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.icon === chore.icon) {
                    btn.classList.add('active');
                }
            });
        }
        
        // Populate child select and set the correct child
        this.populateEditChoreChildSelect(chore.child_id);
        
        // Store the chore ID for the save handler
        document.getElementById('edit-chore-form').dataset.choreId = choreId;
        
        // Store the child ID to return to after save
        document.getElementById('edit-chore-form').dataset.returnChildId = chore.child_id;
        
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
                    <h4 style="margin-bottom: var(--space-2); color: var(--gray-700);">No children yet</h4>
                    <p style="margin-bottom: var(--space-4);">Add your first child to get started with ChoreStar!</p>
                    <button class="btn btn-primary" id="add-first-child-btn">
                        <span>➕</span> Add Your First Child
                    </button>
            </div>`;
            return;
        }
        let html = '';
        this.children.forEach(child => {
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
        this.children.forEach(child => {
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
                    const age = parseInt(form.elements['age'].value);
                    const color = form.elements['color'].value;
                    const dicebearUrl = form.dataset.selectedDicebearUrl || '';
                    const updates = { name, age, avatar_color: color, avatar_url: dicebearUrl };
                    const result = await this.apiClient.updateChild(child.id, updates);
                    if (result.success) {
                        await this.loadChildrenList();
                        this.showToast('Child updated!', 'success');
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
        if (confirm('Are you sure you want to delete this child?')) {
            const result = await this.apiClient.deleteChild(childId);
            if (result.success) {
                this.showToast('Child deleted!', 'success');
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
    showToast(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-icon">${this.getToastIcon(type)}</div>
                <div class="toast-message">
                    <div class="toast-title">${this.getToastTitle(type)}</div>
                    <div class="toast-description">${message}</div>
                </div>
            </div>
            <div class="toast-actions">
                <button class="toast-action btn btn-primary btn-sm">OK</button>
                <button class="toast-close">&times;</button>
            </div>
        `;
        
        document.getElementById('toast-container').appendChild(toast);
        
        toast.querySelector('.toast-action').addEventListener('click', () => {
            toast.remove();
        });
        
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.remove();
        });
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 5000);
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
                        <div class="family-member-joined">Joined ${new Date(member.joined_at).toLocaleDateString()}</div>
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

        this.showLoading();
        const result = await window.familySharing.joinFamily(code);
        this.hideLoading();

        if (result.success) {
            this.showToast('Successfully joined family!', 'success');
            this.hideModal('family-sharing-modal');
            // Reload app data to show shared family data
            await this.loadApp();
        } else {
            this.showToast(result.error || 'Failed to join family', 'error');
        }
    }

    copyFamilyCode() {
        const code = document.getElementById('family-code').textContent;
        if (code && code !== 'Loading...') {
            navigator.clipboard.writeText(code).then(() => {
                this.showToast('Family code copied to clipboard!', 'success');
            }).catch(() => {
                this.showToast('Failed to copy code', 'error');
            });
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
        // Redirect to payment page
        window.location.href = '/api/create-checkout-session';
    }

    // Premium feature methods
    async checkPremiumFeatures() {
        const limits = await this.apiClient.checkSubscriptionLimits();
        
        // Show/hide premium features in add chore modal for all entries
        const premiumFeatures = document.querySelectorAll('[id^="premium-chore-features"]');
        const upgradePrompts = document.querySelectorAll('[id^="premium-upgrade-prompt"]');
        
        premiumFeatures.forEach(feature => {
            if (limits.canUseCustomIcons && limits.canUseCategories) {
                feature.style.display = 'block';
            } else {
                feature.style.display = 'none';
            }
        });
        
        upgradePrompts.forEach(prompt => {
            if (limits.canUseCustomIcons && limits.canUseCategories) {
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

        const result = await this.apiClient.exportFamilyReport();
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
                <h3>Chore #${entryCount}</h3>
                <button type="button" class="btn btn-outline btn-sm remove-chore">Remove</button>
            </div>
            <div class="form-group">
                <label for="chore-name-${entryCount}">Chore Name</label>
                <input type="text" id="chore-name-${entryCount}" required placeholder="e.g., Make bed">
            </div>
            
            <!-- Premium Features -->
            <div class="premium-features" id="premium-chore-features-${entryCount}" style="display: none;">
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
                    <label for="chore-category-${entryCount}">Category</label>
                    <select id="chore-category-${entryCount}">
                        <option value="General">General</option>
                        <option value="Kitchen">Kitchen</option>
                        <option value="Bedroom">Bedroom</option>
                        <option value="Bathroom">Bathroom</option>
                        <option value="Outdoor">Outdoor</option>
                        <option value="School">School</option>
                        <option value="Pets">Pets</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group">
                <small style="color: var(--gray-600);">Each completed day earns 7¢</small>
            </div>
            
            <div class="premium-upgrade-prompt" id="premium-upgrade-prompt-${entryCount}" style="display: none;">
                <div class="upgrade-banner">
                    <span>🌟</span>
                    <span>Upgrade to Premium for custom icons, categories, and more!</span>
                    <button type="button" class="btn btn-primary btn-sm" onclick="app.showUpgradeModal()">Upgrade</button>
                </div>
            </div>
        `;
        
        container.appendChild(newEntry);
        
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
            category
        });
        this.hideLoading();

        if (result.success) {
            this.showToast('Chore updated successfully!', 'success');
            this.hideModal('edit-chore-modal');
            
            // Reload chores and regenerate tabs
            await this.loadChoresList();
            this.generateChildTabs();
            
            // Return to the chores tab and the specific child tab
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
        const tabsContainer = document.getElementById('children-tabs');
        const contentContainer = document.getElementById('children-content');
        const emptyState = document.getElementById('empty-state');
        
        // Deduplicate children by ID and name to prevent duplicates
        const uniqueChildren = this.children.filter((child, index, self) => {
            const firstIndex = self.findIndex(c => c.id === child.id);
            const nameIndex = self.findIndex(c => c.name === child.name && c.age === child.age);
            return index === firstIndex && index === nameIndex;
        });
        
        if (uniqueChildren.length === 0) {
            tabsContainer.innerHTML = '';
            contentContainer.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }
        
        emptyState.classList.add('hidden');
        
        // Generate tabs
        this.generateChildrenTabs(uniqueChildren);
        
        // Generate content
        this.generateChildrenContent(uniqueChildren);
        
        // Set the first child as active if no child is currently active
        if (!document.querySelector('.child-tab.active')) {
            this.switchChildTab(uniqueChildren[0].id);
        }
    }

    generateChildrenTabs(children) {
        const tabsContainer = document.getElementById('children-tabs');
        tabsContainer.innerHTML = '';
        
        children.forEach((child, index) => {
            const tab = document.createElement('button');
            tab.className = `child-tab ${index === 0 ? 'active' : ''}`;
            tab.dataset.childId = child.id;
            
            // Create avatar
            let avatarHtml = '';
            if (child.avatar_url) {
                avatarHtml = `<img src="${child.avatar_url}" class="child-tab-avatar" alt="${child.name}">`;
            } else if (child.avatar_file) {
                avatarHtml = `<img src="${child.avatar_file}" class="child-tab-avatar" alt="${child.name}">`;
            } else {
                const gradient = this.getChildGradient(child.avatar_color);
                avatarHtml = `<div class="child-tab-avatar" style="background: ${gradient};">${child.name.charAt(0).toUpperCase()}</div>`;
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
            
            // Add Edit button
            const editBtn = document.createElement('button');
            editBtn.className = 'btn btn-outline btn-sm edit-child-btn';
            editBtn.textContent = 'Edit';
            editBtn.onclick = () => window.openEditChildModal(child);
            childCard.querySelector('.child-actions').appendChild(editBtn);
            
            contentContainer.appendChild(childCard);
        });
    }

    switchChildTab(childId) {
        // Update tab buttons
        document.querySelectorAll('.child-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-child-id="${childId}"]`).classList.add('active');
        
        // Update content
        document.querySelectorAll('.child-content').forEach(content => {
            content.classList.remove('active');
        });
        document.querySelector(`.child-content[data-child-id="${childId}"]`).classList.add('active');
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
        
        // Calculate total streak for this child
        const totalStreak = childChores.reduce((sum, chore) => {
            return sum + this.getStreak(child.id, chore.id);
        }, 0);
        card.innerHTML = `
            <div class="child-header">
                ${avatarHtml}
                <div class="child-info">
                    <h3>${child.name}</h3>
                    <p>Age ${child.age}</p>
                    ${totalStreak > 0 ? `<div class="streak-badge">🔥 ${totalStreak} day streak</div>` : ''}
                </div>
                <div class="child-actions">
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
                <div class="earnings-label">💰 Earnings (${this.familySettings?.daily_reward_cents || 7}¢ per completed day${this.familySettings?.weekly_bonus_cents ? ` + ${this.familySettings.weekly_bonus_cents}¢ weekly bonus` : ''})</div>
            </div>
        `;
        // Add click handlers for chore cells
        this.addChoreCellHandlers(card, childChores, child.id);
        return card;
    }

    renderChoreGrid(chores, completions) {
        if (chores.length === 0) {
            return `
                <div style="text-align: center; padding: 2rem; color: var(--gray-500);">
                    <p>No chores yet! Add some chores to get started.</p>
                    <button class="btn btn-primary add-chore-empty-btn">
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
            const icon = chore.icon || '📝';
            const category = chore.category || 'General';
            html += `
                <tr>
                    <td>
                        <div style="display: flex; align-items: center; gap: var(--space-2);">
                            <span style="font-size: 1.2rem;">${icon}</span>
                            <div>
                                <span style="font-weight: 600;">${chore.name}</span>
                                <div style="font-size: var(--font-size-xs); color: var(--gray-500);">${category}</div>
                            </div>
                        </div>
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
                <button class="btn btn-secondary add-chore-grid-btn">
                    <span>📝</span> Add More Chores
                </button>
            </div>
        `;
        return html;
    }

    addChoreCellHandlers(card, childChores, childId) {
        card.querySelectorAll('.chore-grid-table .chore-cell').forEach(cell => {
            const day = cell.dataset.day;
            const choreId = cell.dataset.choreId;

            cell.addEventListener('click', async () => {
                console.log('Chore cell clicked:', { choreId, day });
                const chore = childChores.find(ch => ch.id === choreId);
                if (chore) {
                    console.log('Found chore:', chore.name);
                    
                    // Optimistic update - update UI immediately
                    const isCurrentlyCompleted = cell.classList.contains('completed');
                    if (isCurrentlyCompleted) {
                        // Mark as uncompleted immediately
                        cell.classList.remove('completed');
                        cell.textContent = '';
                    } else {
                        // Mark as completed immediately
                        cell.classList.add('completed');
                        cell.textContent = '✓';
                    }
                    
                    // Optimistically update progress for current child
                    this.updateChildProgressOptimistically(chore.child_id, isCurrentlyCompleted ? -1 : 1);
                    
                    // API call in background
                    const result = await this.apiClient.toggleChoreCompletion(choreId, parseInt(day));
                    if (result.success) {
                        if (result.completed !== !isCurrentlyCompleted) {
                            // API result doesn't match our optimistic update, revert
                            if (isCurrentlyCompleted) {
                                cell.classList.add('completed');
                                cell.textContent = '✓';
                            } else {
                                cell.classList.remove('completed');
                                cell.textContent = '';
                            }
                            this.updateChildProgressOptimistically(chore.child_id, isCurrentlyCompleted ? 1 : -1);
                        } else {
                            // Play sound effect
                            this.playSound(result.completed ? 'success' : 'notification');
                            
                            // Update streak if completed
                            if (result.completed) {
                                const streak = this.updateStreak(chore.child_id, choreId);
                                if (streak > 1) {
                                    this.showToast(`${this.getChildName(chore.child_id)} is on a ${streak}-day streak for this chore! 🔥`, 'success');
                                }
                            }
                            
                            // API result matches, reload completions and check achievements
                            await this.loadCompletions();
                            this.checkAchievements(chore.child_id, choreId);
                            
                            // Check for achievement badges
                            await this.checkAchievementBadges(chore.child_id);
                            
                            // Update progress with real data
                            this.updateChildProgressWithRealData(chore.child_id);
                        }
                    } else {
                        // API failed, revert optimistic update
                        console.error('Failed to update chore:', result.error);
                        this.playSound('error');
                        if (isCurrentlyCompleted) {
                            cell.classList.add('completed');
                            cell.textContent = '✓';
                        } else {
                            cell.classList.remove('completed');
                            cell.textContent = '';
                        }
                        this.updateChildProgressOptimistically(chore.child_id, isCurrentlyCompleted ? 1 : -1);
                    }
                }
            });
        });

        card.querySelectorAll('.add-chore-empty-btn').forEach(btn => {
            console.log('Adding click handler to empty chore button');
            btn.addEventListener('click', () => {
                console.log('Empty chore button clicked for child:', childId);
                this.showModal('add-chore-modal');
                // Set the child in the dropdown
                const childSelect = document.getElementById('chore-child');
                if (childSelect) {
                    childSelect.value = childId;
                }
                // Clear the first chore entry
                const firstChoreInput = document.getElementById('chore-name-1');
                if (firstChoreInput) {
                    firstChoreInput.value = '';
                }
            });
        });

        card.querySelectorAll('.add-chore-grid-btn').forEach(btn => {
            console.log('Adding click handler to grid chore button');
            btn.addEventListener('click', () => {
                console.log('Grid chore button clicked for child:', childId);
                this.showModal('add-chore-modal');
                // Set the child in the dropdown
                const childSelect = document.getElementById('chore-child');
                if (childSelect) {
                    childSelect.value = childId;
                }
                // Clear the first chore entry
                const firstChoreInput = document.getElementById('chore-name-1');
                if (firstChoreInput) {
                    firstChoreInput.value = '';
                }
            });
        });
    }

    calculateChildProgress(childId, childChores, childCompletions) {
        let totalEarnings = 0;
        let totalDaysCompleted = 0;
        let totalChoreDays = childChores.length * 7; // Each chore should be completed 7 days per week
        
        // Get family settings for reward calculation
        const dailyReward = this.familySettings?.daily_reward_cents || 7;
        const weeklyBonus = this.familySettings?.weekly_bonus_cents || 1;
        
        childChores.forEach(chore => {
            const choreCompletions = childCompletions.filter(comp => comp.chore_id === chore.id);
            choreCompletions.forEach(comp => {
                // currentWeekStart is a string, so we need to create a Date object for comparison
                const weekStartDate = new Date(this.currentWeekStart);
                if (comp.day_of_week >= weekStartDate.getDay() && comp.day_of_week < weekStartDate.getDay() + 7) {
                    totalDaysCompleted++;
                }
            });
        });
        
        const completionPercentage = totalChoreDays > 0 ? (totalDaysCompleted / totalChoreDays) * 100 : 0;
        
        // Calculate earnings using family settings
        totalEarnings = totalDaysCompleted * dailyReward;
        
        // Add weekly bonus if all chores are completed for the week
        if (totalDaysCompleted === totalChoreDays && totalChoreDays > 0) {
            totalEarnings += weeklyBonus;
        }
        
        console.log('Progress calculation:', {
            childId,
            childChores: childChores.length,
            totalChoreDays,
            totalDaysCompleted,
            completionPercentage,
            totalEarnings,
            dailyReward,
            weeklyBonus
        });
        
        return {
            completionPercentage: completionPercentage,
            totalEarnings: totalEarnings
        };
    }

    calculateStars(completionPercentage) {
        let starsHtml = '';
        const fullStars = Math.floor(completionPercentage / 20); // 20% per star
        const halfStar = completionPercentage % 20 >= 10 ? '⭐️' : ''; // 10% for half star
        for (let i = 0; i < fullStars; i++) {
            starsHtml += '⭐️';
        }
        if (halfStar) {
            starsHtml += halfStar;
        }
        return starsHtml;
    }

    formatCents(cents) {
        const dollars = cents / 100;
        return `$${dollars.toFixed(2)}`;
    }

    // Optimistic update helpers
    updateChildProgressOptimistically(childId, changeInCompletions) {
        const childCard = document.querySelector(`[data-child-id="${childId}"]`);
        if (!childCard) return;

        // Get current progress elements
        const progressFill = childCard.querySelector('.progress-fill');
        const progressStats = childCard.querySelector('.progress-stats');
        const starsContainer = childCard.querySelector('.stars-container');
        const earningsAmount = childCard.querySelector('.earnings-amount');

        if (!progressFill || !progressStats || !starsContainer || !earningsAmount) return;

        // Calculate new values
        const childChores = this.chores.filter(chore => chore.child_id === childId);
        const totalChoreDays = childChores.length * 7;

        // Get current completion count from progress stats (parse the X/Y days string)
        const currentStats = progressStats.textContent;
        const match = currentStats.match(/(\d+)[^\d]+(\d+)/);
        let currentCompleted = 0;
        let maxDays = 0;
        if (match) {
            currentCompleted = parseInt(match[1], 10);
            maxDays = parseInt(match[2], 10);
        }
        // Use totalChoreDays as the true max
        const newCompleted = Math.max(0, Math.min(totalChoreDays, currentCompleted + changeInCompletions));

        // Calculate new percentage and earnings
        const completionPercentage = totalChoreDays > 0 ? (newCompleted / totalChoreDays) * 100 : 0;
        const dailyReward = this.familySettings?.daily_reward_cents || 7;
        const weeklyBonus = this.familySettings?.weekly_bonus_cents || 1;
        let totalEarnings = newCompleted * dailyReward;

        // Add weekly bonus if all chores completed
        if (newCompleted === totalChoreDays && totalChoreDays > 0) {
            totalEarnings += weeklyBonus;
        }

        // Update UI elements
        progressFill.style.width = `${completionPercentage}%`;
        progressStats.innerHTML = `<span>${newCompleted}/${totalChoreDays} days</span><span>${Math.round(completionPercentage)}% complete</span>`;
        starsContainer.innerHTML = this.calculateStars(completionPercentage);
        earningsAmount.textContent = this.formatCents(totalEarnings);
    }

    updateChildProgressWithRealData(childId) {
        const childCard = document.querySelector(`[data-child-id="${childId}"]`);
        if (!childCard) return;

        // Get real progress data
        const childChores = this.chores.filter(chore => chore.child_id === childId);
        const childCompletions = this.completions.filter(comp => 
            childChores.some(chore => chore.id === comp.chore_id)
        );
        const progress = this.calculateChildProgress(childId, childChores, childCompletions);

        // Update UI elements with real data
        const progressFill = childCard.querySelector('.progress-fill');
        const progressStats = childCard.querySelector('.progress-stats');
        const starsContainer = childCard.querySelector('.stars-container');
        const earningsAmount = childCard.querySelector('.earnings-amount');

        if (progressFill && progressStats && starsContainer && earningsAmount) {
            progressFill.style.width = `${progress.completionPercentage}%`;
            progressStats.innerHTML = `<span>${Math.floor(progress.totalEarnings / (this.familySettings?.daily_reward_cents || 7))}/7 days</span><span>${Math.round(progress.completionPercentage)}% complete</span>`;
            starsContainer.innerHTML = this.calculateStars(progress.completionPercentage);
            earningsAmount.textContent = this.formatCents(progress.totalEarnings);
        }
    }

    // Celebration Functions
    celebrateFullDay(childName) {
        // Show a toast notification
        this.showToast(`🎉 ${childName} completed all chores for today! Amazing job!`, 'success');
        
        // Add a fun animation to the child's card
        const childCard = document.querySelector(`[data-child-id="${this.children.find(c => c.name === childName)?.id}"]`);
        if (childCard) {
            childCard.style.animation = 'bounce 0.6s ease-in-out';
            setTimeout(() => {
                childCard.style.animation = '';
            }, 600);
        }
        
        // Play a success sound (if available)
        this.playSound('success');
    }

    celebrateFullWeek(childName) {
        // Show confetti
        try {
            if (typeof confetti === 'function') {
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                });
                console.log('Confetti triggered for:', childName);
            } else {
                console.warn('Confetti library not loaded');
            }
        } catch (error) {
            console.error('Confetti error:', error);
        }
        
        // Show a special toast
        this.showToast(`🌟 ${childName} completed the ENTIRE WEEK! You're a superstar! 🌟`, 'success');
        
        // Add a special animation to the child's card
        const childCard = document.querySelector(`[data-child-id="${this.children.find(c => c.name === childName)?.id}"]`);
        if (childCard) {
            childCard.style.animation = 'starPop 1s ease-in-out';
            setTimeout(() => {
                childCard.style.animation = '';
            }, 1000);
        }
        
        // Play a celebration sound (if available)
        this.playSound('celebration');
    }

    playSuccessSound() {
        // Create a simple success sound using Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (error) {
            console.log('Audio not supported');
        }
    }

    playCelebrationSound() {
        // Create a celebration sound using Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Play a sequence of notes
            const notes = [523, 659, 784, 1047]; // C, E, G, C (higher)
            let time = audioContext.currentTime;
            
            notes.forEach((frequency, index) => {
                oscillator.frequency.setValueAtTime(frequency, time + index * 0.1);
                gainNode.gain.setValueAtTime(0.1, time + index * 0.1);
                gainNode.gain.exponentialRampToValueAtTime(0.01, time + (index + 1) * 0.1);
            });
            
            oscillator.start(time);
            oscillator.stop(time + notes.length * 0.1);
        } catch (error) {
            console.log('Audio not supported');
        }
    }

    // Check for achievements when chore is completed
    checkAchievements(childId, choreId) {
        const child = this.children.find(c => c.id === childId);
        if (!child) return;
        
        const childChores = this.chores.filter(chore => chore.child_id === childId);
        const childCompletions = this.completions.filter(comp => 
            childChores.some(chore => chore.id === comp.chore_id)
        );
        
        // Check for full day completion
        const today = new Date();
        const todayCompletions = childCompletions.filter(comp => {
            const compDate = new Date(comp.completed_at);
            return compDate.toDateString() === today.toDateString();
        });
        
        if (todayCompletions.length === childChores.length && childChores.length > 0) {
            this.celebrateFullDay(child.name);
        }
        
        // Check for full week completion
        const weekStart = this.apiClient.getWeekStart();
        const weekStartDate = new Date(weekStart);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        const weekCompletions = childCompletions.filter(comp => {
            const compDate = new Date(comp.completed_at);
            return compDate >= weekStartDate && compDate <= weekEnd;
        });
        
        const totalWeekChores = childChores.length * 7; // Each chore should be completed 7 days per week
        
        console.log('Checking achievements:', {
            childName: child.name,
            weekCompletions: weekCompletions.length,
            totalWeekChores,
            weekStart: weekStart,
            weekEnd: weekEnd.toISOString()
        });
        
        if (weekCompletions.length >= totalWeekChores && totalWeekChores > 0) {
            console.log('🎉 Full week achievement triggered for:', child.name);
            this.celebrateFullWeek(child.name);
        }
    }

    populateManageChildrenList() {
        const container = document.getElementById('manage-children-list');
        if (!container) return;
        
        if (this.children.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: var(--space-8); color: var(--gray-500);">
                    <div style="font-size: 3rem; margin-bottom: var(--space-3);">👶</div>
                    <h4 style="margin-bottom: var(--space-2); color: var(--gray-700);">No children yet</h4>
                    <p style="margin-bottom: var(--space-4);">Add your first child to get started!</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        this.children.forEach(child => {
            const gradient = this.getChildGradient(child.avatar_color);
            let avatarHtml = '';
            if (child.avatar_url) {
                avatarHtml = `<img src="${child.avatar_url}" class="child-avatar-small" style="object-fit:cover;">`;
            } else if (child.avatar_file) {
                avatarHtml = `<img src="${child.avatar_file}" class="child-avatar-small" style="object-fit:cover;">`;
            } else {
                avatarHtml = `<div class="child-avatar-small" style="background:${gradient};">${child.name.charAt(0).toUpperCase()}</div>`;
            }
            
            const childChores = this.chores.filter(chore => chore.child_id === child.id);
            
            html += `
                <div class="manage-child-item" data-child-id="${child.id}" style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-4);border:1px solid var(--gray-200);border-radius:var(--radius);margin-bottom:var(--space-3);background:white;">
                    <div style="display:flex;align-items:center;gap:var(--space-3);">
                        ${avatarHtml}
                        <div>
                            <h4 style="margin:0;color:var(--gray-800);">${child.name}</h4>
                            <p style="margin:0;color:var(--gray-600);font-size:var(--font-size-sm);">Age ${child.age} • ${childChores.length} chore${childChores.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                    <div style="display:flex;gap:var(--space-2);">
                        <button class="btn btn-danger btn-sm remove-child-manage" data-child-id="${child.id}">🗑️ Remove</button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
        // Add event listeners
        this.addManageChildrenHandlers();
    }

    addManageChildrenHandlers() {
        // Remove child buttons
        document.querySelectorAll('.remove-child-manage').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const childId = e.target.dataset.childId;
                const child = this.children.find(c => c.id === childId);
                if (child) {
                    const confirmed = confirm(`Are you sure you want to remove ${child.name}? This will also delete all their chores and completion data.`);
                    if (confirmed) {
                        const result = await this.deleteChild(childId);
                        if (result.success) {
                            this.showToast(`${child.name} has been removed`, 'success');
                            // Refresh the manage children list
                            this.populateManageChildrenList();
                            // Also refresh the child tabs
                            this.generateChildTabs();
                            // Refresh the main view
                            this.renderChildren();
                        } else {
                            this.showToast('Failed to remove child', 'error');
                        }
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
        
        // Only show toast if theme actually changed
        if (this.settings.theme === newTheme) {
            this.showToast(`Switched to ${newTheme} mode`, 'success');
        }
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
        
        // Set data attribute for CSS selectors
        root.setAttribute('data-theme', theme);
        
        // Apply CSS custom properties for immediate effect
        if (theme === 'dark') {
            root.style.setProperty('--bg-primary', '#1a1a1a');
            root.style.setProperty('--bg-secondary', '#2d2d2d');
            root.style.setProperty('--text-primary', '#ffffff');
            root.style.setProperty('--text-secondary', '#cccccc');
            root.style.setProperty('--border-color', '#444444');
            root.style.setProperty('--card-bg', '#2d2d2d');
            root.style.setProperty('--modal-bg', '#2d2d2d');
        } else {
            root.style.setProperty('--bg-primary', '#ffffff');
            root.style.setProperty('--bg-secondary', '#f8fafc');
            root.style.setProperty('--text-primary', '#1f2937');
            root.style.setProperty('--text-secondary', '#6b7280');
            root.style.setProperty('--border-color', '#e5e7eb');
            root.style.setProperty('--card-bg', '#ffffff');
            root.style.setProperty('--modal-bg', '#ffffff');
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
        
        // Update theme selector
        const themeSelector = document.getElementById('theme-selector');
        if (themeSelector) {
            themeSelector.value = theme;
        }
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

    resetAllStreaks() {
        if (confirm('Are you sure you want to reset all streaks? This cannot be undone.')) {
            this.streaks = {};
            this.saveStreaks();
            this.updateStreakDisplay();
            this.showToast('All streaks have been reset.', 'success');
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
        root.classList.add(`${this.settings.theme}-theme`);
        
        // Force apply CSS variables
        if (this.settings.theme === 'dark') {
            root.style.setProperty('--bg-primary', '#1a1a1a');
            root.style.setProperty('--bg-secondary', '#2d2d2d');
            root.style.setProperty('--text-primary', '#ffffff');
            root.style.setProperty('--text-secondary', '#cccccc');
            root.style.setProperty('--border-color', '#444444');
            root.style.setProperty('--card-bg', '#2d2d2d');
            root.style.setProperty('--modal-bg', '#2d2d2d');
            document.body.style.backgroundColor = '#1a1a1a';
            document.body.style.color = '#ffffff';
        } else {
            root.style.setProperty('--bg-primary', '#ffffff');
            root.style.setProperty('--bg-secondary', '#f8fafc');
            root.style.setProperty('--text-primary', '#1f2937');
            root.style.setProperty('--text-secondary', '#6b7280');
            root.style.setProperty('--border-color', '#e5e7eb');
            root.style.setProperty('--card-bg', '#ffffff');
            root.style.setProperty('--modal-bg', '#ffffff');
            document.body.style.backgroundColor = '#ffffff';
            document.body.style.color = '#1f2937';
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

    // --- Add Child Modal DiceBear Picker ---
    const addDicebearPicker = document.getElementById('add-dicebear-picker');
    let selectedAddDicebearUrl = '';
    function renderAddDicebearPicker(name) {
        addDicebearPicker.innerHTML = '';
        // Show 20 avatars instead of 10 (matching Edit Child modal)
        const seeds = diceBearSeeds.concat(name || 'Avatar');
        for (let i = 0; i < 20; i++) {
            const seed = seeds[i % seeds.length] + (i > 9 ? i : '');
            const url = getDiceBearUrl(seed);
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'dicebear-avatar-btn';
            btn.innerHTML = `<img src="${url}" style="width:40px;height:40px;border-radius:50%;">`;
            btn.onclick = () => {
                selectedAddDicebearUrl = url;
                // Update preview
                addAvatarPreview.innerHTML = `<img src="${url}" style="width:40px;height:40px;border-radius:50%;">`;
                addAvatarPreview.dataset.avatarUrl = url;
                delete addAvatarPreview.dataset.avatarFile;
                addAvatarPreview.style.display = '';
                // Mark selected
                addDicebearPicker.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            };
            addDicebearPicker.appendChild(btn);
        }
    }
    document.getElementById('child-name').addEventListener('input', e => {
        renderAddDicebearPicker(e.target.value);
    });
    renderAddDicebearPicker('');

    // --- Add Child Modal Avatar Logic ---
    document.getElementById('add-avatar-remove-btn').onclick = () => {
        // Always clear the preview and dataset before inserting fallback initial
        while (addAvatarPreview.firstChild) {
            addAvatarPreview.removeChild(addAvatarPreview.firstChild);
        }
        addAvatarPreview.removeAttribute('data-avatar-url');
        addAvatarPreview.removeAttribute('data-avatar-file');
        addAvatarPreview.style.display = 'none';
        selectedAddDicebearUrl = '';
    };

    // --- Edit Child Modal DiceBear Picker ---
    const editDicebearPicker = document.getElementById('edit-dicebear-picker');
    let selectedEditDicebearUrl = '';
    function renderEditDicebearPicker(name) {
        editDicebearPicker.innerHTML = '';
        // Show 20 avatars instead of 10
        const seeds = diceBearSeeds.concat(name || 'Avatar');
        for (let i = 0; i < 20; i++) {
            const seed = seeds[i % seeds.length] + (i > 9 ? i : '');
            const url = getDiceBearUrl(seed);
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'dicebear-avatar-btn';
            btn.innerHTML = `<img src="${url}" style="width:40px;height:40px;border-radius:50%;">`;
            btn.onclick = () => {
                selectedEditDicebearUrl = url;
                // Update preview
                editAvatarPreview.innerHTML = `<img src="${url}" style="width:40px;height:40px;border-radius:50%;">`;
                editAvatarPreview.dataset.avatarUrl = url;
                delete editAvatarPreview.dataset.avatarFile;
                editAvatarPreview.style.display = '';
                // Mark selected
                editDicebearPicker.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            };
            editDicebearPicker.appendChild(btn);
        }
    }
    document.getElementById('edit-child-name').addEventListener('input', e => {
        renderEditDicebearPicker(e.target.value);
    });

    // --- Color Picker Active State for Edit Modal ---
    const editSelectedColor = document.getElementById('edit-selected-color');
    const editColorInput = document.getElementById('edit-child-color');
    document.querySelectorAll('#edit-child-modal .color-preset').forEach(preset => {
        preset.addEventListener('click', () => {
            const color = preset.dataset.color;
            editSelectedColor.style.background = color;
            editColorInput.value = color;
            document.querySelectorAll('#edit-child-modal .color-preset').forEach(p => p.classList.remove('active'));
            preset.classList.add('active');
        });
    });

    // Update selected color circle when color picker changes
    editColorInput.addEventListener('input', () => {
        editSelectedColor.style.background = editColorInput.value;
    });



    // --- Edit Child Modal Avatar Logic ---
    const editAvatarPreview = document.getElementById('edit-child-avatar-preview');
    document.getElementById('edit-avatar-remove-btn').onclick = () => {
        // Always clear the preview and dataset before inserting fallback initial
        while (editAvatarPreview.firstChild) {
            editAvatarPreview.removeChild(editAvatarPreview.firstChild);
        }
        editAvatarPreview.removeAttribute('data-avatar-url');
        editAvatarPreview.removeAttribute('data-avatar-file');
        editAvatarPreview.style.display = 'none';
        selectedEditDicebearUrl = '';
    };

    // --- On openEditChildModal, render picker and set selected ---
    window.openEditChildModal = function(child) {
        const editChildModal = document.getElementById('edit-child-modal');
        const editAvatarPreview = document.getElementById('edit-child-avatar-preview');
        const editSelectedColor = document.getElementById('edit-selected-color');
        const editColorInput = document.getElementById('edit-child-color');
        const editPreviewCircle = document.getElementById('edit-child-avatar-preview-circle');
        
        document.getElementById('edit-child-name').value = child.name;
        document.getElementById('edit-child-age').value = child.age;
        
        // Set selected color circle and input
        const color = child.avatar_color || '#6366f1';
        editSelectedColor.style.background = color;
        editColorInput.value = color;
        
        // Set preview circle with child's actual initial
        const name = child.name.trim();
        const initial = name ? name[0].toUpperCase() : 'A';
        editPreviewCircle.textContent = initial;
        editPreviewCircle.style.background = color;
        
        // Set active color swatch
        document.querySelectorAll('#edit-child-modal .color-preset').forEach(preset => {
            if (preset.dataset.color === color) {
                preset.classList.add('active');
            } else {
                preset.classList.remove('active');
            }
        });
        renderEditDicebearPicker(child.name);
        selectedEditDicebearUrl = '';
        // Only show preview if avatar is selected
        editAvatarPreview.innerHTML = '';
        editAvatarPreview.style.display = 'none';
        delete editAvatarPreview.dataset.avatarUrl;
        delete editAvatarPreview.dataset.avatarFile;
        if (child.avatar_url) {
            const img = document.createElement('img');
            img.src = child.avatar_url;
            img.style.width = '40px';
            img.style.height = '40px';
            img.style.borderRadius = '50%';
            img.style.objectFit = 'cover';
            editAvatarPreview.appendChild(img);
            editAvatarPreview.dataset.avatarUrl = child.avatar_url;
            editAvatarPreview.style.display = '';
        } else if (child.avatar_file) {
            const img = document.createElement('img');
            img.src = child.avatar_file;
            img.style.width = '40px';
            img.style.height = '40px';
            img.style.borderRadius = '50%';
            img.style.objectFit = 'cover';
            editAvatarPreview.appendChild(img);
            editAvatarPreview.dataset.avatarFile = child.avatar_file;
            editAvatarPreview.style.display = '';
        }
        editChildModal.classList.remove('hidden');
        editChildModal.dataset.childId = child.id;
    };

    // --- Save handler for edit-child-form ---
    document.getElementById('edit-child-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const editChildModal = document.getElementById('edit-child-modal');
        const childId = editChildModal.dataset.childId;
        const name = document.getElementById('edit-child-name').value;
        const age = parseInt(document.getElementById('edit-child-age').value);
        const editColorInput = document.getElementById('edit-child-color');
        const color = editColorInput.value;
        let avatarUrl = '';
        let avatarFile = '';
        const editAvatarPreview = document.getElementById('edit-child-avatar-preview');
        if (editAvatarPreview) {
            if (editAvatarPreview.dataset.avatarUrl) {
                avatarUrl = editAvatarPreview.dataset.avatarUrl;
            } else if (editAvatarPreview.dataset.avatarFile) {
                avatarFile = editAvatarPreview.dataset.avatarFile;
            }
        }
        // Save selected DiceBear avatar if no custom avatar
        if (!avatarUrl && selectedEditDicebearUrl) {
            avatarUrl = selectedEditDicebearUrl;
        }
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

    // --- Cancel handler for edit-child-modal ---
    document.addEventListener('click', (e) => {
        if (e.target.matches('[data-modal="edit-child-modal"]') || 
            e.target.closest('[data-modal="edit-child-modal"]')) {
            const editChildModal = document.getElementById('edit-child-modal');
            editChildModal.classList.add('hidden');
            // Reset form
            document.getElementById('edit-child-form').reset();
            // Clear avatar preview
            const editAvatarPreview = document.getElementById('edit-child-avatar-preview');
            if (editAvatarPreview) {
                editAvatarPreview.innerHTML = '';
                editAvatarPreview.style.display = 'none';
                delete editAvatarPreview.dataset.avatarUrl;
                delete editAvatarPreview.dataset.avatarFile;
            }
            // Reset DiceBear selection
            selectedEditDicebearUrl = '';
        }
    });

    // --- Save handler for add-child-form ---
    document.getElementById('add-child-form').addEventListener('submit', async (e) => {
        e.preventDefault();
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
        // Save selected DiceBear avatar if no custom avatar
        if (!avatarUrl && selectedAddDicebearUrl) {
            avatarUrl = selectedAddDicebearUrl;
        }
        const result = await app.apiClient.createChild(name, age, color, avatarUrl, avatarFile);
        if (result.success) {
            window.analytics.trackAddChild(name, age);
            app.hideModal('add-child-modal');
            app.showToast(`Added ${name} to your family!`, 'success');
            await app.loadChildren();
            app.renderChildren();
        } else {
            window.analytics.trackError('add_child', result.error);
            app.showToast(result.error, 'error');
        }
    });

    // Live avatar preview for Add Child modal
    const addNameInput = document.getElementById('child-name');
    const addColorInput = document.getElementById('child-color');
    const addPreviewCircle = document.getElementById('add-child-avatar-preview-circle');
    const addAvatarPreview = document.getElementById('child-avatar-preview');
    
    // --- Color Picker Active State for Add Modal ---
    const addSelectedColor = document.getElementById('add-selected-color');
    document.querySelectorAll('#add-child-modal .color-preset').forEach(preset => {
        preset.addEventListener('click', () => {
            const color = preset.dataset.color;
            addSelectedColor.style.background = color;
            addColorInput.value = color;
            document.querySelectorAll('#add-child-modal .color-preset').forEach(p => p.classList.remove('active'));
            preset.classList.add('active');
        });
    });

    // Update selected color circle when color picker changes
    addColorInput.addEventListener('input', () => {
        addSelectedColor.style.background = addColorInput.value;
    });
    function updateAddChildAvatarPreview() {
        // If an image is uploaded, hide the circle
        if (addAvatarPreview && addAvatarPreview.querySelector('img')) {
            addPreviewCircle.style.display = 'none';
            return;
        } else {
            addPreviewCircle.style.display = 'flex';
        }
        const name = addNameInput.value.trim();
        const color = addColorInput.value || '#6366f1';
        addPreviewCircle.style.background = color;
        addPreviewCircle.textContent = name ? name[0].toUpperCase() : 'A';
    }
    addNameInput.addEventListener('input', updateAddChildAvatarPreview);
    addColorInput.addEventListener('input', updateAddChildAvatarPreview);
    if (addAvatarPreview) {
        const observer = new MutationObserver(updateAddChildAvatarPreview);
        observer.observe(addAvatarPreview, { childList: true });
    }
    updateAddChildAvatarPreview();

    // Live avatar preview for Edit Child modal
    const editNameInput2 = document.getElementById('edit-child-name');
    const editColorInput2 = document.getElementById('edit-child-color');
    const editPreviewCircle2 = document.getElementById('edit-child-avatar-preview-circle');
    const editAvatarPreview2 = document.getElementById('edit-child-avatar-preview');
    function updateEditChildAvatarPreview2() {
        // If an image is uploaded, hide the circle
        if (editAvatarPreview2 && editAvatarPreview2.querySelector('img')) {
            editPreviewCircle2.style.display = 'none';
            return;
        } else {
            editPreviewCircle2.style.display = 'flex';
        }
        const name = editNameInput2.value.trim();
        const color = editColorInput2.value || '#6366f1';
        editPreviewCircle2.style.background = color;
        editPreviewCircle2.textContent = name ? name[0].toUpperCase() : 'A';
    }
    editNameInput2.addEventListener('input', updateEditChildAvatarPreview2);
    editColorInput2.addEventListener('input', updateEditChildAvatarPreview2);
    if (editAvatarPreview2) {
        const observer2 = new MutationObserver(updateEditChildAvatarPreview2);
        observer2.observe(editAvatarPreview2, { childList: true });
    }
    updateEditChildAvatarPreview2();
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
    
    // Make copyFamilyCode available globally
    window.app.copyFamilyCode = function() {
        if (app && typeof app.copyFamilyCode === 'function') {
            app.copyFamilyCode();
        }
    };
} 