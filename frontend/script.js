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
        
        this.init();
    }

    async init() {
        try {
            // Show loading screen
            this.showLoading();
            
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
            
            // Set up real-time subscriptions
            this.setupRealtime();
            
            // Show main app
            this.showApp();
            
            // Render everything
            this.renderChildren();
            
        } catch (error) {
            console.error('Load app error:', error);
            this.showToast('Error loading family data', 'error');
        }
    }

    async loadChildren() {
        this.children = await this.apiClient.getChildren();
    }

    async loadChores() {
        this.chores = await this.apiClient.getChores();
    }

    async loadCompletions() {
        this.currentWeekStart = this.apiClient.getWeekStart();
        this.completions = await this.apiClient.getChoreCompletions(this.currentWeekStart);
    }

    setupRealtime() {
        this.subscription = this.apiClient.subscribeToChanges((payload) => {
            console.log('Real-time update:', payload);
            
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
                this.loadChildren().then(() => {
                    this.renderChildren();
                });
            }
        });
    }

    // UI State Management
    showLoading() {
        document.getElementById('loading-screen').classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loading-screen').classList.add('hidden');
    }

    showAuth() {
        document.getElementById('auth-container').classList.remove('hidden');
        document.getElementById('app-container').classList.add('hidden');
        this.setupAuthHandlers();
    }

    showApp() {
        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');
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
            await this.loadApp();
        } else {
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
            this.showToast('Account created! Please check your email to verify your account.', 'success');
            this.switchAuthForm('login');
        } else {
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

        // Modal handlers
        this.setupModalHandlers();
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
        // Close modal buttons
        document.querySelectorAll('.modal-close, [data-modal]').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const modalId = button.dataset.modal || button.closest('.modal').id;
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
    }

    showModal(modalId) {
        document.getElementById(modalId).classList.remove('hidden');
        
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
                        <label for="chore-reward-1">Reward (in cents)</label>
                        <input type="number" id="chore-reward-1" min="1" max="100" value="7" required>
                        <small>Default is 7¢ per day when completed</small>
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

        if (!name || !age) {
            this.showToast('Please fill in all fields', 'error');
            return;
        }

        const result = await this.apiClient.createChild(name, age, color);
        
        if (result.success) {
            this.children.push(result.child);
            this.renderChildren();
            this.hideModal('add-child-modal');
            this.showToast(`Added ${name} to your family!`, 'success');
        } else {
            this.showToast(result.error, 'error');
        }
    }

    async handleAddChore() {
        const childId = document.getElementById('chore-child').value;
        
        if (!childId) {
            this.showToast('Please select a child', 'error');
            return;
        }

        // Get all chore entries
        const choreEntries = document.querySelectorAll('.chore-entry');
        const choresToAdd = [];

        for (let i = 0; i < choreEntries.length; i++) {
            const entry = choreEntries[i];
            const name = entry.querySelector(`#chore-name-${i + 1}`).value;
            const reward = parseInt(entry.querySelector(`#chore-reward-${i + 1}`).value);

            if (name && reward) {
                choresToAdd.push({ name, reward, childId });
            }
        }

        if (choresToAdd.length === 0) {
            this.showToast('Please fill in at least one chore', 'error');
            return;
        }

        // Create all chores
        let successCount = 0;
        let errorCount = 0;

        for (const chore of choresToAdd) {
            const result = await this.apiClient.createChore(chore.name, chore.reward, chore.childId);
            
            if (result.success) {
                this.chores.push(result.chore);
                successCount++;
            } else {
                errorCount++;
                console.error('Failed to create chore:', chore.name, result.error);
            }
        }

        if (successCount > 0) {
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

    showSettingsModal() {
        // Populate current settings
        if (this.familySettings) {
            document.getElementById('daily-reward').value = this.familySettings.daily_reward_cents;
            document.getElementById('weekly-bonus').value = this.familySettings.weekly_bonus_cents;
        }
        
        this.showModal('settings-modal');
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

    // Rendering
    renderChildren() {
        const container = document.getElementById('children-grid');
        const emptyState = document.getElementById('empty-state');

        if (this.children.length === 0) {
            container.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        container.innerHTML = '';

        this.children.forEach(child => {
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

        const childChores = this.chores.filter(chore => chore.child_id === child.id);
        const childCompletions = this.completions.filter(comp => 
            childChores.some(chore => chore.id === comp.chore_id)
        );

        // Calculate progress
        const progress = this.calculateChildProgress(child.id, childChores, childCompletions);

        card.innerHTML = `
            <div class="child-header">
                <div class="child-avatar">${child.name.charAt(0).toUpperCase()}</div>
                <div class="child-info">
                    <h3>${child.name}</h3>
                    <p>Age ${child.age}</p>
                </div>
            </div>

            <div class="progress-section">
                <div class="progress-header">
                    <div class="progress-title">This Week's Progress</div>
                    <div class="progress-stats">
                        <span>${progress.completedChores}/${progress.totalChores} chores</span>
                        <span>${progress.completionPercentage}% complete</span>
                    </div>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress.completionPercentage}%"></div>
                </div>
            </div>

            <div class="chore-grid">
                ${this.renderChoreGrid(childChores, childCompletions)}
            </div>

            <div class="earnings-section">
                <div class="earnings-amount">${this.formatCents(progress.totalEarnings)}</div>
                <div class="earnings-label">Total Earnings This Week</div>
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
                    <button class="btn btn-primary" onclick="app.showModal('add-chore-modal')">
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
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <span>${chore.name}</span>
                            <span class="chore-reward">${chore.reward_cents}¢</span>
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
                <button class="btn btn-secondary" onclick="app.showModal('add-chore-modal')">
                    <span>📝</span> Add More Chores
                </button>
            </div>
        `;

        return html;
    }

    addChoreCellHandlers(card, chores) {
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
                            !(comp.chore_id === choreId && comp.day_of_week === day && comp.week_start === this.currentWeekStart)
                        );
                    }
                    
                    // Re-render to update progress
                    this.renderChildren();
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

        let completedChores = 0;
        let totalEarnings = 0;

        chores.forEach(chore => {
            const choreCompletions = completions.filter(comp => comp.chore_id === chore.id);
            const completedDays = choreCompletions.length;
            
            if (completedDays === 7) {
                completedChores++;
                totalEarnings += chore.reward_cents * 7;
            } else {
                totalEarnings += chore.reward_cents * completedDays;
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
                <label for="chore-reward-${choreCount}">Reward (in cents)</label>
                <input type="number" id="chore-reward-${choreCount}" min="1" max="100" value="7" required>
                <small>Default is 7¢ per day when completed</small>
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
            const rewardInput = entry.querySelector('input[type="number"]');
            
            nameInput.id = `chore-name-${number}`;
            rewardInput.id = `chore-reward-${number}`;
        });
        
        // Hide remove button if only one entry remains
        if (entries.length === 1) {
            entries[0].querySelector('.remove-chore').style.display = 'none';
        }
    }

    // Toast Notifications
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
        
        toast.innerHTML = `
            <div class="toast-content">
                <span>${icon}</span>
                <div>
                    <strong>${type.charAt(0).toUpperCase() + type.slice(1)}</strong>
                    <p>${message}</p>
                </div>
            </div>
        `;

        document.getElementById('toast-container').appendChild(toast);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }
}

// Initialize the application
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new FamilyChoreChart();
});

// Make app globally available for modal buttons
window.app = app; 