// Demo Page JavaScript - EXACTLY like main app
// This creates a completely separate demo experience that looks identical to the main app

console.log('🎭 Loading ChoreStar Demo Page...');

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

// DiceBear avatar seeds (for demo users) - matching main app style
const diceBearSeeds = ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Mason', 'Sophia', 'Lucas', 'Mia', 'Ethan'];
function getDiceBearUrl(seed) {
    return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(seed)}`;
}

// Demo data (completely separate from real data)
const demoData = {
    children: [
        {
            id: 'demo-emma',
            name: 'Emma',
            age: 8,
            avatar_color: '#ff6b6b',
            avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Emma'
        },
        {
            id: 'demo-liam',
            name: 'Liam',
            age: 6,
            avatar_color: '#4ecdc4',
            avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Liam'
        }
    ],
    chores: [
        {
            id: 'demo-chore-1',
            name: 'Make Bed',
            reward_cents: 50,
            child_id: 'demo-emma',
            icon: '🛏️',
            category: 'Bedroom',
            notes: 'Make sure sheets are tucked in',
            completed: true
        },
        {
            id: 'demo-chore-2',
            name: 'Feed Pet',
            reward_cents: 75,
            child_id: 'demo-emma',
            icon: '🐕',
            category: 'Pet Care',
            notes: 'Give fresh water and food',
            completed: true
        },
        {
            id: 'demo-chore-3',
            name: 'Set Table',
            reward_cents: 25,
            child_id: 'demo-emma',
            icon: '🍽️',
            category: 'Kitchen',
            notes: 'Put out plates, cups, and utensils',
            completed: false
        },
        {
            id: 'demo-chore-4',
            name: 'Put Away Toys',
            reward_cents: 30,
            child_id: 'demo-emma',
            icon: '🧸',
            category: 'Playroom',
            notes: 'Clean up all toys before bedtime',
            completed: true
        },
        {
            id: 'demo-chore-5',
            name: 'Brush Teeth',
            reward_cents: 20,
            child_id: 'demo-liam',
            icon: '🦷',
            category: 'Personal Care',
            notes: 'Morning and evening routine',
            completed: true
        },
        {
            id: 'demo-chore-6',
            name: 'Water Plants',
            reward_cents: 40,
            child_id: 'demo-liam',
            icon: '🌱',
            category: 'Garden',
            notes: 'Check soil and water if needed',
            completed: false
        },
        {
            id: 'demo-chore-7',
            name: 'Help with Laundry',
            reward_cents: 60,
            child_id: 'demo-liam',
            icon: '👕',
            category: 'Laundry',
            notes: 'Sort clothes and put away',
            completed: true
        },
        {
            id: 'demo-chore-8',
            name: 'Read for 15 minutes',
            reward_cents: 50,
            child_id: 'demo-liam',
            icon: '📚',
            category: 'Learning',
            notes: 'Choose a book and read quietly',
            completed: false
        }
    ]
};

// Demo app class to mimic main app structure
class DemoFamilyChoreChart {
    constructor() {
        this.currentUser = { id: 'demo-user', email: 'demo@chorestar.app' };
        this.profile = { family_name: 'Demo Family', email: 'demo@chorestar.app' };
        this.children = demoData.children;
        this.chores = demoData.chores;
        this.completions = [];
        this.currentWeekStart = this.getWeekStart(new Date());
        
        // Initialize demo completions to match initial chore grid state
        this.initializeDemoCompletions();
        this.currentChildTab = null;
        this.activeChildId = 'demo-emma';
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
        this.recentToasts = new Map();
        this.handlersInitialized = false;
        this.seasonalThemes = this.initializeSeasonalThemes();
        this.init();
    }

    async init() {
        try {
            this.showLoading();
            
            // Add anti-jump CSS early
            this.addAntiJumpCSS();
            
            // Load settings and streaks
            this.loadSettings();
            this.loadStreaks();
            
            // Skip authentication for demo
            await this.loadApp();
        } catch (error) {
            console.error('Demo initialization error:', error);
            this.showToast('Failed to initialize demo. Please refresh the page.', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async loadApp() {
        try {
            // Update family name in header
            document.getElementById('family-name').textContent = this.profile.family_name;
            
            // Initialize analytics for demo
            if (window.analytics) {
                window.analytics.init(
                    this.currentUser.id,
                    'demo',
                    'demo',
                    this.children.length
                );
                window.analytics.trackPageView('Demo Dashboard');
            }
            
            // Render the app
            this.renderApp();
            
            // Initialize event handlers
            this.initializeEventHandlers();
            
            // Show welcome message
            setTimeout(() => {
                this.showToast('Welcome to the ChoreStar demo! Try adding children and chores.', 'info');
            }, 1000);
            
        } catch (error) {
            console.error('Error loading demo app:', error);
            this.showToast('Demo failed to load', 'error');
        }
    }

    renderApp() {
        // Show app container, hide auth
        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');
        
        // Render children tabs
        this.renderChildrenTabs();
        
        // Render children content
        this.renderChildrenContent();
        
        // Update dashboard stats
        this.updateDashboardStats();
        
        // Show/hide empty state
        this.updateEmptyState();
    }

    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day;
        return new Date(d.setDate(diff));
    }

    initializeDemoCompletions() {
        // Initialize demo completions to match the initial chore grid state
        this.chores.forEach(chore => {
            const choreIndex = this.chores.indexOf(chore);
            
            // Even index chores: show 3 days completed (days 0, 1, 2)
            // Odd index chores: show 2 days completed (days 0, 1)
            const daysToComplete = choreIndex % 2 === 0 ? 3 : 2;
            
            for (let day = 0; day < daysToComplete; day++) {
                this.completions.push({
                    chore_id: chore.id,
                    day_of_week: day,
                    week_start: this.currentWeekStart
                });
            }
        });
    }

    addAntiJumpCSS() {
        const style = document.createElement('style');
        style.textContent = `
            .anti-jump {
                min-height: 100vh;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            .anti-jump.loaded {
                opacity: 1;
            }
        `;
        document.head.appendChild(style);
    }

    loadSettings() {
        // Load demo settings from localStorage or use defaults
        const saved = localStorage.getItem('chorestar_demo_settings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
    }

    saveSettings() {
        localStorage.setItem('chorestar_demo_settings', JSON.stringify(this.settings));
    }

    loadStreaks() {
        // Load demo streaks from localStorage
        const saved = localStorage.getItem('chorestar_demo_streaks');
        if (saved) {
            this.streaks = JSON.parse(saved);
        }
    }

    saveStreaks() {
        localStorage.setItem('chorestar_demo_streaks', JSON.stringify(this.streaks));
    }

    initializeSeasonalThemes() {
        return {
            spring: { name: 'Spring', emoji: '🌸', colors: ['#ff9a9e', '#fecfef', '#fecfef'] },
            summer: { name: 'Summer', emoji: '☀️', colors: ['#ffecd2', '#fcb69f', '#fcb69f'] },
            fall: { name: 'Fall', emoji: '🍂', colors: ['#ff9a9e', '#fad0c4', '#fad0c4'] },
            winter: { name: 'Winter', emoji: '❄️', colors: ['#a8edea', '#fed6e3', '#fed6e3'] }
        };
    }

    showLoading() {
        document.getElementById('loading-screen').classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loading-screen').classList.add('hidden');
    }

    showToast(message, type = 'info', duration = 5000) {
        // Create toast container if it doesn't exist
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        // Check for duplicate toasts
        const toastKey = `${message}-${type}`;
        if (this.recentToasts.has(toastKey)) {
            return;
        }
        this.recentToasts.set(toastKey, Date.now());

        // Clean up old toasts
        if (this.recentToasts.size > 10) {
            const oldest = Math.min(...this.recentToasts.values());
            for (const [key, time] of this.recentToasts.entries()) {
                if (time === oldest) {
                    this.recentToasts.delete(key);
                    break;
                }
            }
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-icon">${icons[type] || icons.info}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">&times;</button>
        `;
        
        container.appendChild(toast);
        
        // Auto-remove
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
                this.recentToasts.delete(toastKey);
            }
        }, duration);
        
        // Manual close
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.remove();
            this.recentToasts.delete(toastKey);
        });
    }

    updateEmptyState() {
        const emptyState = document.getElementById('empty-state');
        if (this.children.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
        }
    }

    // Create child card - EXACTLY like main app
    createChildCard(child) {
        const card = document.createElement('div');
        card.className = 'child-card fade-in';
        card.setAttribute('data-child-id', child.id);
        
        // Set child gradient based on avatar color
        const gradient = this.getChildGradient(child.avatar_color);
        card.style.setProperty('--child-gradient', gradient);
        
        // Avatar logic - EXACTLY like main app
        let avatarHtml = '';
        if (child.avatar_url) {
            avatarHtml = `<img src="${child.avatar_url}" class="child-avatar-img" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">`;
        } else if (child.avatar_file) {
            avatarHtml = `<img src="${child.avatar_file}" class="child-avatar-img" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">`;
        } else {
            avatarHtml = `<div class="child-avatar" style="background:${child.avatar_color || '#6366f1'};width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:bold;color:white;">${child.name.charAt(0).toUpperCase()}</div>`;
        }
        
        const childChores = this.chores.filter(chore => chore.child_id === child.id);
        const childCompletions = this.completions || []; // Demo completions
        
        // Calculate progress - EXACTLY like main app
        const progress = this.calculateChildProgress(child.id, childChores, childCompletions);
        
        // Calculate stars based on completion percentage - EXACTLY like main app
        const stars = this.calculateStars(progress.completionPercentage);
        
        // Calculate total streak for this child - EXACTLY like main app
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
                    <button class="btn btn-outline btn-sm" onclick="demoApp.openAddChoreModal()" title="Add Chore">
                        <span aria-hidden="true">➕</span> Add Chore
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
            <div class="chore-grid">
                ${this.renderChoreGrid(child.id, childChores)}
            </div>
            <div class="earnings-section">
                <div class="earnings-amount">${this.formatCents(progress.totalEarnings)}</div>
                <div class="earnings-label">💰 Earnings (7¢ per completed day)</div>
            </div>
        `;
        
        // Add click handlers for chore cells - EXACTLY like main app
        this.addChoreCellHandlers(card, childChores, child.id);
        
        return card;
    }

    // Render chore grid - EXACTLY like main app
    renderChoreGrid(childId, chores) {
        if (chores.length === 0) {
            return `
                <div style="text-align: center; padding: 2rem; color: var(--gray-500);">
                    <p>No chores yet! Add some chores to get started.</p>
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
            const icon = chore.icon || '📝';
            const category = chore.category || 'General';
            const notes = chore.notes || '';
            html += `
                <tr>
                    <td>
                        <div style="display: flex; align-items: center; gap: var(--space-2);">
                            <span style="font-size: 1.2rem;">${icon}</span>
                            <div>
                                <span style="font-weight: 600;">${chore.name}</span>
                                <div style="font-size: 0.875rem; color: var(--gray-600);">${category}</div>
                                ${notes ? `<div style="font-size: 0.75rem; color: var(--gray-500); margin-top: 2px;">${notes}</div>` : ''}
                            </div>
                        </div>
                    </td>
                    ${days.map((day, dayIndex) => {
                        // Demo: assign some completions based on chore ID for variety
                        // Show different completion patterns for different chores
                        let isCompleted = false;
                        const choreIndex = this.chores.indexOf(chore);
                        
                        if (choreIndex % 2 === 0) {
                            // Even index chores: show 3-4 days completed
                            isCompleted = dayIndex < 3;
                        } else {
                            // Odd index chores: show 1-2 days completed  
                            isCompleted = dayIndex < 2;
                        }
                        
                        return `
                            <td>
                                <button class="chore-cell ${isCompleted ? 'completed' : 'empty'}" 
                                        data-day="${dayIndex}" 
                                        data-chore-id="${chore.id}">
                                    ${isCompleted ? '✓' : ''}
                                </button>
                            </td>
                        `;
                    }).join('')}
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
        `;
        
        return html;
    }

    // Toggle chore completion for a specific day - EXACTLY like main app
    toggleChoreDay(choreId, dayIndex) {
        console.log('🎭 toggleChoreDay called with:', { choreId, dayIndex });
        
        const cell = document.querySelector(`[data-chore-id="${choreId}"][data-day="${dayIndex}"]`);
        if (!cell) {
            console.error('🎭 Cell not found for:', { choreId, dayIndex });
            return;
        }
        
        const chore = this.chores.find(c => c.id === choreId);
        if (!chore) {
            console.error('🎭 Chore not found for:', choreId);
            return;
        }
        
        // Prevent rapid-fire clicks
        if (cell.dataset.processing === 'true') {
            console.log('🎭 Cell is processing, ignoring click');
            return;
        }
        cell.dataset.processing = 'true';
        
        try {
            console.log('🎭 Demo chore cell clicked:', { choreId, day: dayIndex, childId: chore.child_id });
            const isCurrentlyCompleted = cell.classList.contains('completed');
            console.log('🎭 Is currently completed:', isCurrentlyCompleted);
            
            // Optimistic UI update - EXACTLY like main app
            if (isCurrentlyCompleted) {
                cell.classList.remove('completed');
                cell.classList.add('empty');
                cell.textContent = '';
                // Remove from demo completions array optimistically
                this.completions = this.completions.filter(comp => 
                    !(comp.chore_id === choreId && comp.day_of_week === dayIndex)
                );
                this.showToast('Chore unchecked!', 'info');
                console.log('🎭 Removed completion');
            } else {
                cell.classList.remove('empty');
                cell.classList.add('completed');
                cell.textContent = '✓'; // Use same checkmark as main app
                // Add to demo completions array optimistically
                this.completions.push({
                    chore_id: choreId,
                    day_of_week: dayIndex,
                    week_start: this.currentWeekStart
                });
                this.showToast('Great job! Chore completed! 🌟', 'success');
                console.log('🎭 Added completion, cell content:', cell.textContent);
            }
            
            // IMMEDIATELY update progress - EXACTLY like main app
            this.updateChildProgress(chore.child_id);
            this.updateDashboardStats();
            
            // Add subtle feedback
            this.addCellBounce(cell);
            
        } catch (error) {
            console.error('🎭 Demo chore toggle error:', error);
        } finally {
            // Remove processing flag
            cell.dataset.processing = 'false';
        }
    }

    // Helper functions - EXACTLY like main app
    getChildGradient(avatarColor) {
        const colorMap = {
            '#ff6b6b': 'linear-gradient(135deg, #ff6b6b, #ee5a52)',
            '#4ecdc4': 'linear-gradient(135deg, #4ecdc4, #44a08d)',
            '#45b7d1': 'linear-gradient(135deg, #45b7d1, #96c93d)',
            '#f9ca24': 'linear-gradient(135deg, #f9ca24, #f0932b)',
            '#eb4d4b': 'linear-gradient(135deg, #eb4d4b, #6c5ce7)',
            '#a55eea': 'linear-gradient(135deg, #a55eea, #26de81)',
            '#26de81': 'linear-gradient(135deg, #26de81, #20bf6b)',
            '#fd79a8': 'linear-gradient(135deg, #fd79a8, #e84393)'
        };
        return colorMap[avatarColor] || 'linear-gradient(135deg, #6366f1, #8b5cf6)';
    }

    calculateChildProgress(childId, childChores, childCompletions) {
        if (childChores.length === 0) {
            return { completionPercentage: 0, totalEarnings: 0, completedDays: 0, totalDays: 7 };
        }
        
        // Use demo completions array - EXACTLY like main app
        const currentWeekStart = this.currentWeekStart;
        const weekCompletions = this.completions.filter(comp => {
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
        
        // Calculate percentage based on perfect days (like main app)
        const completionPercentage = Math.round((perfectDays / 7) * 100);
        
        // Calculate earnings (demo: use daily reward system)
        const dailyRewardCents = 7; // Demo daily reward
        const daysWithAnyCompletions = completionsPerDay.size;
        const totalEarnings = daysWithAnyCompletions * dailyRewardCents;
        
        return { completionPercentage, totalEarnings, completedDays: perfectDays, totalDays: 7 };
    }

    getCompletedCellsForChore(choreId) {
        // Count actual completed cells from the DOM
        const completedCells = document.querySelectorAll(`[data-chore-id="${choreId}"].completed`);
        return completedCells.length;
    }

    calculateStars(completionPercentage) {
        const maxStars = 5;
        const stars = [];
        
        for (let i = 0; i < maxStars; i++) {
            const threshold = (i + 1) * 20; // 20%, 40%, 60%, 80%, 100%
            const isEarned = completionPercentage >= threshold;
            stars.push(`
                <div class="star ${isEarned ? 'earned' : ''}">
                    ${isEarned ? '⭐' : '☆'}
                </div>
            `);
        }
        
        return stars.join('');
    }

    getStreak(childId, choreId) {
        // Demo: return random streak
        return Math.floor(Math.random() * 5);
    }

    formatCents(cents) {
        return `$${(cents / 100).toFixed(2)}`;
    }

    // Add cell bounce animation - EXACTLY like main app
    addCellBounce(cell) {
        cell.style.transform = 'scale(1.1)';
        setTimeout(() => {
            cell.style.transform = 'scale(1)';
        }, 150);
    }

    addChoreCellHandlers(card, childChores, childId) {
        card.querySelectorAll('.chore-grid-table .chore-cell').forEach(cell => {
            const day = cell.dataset.day;
            const choreId = cell.dataset.choreId;

            cell.addEventListener('click', () => {
                if (cell.dataset.processing === 'true') {
                    return;
                }
                
                const chore = childChores.find(ch => ch.id === choreId);
                if (chore) {
                    this.toggleChoreDay(choreId, parseInt(day));
                }
            });
        });
    }

    handleChoreCellClick(cell, chore, childId, day) {
        // Toggle completion state
        if (cell.classList.contains('completed')) {
            cell.classList.remove('completed');
            cell.classList.add('empty');
            cell.innerHTML = '';
        } else {
            cell.classList.remove('empty');
            cell.classList.add('completed');
            cell.innerHTML = '✅';
        }
        
        // Update progress
        this.updateChildProgress(childId);
        this.updateDashboardStats();
    }

    updateChildProgress(childId) {
        const childCard = document.querySelector(`.child-content[data-child-id="${childId}"]`);
        if (!childCard) return;
        
        const child = this.children.find(c => c.id === childId);
        const childChores = this.chores.filter(chore => chore.child_id === childId);
        const childCompletions = this.completions.filter(comp => 
            childChores.some(chore => chore.id === comp.chore_id)
        );
        
        const progress = this.calculateChildProgress(childId, childChores, childCompletions);
        const stars = this.calculateStars(progress.completionPercentage);
        
        // Update progress bar
        const progressFill = childCard.querySelector('.progress-fill');
        const progressStats = childCard.querySelector('.progress-stats');
        const starsContainer = childCard.querySelector('.stars-container');
        const earningsAmount = childCard.querySelector('.earnings-amount');
        
        if (progressFill) progressFill.style.width = `${progress.completionPercentage}%`;
        if (progressStats) progressStats.innerHTML = `<span>${progress.completionPercentage}% complete</span>`;
        if (starsContainer) starsContainer.innerHTML = stars;
        if (earningsAmount) earningsAmount.textContent = this.formatCents(progress.totalEarnings);
    }

    // Update dashboard stats
    updateDashboardStats() {
        // Calculate total progress across all children
        let totalEarned = 0;
        let totalPerfectDays = 0;
        const childStats = [];
        
        this.children.forEach(child => {
            const childChores = this.chores.filter(chore => chore.child_id === child.id);
            const childCompletions = this.completions.filter(comp => 
                childChores.some(chore => chore.id === comp.chore_id)
            );
            const progress = this.calculateChildProgress(child.id, childChores, childCompletions);
            
            totalEarned += progress.totalEarnings;
            totalPerfectDays += progress.completedDays;
            childStats.push({ 
                name: child.name, 
                completed: progress.completedDays,
                earnings: progress.totalEarnings
            });
        });
        
        // Calculate family progress as average of children's progress
        const familyProgress = this.children.length > 0 ? 
            Math.round(childStats.reduce((sum, child) => {
                const childId = this.children.find(c => c.name === child.name).id;
                const childChores = this.chores.filter(chore => chore.child_id === childId);
                const childCompletions = this.completions.filter(comp => 
                    childChores.some(chore => chore.id === comp.chore_id)
                );
                const progress = this.calculateChildProgress(childId, childChores, childCompletions);
                return sum + progress.completionPercentage;
            }, 0) / this.children.length) : 0;
        
        // Find top performer (by completed cells)
        const topPerformer = childStats.reduce((prev, current) => 
            (prev.completed > current.completed) ? prev : current
        );

        // Update dashboard elements
        const progressEl = document.getElementById('family-total-progress');
        const leaderEl = document.getElementById('family-leader');
        const earningsEl = document.getElementById('family-earnings');
        
        if (progressEl) progressEl.textContent = `${familyProgress}%`;
        if (leaderEl) leaderEl.textContent = topPerformer.name;
        if (earningsEl) earningsEl.textContent = `$${(totalEarned / 100).toFixed(2)}`;
    }

    // Demo-specific methods
    openEditChildrenPage() {
        this.openModal('edit-children-page');
        this.populateEditChildrenForm();
    }

    closeEditChildrenPage() {
        this.closeModal('edit-children-page');
    }

    populateEditChildrenForm() {
        // Populate the edit form with current child data
        const currentChild = this.children.find(child => child.id === this.activeChildId);
        if (currentChild) {
            const nameInput = document.getElementById('page-edit-child-name');
            const ageInput = document.getElementById('page-edit-child-age');
            const colorInput = document.getElementById('page-edit-child-color');
            const selectedColorSpan = document.getElementById('page-edit-selected-color');
            const avatarPreview = document.getElementById('page-edit-child-avatar-preview-circle');
            
            if (nameInput) nameInput.value = currentChild.name;
            if (ageInput) ageInput.value = currentChild.age;
            if (colorInput) colorInput.value = currentChild.avatar_color;
            if (selectedColorSpan) selectedColorSpan.style.background = currentChild.avatar_color;
            if (avatarPreview) {
                avatarPreview.style.background = currentChild.avatar_color;
                avatarPreview.textContent = currentChild.name.charAt(0).toUpperCase();
            }
        }
    }

    previousChild() {
        const currentIndex = this.children.findIndex(child => child.id === this.activeChildId);
        if (currentIndex > 0) {
            this.activeChildId = this.children[currentIndex - 1].id;
            this.populateEditChildrenForm();
        }
    }

    nextChild() {
        const currentIndex = this.children.findIndex(child => child.id === this.activeChildId);
        if (currentIndex < this.children.length - 1) {
            this.activeChildId = this.children[currentIndex + 1].id;
            this.populateEditChildrenForm();
        }
    }

    // Initialize event handlers
    initializeEventHandlers() {
        if (this.handlersInitialized) return;
        
        // Exit demo button
        this.setupExitDemoButton();
        
        // Mobile menu handlers
        this.setupMobileMenuHandlers();
        
        // Modal handlers
        this.setupModalHandlers();
        
        // Theme toggle
        this.setupThemeToggle();
        
        // Add child button
        this.setupAddChildButton();
        
        // Add chore button
        this.setupAddChoreButton();
        
        // Refresh dashboard
        this.setupRefreshDashboard();
        
        this.handlersInitialized = true;
    }

    setupExitDemoButton() {
        const exitBtn = document.getElementById('exit-demo-btn');
        const mobileExitBtn = document.getElementById('mobile-exit-demo-btn');
        
        if (exitBtn) {
            exitBtn.addEventListener('click', () => {
                window.location.href = '/';
            });
        }
        
        if (mobileExitBtn) {
            mobileExitBtn.addEventListener('click', () => {
                window.location.href = '/';
            });
        }
    }

    setupMobileMenuHandlers() {
        const hamburgerBtn = document.getElementById('hamburger-menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');
        const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
        const mobileMenuClose = document.getElementById('mobile-menu-close');
        
        if (hamburgerBtn) {
            hamburgerBtn.addEventListener('click', () => {
                mobileMenu.classList.remove('hidden');
                mobileMenuOverlay.classList.remove('hidden');
                hamburgerBtn.setAttribute('aria-expanded', 'true');
            });
        }
        
        if (mobileMenuClose) {
            mobileMenuClose.addEventListener('click', () => {
                this.closeMobileMenu();
            });
        }
        
        if (mobileMenuOverlay) {
            mobileMenuOverlay.addEventListener('click', () => {
                this.closeMobileMenu();
            });
        }
    }

    closeMobileMenu() {
        const mobileMenu = document.getElementById('mobile-menu');
        const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
        const hamburgerBtn = document.getElementById('hamburger-menu-btn');
        
        mobileMenu.classList.add('hidden');
        mobileMenuOverlay.classList.add('hidden');
        if (hamburgerBtn) {
            hamburgerBtn.setAttribute('aria-expanded', 'false');
        }
    }

    setupModalHandlers() {
        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modalId = e.target.getAttribute('data-modal');
                if (modalId) {
                    this.closeModal(modalId);
                }
            });
        });
        
        // Modal overlay clicks
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            modal.setAttribute('aria-hidden', 'false');
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
            modal.setAttribute('aria-hidden', 'true');
        }
    }

    setupThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');
        const mobileThemeToggle = document.getElementById('mobile-theme-toggle');
        
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
        
        if (mobileThemeToggle) {
            mobileThemeToggle.addEventListener('click', () => {
                this.toggleTheme();
                this.closeMobileMenu();
            });
        }
    }

    toggleTheme() {
        this.settings.theme = this.settings.theme === 'light' ? 'dark' : 'light';
        this.saveSettings();
        this.applyTheme();
    }

    applyTheme() {
        document.body.setAttribute('data-theme', this.settings.theme);
    }

    setupAddChildButton() {
        const addChildBtn = document.getElementById('add-child-btn');
        const mobileAddChildBtn = document.getElementById('mobile-add-child-btn');
        const emptyAddChildBtn = document.getElementById('empty-add-child-btn');
        
        if (addChildBtn) {
            addChildBtn.addEventListener('click', () => {
                this.openAddChildModal();
            });
        }
        
        if (mobileAddChildBtn) {
            mobileAddChildBtn.addEventListener('click', () => {
                this.openAddChildModal();
                this.closeMobileMenu();
            });
        }
        
        if (emptyAddChildBtn) {
            emptyAddChildBtn.addEventListener('click', () => {
                this.openAddChildModal();
            });
        }
    }

    openAddChildModal() {
        this.openModal('add-child-modal');
        this.setupAddChildForm();
    }

    setupAddChildForm() {
        // Setup form handlers for the add child modal
        const form = document.getElementById('add-child-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddChildSubmit();
            });
        }

        // Setup color picker
        const colorInput = document.getElementById('child-color');
        const selectedColorSpan = document.getElementById('add-selected-color');
        const avatarPreview = document.getElementById('add-child-avatar-preview-circle');
        
        if (colorInput && selectedColorSpan && avatarPreview) {
            colorInput.addEventListener('input', (e) => {
                const color = e.target.value;
                selectedColorSpan.style.background = color;
                avatarPreview.style.background = color;
            });

            // Setup color preset buttons
            document.querySelectorAll('#add-child-modal .color-preset').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const color = e.target.dataset.color;
                    colorInput.value = color;
                    selectedColorSpan.style.background = color;
                    avatarPreview.style.background = color;
                });
            });
        }

        // Setup name input for avatar preview
        const nameInput = document.getElementById('child-name');
        if (nameInput && avatarPreview) {
            nameInput.addEventListener('input', (e) => {
                const name = e.target.value;
                avatarPreview.textContent = name.charAt(0).toUpperCase() || 'A';
            });
        }
    }

    handleAddChildSubmit() {
        const name = document.getElementById('child-name').value;
        const age = document.getElementById('child-age').value;
        const color = document.getElementById('child-color').value;

        if (name && age && color) {
            // Create a new demo child
            const newChild = {
                id: `demo-${name.toLowerCase()}-${Date.now()}`,
                name: name,
                age: parseInt(age),
                avatar_color: color,
                avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`
            };

            // Add to demo data
            this.children.push(newChild);
            
            // Update the UI
            this.renderChildrenTabs();
            this.renderChildrenContent();
            this.updateDashboardStats();
            this.updateEmptyState();

            // Close modal and show success
            this.closeModal('add-child-modal');
            this.showToast(`Demo: Added ${name} to the family! 🎉`, 'success');

            // Reset form
            document.getElementById('add-child-form').reset();
            document.getElementById('add-child-avatar-preview-circle').textContent = 'A';
            document.getElementById('add-child-avatar-preview-circle').style.background = '#6366f1';
        } else {
            this.showToast('Demo: Please fill in all fields!', 'warning');
        }
    }

    setupAddChoreButton() {
        // Add chore button functionality - we'll add this to child cards
        // This will be handled when child cards are rendered
    }

    openAddChoreModal() {
        this.openModal('add-chore-modal');
        this.setupAddChoreForm();
    }

    setupAddChoreForm() {
        // Populate child dropdown
        const childSelect = document.getElementById('chore-child');
        if (childSelect) {
            childSelect.innerHTML = '<option value="">Select a child...</option>';
            this.children.forEach(child => {
                const option = document.createElement('option');
                option.value = child.id;
                option.textContent = child.name;
                childSelect.appendChild(option);
            });
        }

        // Setup form submission
        const form = document.getElementById('add-chore-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddChoreSubmit();
            });
        }

        // Setup icon picker
        document.querySelectorAll('#add-chore-modal .icon-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Remove active class from all icons
                document.querySelectorAll('#add-chore-modal .icon-option').forEach(b => b.classList.remove('active'));
                // Add active class to clicked icon
                e.target.classList.add('active');
            });
        });
    }

    handleAddChoreSubmit() {
        const childId = document.getElementById('chore-child').value;
        const choreName = document.getElementById('chore-name-1').value;
        const choreReward = document.getElementById('chore-reward-1').value;
        const selectedIcon = document.querySelector('#add-chore-modal .icon-option.active');
        const icon = selectedIcon ? selectedIcon.dataset.icon : '📝';

        if (childId && choreName && choreReward) {
            // Create new chore
            const newChore = {
                id: `demo-chore-${Date.now()}`,
                name: choreName,
                reward_cents: parseInt(choreReward),
                child_id: childId,
                icon: icon,
                category: 'General',
                notes: '',
                completed: false
            };

            // Add to demo data
            this.chores.push(newChore);

            // Update UI
            this.renderChildrenContent();
            this.updateDashboardStats();

            // Close modal and show success
            this.closeModal('add-chore-modal');
            this.showToast(`Demo: Added "${choreName}" chore! 🎉`, 'success');

            // Reset form
            document.getElementById('add-chore-form').reset();
            document.querySelectorAll('#add-chore-modal .icon-option').forEach(btn => btn.classList.remove('active'));
            document.querySelector('#add-chore-modal .icon-option[data-icon="📝"]').classList.add('active');
        } else {
            this.showToast('Demo: Please fill in all required fields!', 'warning');
        }
    }

    setupRefreshDashboard() {
        const refreshBtn = document.getElementById('refresh-dashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.updateDashboardStats();
            });
        }
    }

    // Render children tabs - EXACTLY like main app
    renderChildrenTabs() {
        const tabsContainer = document.getElementById('children-tabs');
        if (!tabsContainer) return;

        tabsContainer.innerHTML = this.children.map((child, index) => `
            <button 
                class="child-tab ${child.id === this.activeChildId ? 'active' : ''}" 
                data-child-id="${child.id}"
                role="tab"
                aria-selected="${child.id === this.activeChildId}"
                aria-controls="child-content-${child.id}"
                onclick="demoApp.switchToChild('${child.id}')"
            >
                <div class="child-tab-avatar" style="background-color: ${child.avatar_color};width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;overflow:hidden;">
                    <img src="${child.avatar_url}" alt="${child.name}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">
                </div>
                <span class="child-tab-name">${child.name}</span>
            </button>
        `).join('');
    }

    // Switch to child - EXACTLY like main app
    switchToChild(childId) {
        this.activeChildId = childId;
        
        // Update tab buttons - EXACTLY like main app
        document.querySelectorAll('.child-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        const activeTab = document.querySelector(`[data-child-id="${childId}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
        
        // Update content - EXACTLY like main app
        document.querySelectorAll('.child-content').forEach(content => {
            content.classList.remove('active');
        });
        const activeContent = document.querySelector(`.child-content[data-child-id="${childId}"]`);
        if (activeContent) {
            activeContent.classList.add('active');
        }
    }

    // Render children content - EXACTLY like main app
    renderChildrenContent() {
        const contentContainer = document.getElementById('children-content');
        if (!contentContainer) return;

        // Clear existing content
        contentContainer.innerHTML = '';

        // Create child cards for each child - EXACTLY like main app
        this.children.forEach((child, index) => {
            const childCard = this.createChildCard(child);
            childCard.className = `child-content ${child.id === this.activeChildId ? 'active' : ''}`;
            childCard.dataset.childId = child.id;
            contentContainer.appendChild(childCard);
        });
    }

    // Icon Picker Methods (matching main app)
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
                <img src="${url}" alt="Robot ${seed}" loading="lazy">
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
                <img src="${url}" alt="Adventurer ${seed}" loading="lazy">
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
                <img src="${url}" alt="Fun Emoji ${seed}" loading="lazy">
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
        // Update visual selection
        document.querySelectorAll('.icon-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        event.target.closest('.icon-option').classList.add('selected');
        
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
        
        if (mainCircle) {
            mainCircle.innerHTML = `<img src="${iconUrl}" alt="Selected avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            mainCircle.dataset.avatarUrl = iconUrl;
        }
        
        // Store the selected icon for form submission
        this.selectedAddChildIcon = iconUrl;
    }

    handleEditChildIconSelect(iconUrl, iconType) {
        const mainCircle = document.getElementById('edit-child-avatar-preview-circle');
        
        if (mainCircle) {
            mainCircle.innerHTML = `<img src="${iconUrl}" alt="Selected avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            mainCircle.dataset.avatarUrl = iconUrl;
        }
        
        // Store the selected icon for form submission
        this.selectedEditChildIcon = iconUrl;
    }

    handlePageEditChildIconSelect(iconUrl, iconType) {
        const mainCircle = document.getElementById('page-edit-child-avatar-preview-circle');
        
        if (mainCircle) {
            mainCircle.innerHTML = `<img src="${iconUrl}" alt="Selected avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            mainCircle.dataset.avatarUrl = iconUrl;
        }
        
        // Store the selected icon for form submission
        this.selectedPageEditChildIcon = iconUrl;
    }

    // Modal helper methods
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            modal.setAttribute('aria-hidden', 'false');
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
            modal.setAttribute('aria-hidden', 'true');
        }
    }
}

// Create demo app instance
const demoApp = new DemoFamilyChoreChart();

// Add demo-specific styles
const demoStyles = `
    .demo-badge {
        background: #ff6b6b;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.7rem;
        font-weight: bold;
        margin-left: 8px;
        text-transform: uppercase;
    }
`;

// Inject demo styles
const styleSheet = document.createElement('style');
styleSheet.textContent = demoStyles;
document.head.appendChild(styleSheet);

// Icon Picker Functions for Demo
function openIconPicker(currentIcon = '', callback = null) {
    if (window.demoApp) {
        window.demoApp.openIconPicker(currentIcon, callback);
    }
}

function closeIconPicker() {
    if (window.demoApp) {
        window.demoApp.closeIconPicker();
    }
}

function selectIcon(iconUrl, iconType) {
    if (window.demoApp) {
        window.demoApp.selectIcon(iconUrl, iconType);
    }
}

// Initialize demo app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎭 Initializing demo app...');
    window.demoApp = new DemoFamilyChoreChart();
    window.demoApp.init();
    
    // Debug: Log demo app status
    setTimeout(() => {
        console.log('🎭 Demo app initialized:', {
            children: window.demoApp.children.length,
            chores: window.demoApp.chores.length,
            activeChild: window.demoApp.activeChildId
        });
        
        // Test progress calculation
        if (window.demoApp.children.length > 0) {
            const child = window.demoApp.children[0];
            const childChores = window.demoApp.chores.filter(c => c.child_id === child.id);
            const progress = window.demoApp.calculateChildProgress(child.id, childChores, {});
            console.log('🎭 Progress for', child.name, ':', progress);
        }
    }, 1000);
});