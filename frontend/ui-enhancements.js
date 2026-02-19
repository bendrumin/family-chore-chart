// Professional UI Enhancements for ChoreStar
// Touch-friendly with desktop keyboard support

class UIEnhancementsManager {
    constructor() {
        this.undoStack = [];
        this.redoStack = [];
        this.maxUndoStack = 20;
        this.swipeThreshold = 100;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchStartTime = 0;
        this.pullToRefreshThreshold = 80;
        this.isPulling = false;
        this.shortcuts = {};
        this.init();
    }

    init() {
        this.initializeGlassmorphism();
        this.initializeKeyboardShortcuts();
        this.initializeMobileGestures();
        this.initializeTooltips();
        this.initializeFloatingActionButton();
        this.initializeProgressIndicators();
        this.initializePageTransitions();
        // Professional UI Enhancements loaded
    }

    // ==========================================
    // GLASSMORPHISM EFFECTS
    // ==========================================
    initializeGlassmorphism() {
        // Apply glassmorphism to modal backdrops
        const style = document.createElement('style');
        style.textContent = `
            .modal:not(.hidden) {
                backdrop-filter: blur(12px) saturate(180%);
                -webkit-backdrop-filter: blur(12px) saturate(180%);
            }
            
            .modal-content {
                background: rgba(255, 255, 255, 0.95) !important;
                backdrop-filter: blur(20px) saturate(180%);
                -webkit-backdrop-filter: blur(20px) saturate(180%);
                border: 1px solid rgba(255, 255, 255, 0.3);
            }
            
            [data-theme="dark"] .modal-content {
                background: rgba(31, 41, 55, 0.95) !important;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .toast {
                backdrop-filter: blur(20px) saturate(180%);
                -webkit-backdrop-filter: blur(20px) saturate(180%);
                background: rgba(255, 255, 255, 0.95) !important;
                border: 1px solid rgba(255, 255, 255, 0.3);
            }
            
            [data-theme="dark"] .toast {
                background: rgba(31, 41, 55, 0.95) !important;
            }
        `;
        document.head.appendChild(style);
    }

    // ==========================================
    // KEYBOARD SHORTCUTS
    // ==========================================
    initializeKeyboardShortcuts() {
        this.shortcuts = {
            'mod+k': () => this.showQuickActions(),
            'mod+z': () => this.undo(),
            'mod+shift+z': () => this.redo(),
            'mod+y': () => this.redo(),
            'escape': () => this.handleEscape(),
            'mod+/': () => this.showShortcutsOverlay(),
            'mod+n': () => this.quickAddChild(),
            'mod+shift+n': () => this.quickAddChore(),
            'mod+s': () => this.quickSettings(),
            'mod+h': () => this.quickHelp(),
            'mod+f': () => this.quickFeedback(),
            'mod+p': () => this.quickPrint(),
            'mod+,': () => this.quickSettings(),
            'mod+shift+c': () => this.quickChangelog(),
            'mod+?': () => this.showShortcutsOverlay(),
        };

        document.addEventListener('keydown', (e) => {
            // Handle standalone ? key (without mod) for shortcuts
            if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
                // Only trigger if not typing in an input/textarea
                const activeElement = document.activeElement;
                if (!activeElement || (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA')) {
                    e.preventDefault();
                    this.showShortcutsOverlay();
                    return;
                }
            }
            
            const mod = e.metaKey || e.ctrlKey;
            const key = e.key.toLowerCase();
            let shortcutKey = '';

            if (mod && e.shiftKey) {
                shortcutKey = `mod+shift+${key}`;
            } else if (mod) {
                shortcutKey = `mod+${key}`;
            } else if (key === 'escape') {
                shortcutKey = 'escape';
            }

            if (this.shortcuts[shortcutKey]) {
                e.preventDefault();
                this.shortcuts[shortcutKey]();
            }
        });

        // Add visual hint for keyboard shortcuts
        this.addKeyboardHint();
    }

    addKeyboardHint() {
        const hint = document.createElement('div');
        hint.className = 'keyboard-hint';
        // Landmark for a11y scanners: region landmarks must have an accessible name
        hint.setAttribute('role', 'region');
        hint.setAttribute('aria-label', 'Keyboard shortcuts hint');
        hint.innerHTML = `
            <kbd>⌘</kbd> <kbd>K</kbd> Quick Actions • 
            <kbd>⌘</kbd> <kbd>/</kbd> Shortcuts
        `;
        hint.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            z-index: 1000;
            backdrop-filter: blur(10px);
            opacity: 0;
            animation: fadeInHint 0.3s ease forwards;
            pointer-events: none;
        `;

        // Only show on desktop
        if (window.innerWidth > 768 && !('ontouchstart' in window)) {
            document.body.appendChild(hint);
            setTimeout(() => {
                hint.style.opacity = '0.7';
            }, 2000);
            setTimeout(() => {
                hint.style.transition = 'opacity 0.5s';
                hint.style.opacity = '0';
                setTimeout(() => hint.remove(), 500);
            }, 8000);
        }
    }

    showQuickActions() {
        const existingQuickActions = document.getElementById('quick-actions-modal');
        if (existingQuickActions) {
            existingQuickActions.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'quick-actions-modal';
        modal.className = 'quick-actions-modal';
        modal.innerHTML = `
            <div class="quick-actions-backdrop"></div>
            <div class="quick-actions-content">
                <div class="quick-actions-search">
                    <input type="text" id="quick-search" placeholder="Quick search or action..." autofocus>
                </div>
                <div class="quick-actions-list">
                    <div class="quick-action-item" data-action="add-child">
                        <span class="quick-action-icon">👶</span>
                        <span class="quick-action-label">Add Child</span>
                        <kbd>⌘N</kbd>
                    </div>
                    <div class="quick-action-item" data-action="add-chore">
                        <span class="quick-action-icon">✅</span>
                        <span class="quick-action-label">Add Chore</span>
                        <kbd>⌘⇧N</kbd>
                    </div>
                    <div class="quick-action-item" data-action="analytics">
                        <span class="quick-action-icon">📊</span>
                        <span class="quick-action-label">View Analytics</span>
                    </div>
                    <div class="quick-action-item" data-action="settings">
                        <span class="quick-action-icon">⚙️</span>
                        <span class="quick-action-label">Settings</span>
                    </div>
                    <div class="quick-action-item" data-action="help">
                        <span class="quick-action-icon">❓</span>
                        <span class="quick-action-label">Help & FAQ</span>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('active'), 10);

        // Handle search
        const searchInput = document.getElementById('quick-search');
        searchInput.addEventListener('input', (e) => {
            this.filterQuickActions(e.target.value);
        });

        // Handle actions
        const actionItems = modal.querySelectorAll('.quick-action-item');
        actionItems.forEach((item, index) => {
            item.addEventListener('click', () => {
                this.executeQuickAction(item.dataset.action);
            });

            // Touch support
            item.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.executeQuickAction(item.dataset.action);
            });
        });

        // Close on escape or backdrop click
        modal.querySelector('.quick-actions-backdrop').addEventListener('click', () => {
            this.closeQuickActions();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeQuickActions();
            }
        });
    }

    filterQuickActions(query) {
        const items = document.querySelectorAll('.quick-action-item');
        const lowerQuery = query.toLowerCase();
        
        items.forEach(item => {
            const label = item.querySelector('.quick-action-label').textContent.toLowerCase();
            if (label.includes(lowerQuery)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    executeQuickAction(action) {
        this.closeQuickActions();
        
        setTimeout(() => {
            switch (action) {
                case 'add-child':
                    if (window.app) window.app.showModal('add-child-modal');
                    break;
                case 'add-chore':
                    if (window.app) window.app.showModal('add-chore-modal');
                    break;
                case 'analytics':
                    if (window.app) window.app.showModal('analytics-modal');
                    break;
                case 'settings':
                    if (window.app) window.app.showModal('settings-modal');
                    break;
                case 'help':
                    if (window.app) window.app.showModal('faq-modal');
                    break;
            }
        }, 100);
    }

    closeQuickActions() {
        const modal = document.getElementById('quick-actions-modal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        }
    }

    showShortcutsOverlay() {
        const existingOverlay = document.getElementById('shortcuts-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
            return;
        }

        const overlay = document.createElement('div');
        overlay.id = 'shortcuts-overlay';
        overlay.className = 'shortcuts-overlay';
        overlay.innerHTML = `
            <div class="shortcuts-backdrop"></div>
            <div class="shortcuts-content">
                <h3>⌨️ Keyboard Shortcuts</h3>
                <div class="shortcuts-grid">
                    <div class="shortcut-item">
                        <kbd>⌘</kbd> <kbd>K</kbd>
                        <span>Quick Actions</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>⌘</kbd> <kbd>N</kbd>
                        <span>Add Child</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>⌘</kbd> <kbd>⇧</kbd> <kbd>N</kbd>
                        <span>Add Chore</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>⌘</kbd> <kbd>Z</kbd>
                        <span>Undo</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>⌘</kbd> <kbd>⇧</kbd> <kbd>Z</kbd>
                        <span>Redo</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>Esc</kbd>
                        <span>Close Modal</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>⌘</kbd> <kbd>/</kbd>
                        <span>Toggle Shortcuts</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>⌘</kbd> <kbd>S</kbd>
                        <span>Settings</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>⌘</kbd> <kbd>H</kbd>
                        <span>Help Center</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>⌘</kbd> <kbd>F</kbd>
                        <span>Send Feedback</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>⌘</kbd> <kbd>P</kbd>
                        <span>Print</span>
                    </div>
                    <div class="shortcut-item">
                        <kbd>⌘</kbd> <kbd>⇧</kbd> <kbd>C</kbd>
                        <span>Changelog</span>
                    </div>
                </div>
                <p class="shortcuts-note">💡 Tip: These shortcuts work anywhere in the app</p>
            </div>
        `;

        document.body.appendChild(overlay);
        setTimeout(() => overlay.classList.add('active'), 10);

        overlay.querySelector('.shortcuts-backdrop').addEventListener('click', () => {
            this.closeShortcutsOverlay();
        });
    }

    closeShortcutsOverlay() {
        const overlay = document.getElementById('shortcuts-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            setTimeout(() => overlay.remove(), 300);
        }
    }

    quickAddChild() {
        if (window.app) {
            window.app.showModal('add-child-modal');
        }
    }

    quickAddChore() {
        if (window.app) {
            window.app.showModal('add-chore-modal');
        }
    }
    
    quickSettings() {
        if (window.app) {
            window.app.showModal('settings-modal');
        }
    }
    
    quickHelp() {
        if (window.app) {
            window.app.showModal('faq-modal');
        }
    }
    
    quickFeedback() {
        if (window.app) {
            window.app.showModal('feedback-modal');
        }
    }
    
    quickPrint() {
        window.print();
    }
    
    quickChangelog() {
        window.location.href = '/changelog.html';
    }

    handleEscape() {
        // Close quick actions if open
        const quickActions = document.getElementById('quick-actions-modal');
        if (quickActions) {
            this.closeQuickActions();
            return;
        }

        // Close shortcuts overlay if open
        const shortcuts = document.getElementById('shortcuts-overlay');
        if (shortcuts) {
            this.closeShortcutsOverlay();
            return;
        }

        // Close any open modal
        const openModal = document.querySelector('.modal:not(.hidden)');
        if (openModal && window.app) {
            window.app.hideModal(openModal.id);
        }
    }

    // ==========================================
    // MOBILE GESTURES
    // ==========================================
    initializeMobileGestures() {
        this.initializePullToRefresh();
        this.initializeSwipeActions();
    }

    initializePullToRefresh() {
        let pullDistance = 0;
        let startY = 0;
        let pulling = false;

        const pullIndicator = document.createElement('div');
        pullIndicator.className = 'pull-to-refresh-indicator';
        // Landmark for a11y scanners: region landmarks must have an accessible name
        pullIndicator.setAttribute('role', 'region');
        pullIndicator.setAttribute('aria-label', 'Pull to refresh');
        // Helpful announcement when the status text changes
        pullIndicator.setAttribute('aria-live', 'polite');
        pullIndicator.setAttribute('aria-atomic', 'true');
        pullIndicator.innerHTML = `
            <div class="pull-spinner"></div>
            <span class="pull-text">Pull to refresh</span>
        `;
        document.body.appendChild(pullIndicator);

        const mainContent = document.getElementById('app-container') || document.body;

        mainContent.addEventListener('touchstart', (e) => {
            if (window.scrollY === 0) {
                startY = e.touches[0].clientY;
                pulling = false;
            }
        }, { passive: true });

        mainContent.addEventListener('touchmove', (e) => {
            if (window.scrollY === 0 && startY > 0) {
                const currentY = e.touches[0].clientY;
                pullDistance = currentY - startY;

                if (pullDistance > 0 && pullDistance < 150) {
                    pulling = true;
                    pullIndicator.style.transform = `translateY(${Math.min(pullDistance, 100)}px)`;
                    pullIndicator.style.opacity = Math.min(pullDistance / 100, 1);

                    if (pullDistance > this.pullToRefreshThreshold) {
                        pullIndicator.querySelector('.pull-text').textContent = 'Release to refresh';
                        pullIndicator.classList.add('ready');
                    } else {
                        pullIndicator.querySelector('.pull-text').textContent = 'Pull to refresh';
                        pullIndicator.classList.remove('ready');
                    }
                }
            }
        }, { passive: true });

        mainContent.addEventListener('touchend', (e) => {
            if (pulling && pullDistance > this.pullToRefreshThreshold) {
                pullIndicator.classList.add('refreshing');
                pullIndicator.querySelector('.pull-text').textContent = 'Refreshing...';
                
                // Trigger refresh
                this.refreshDashboard();

                setTimeout(() => {
                    pullIndicator.style.transform = 'translateY(-100px)';
                    pullIndicator.style.opacity = '0';
                    pullIndicator.classList.remove('ready', 'refreshing');
                    
                    setTimeout(() => {
                        pullIndicator.style.transform = '';
                        pullIndicator.style.opacity = '';
                    }, 300);
                }, 1500);
            } else {
                pullIndicator.style.transform = 'translateY(-100px)';
                pullIndicator.style.opacity = '0';
                pullIndicator.classList.remove('ready');
                
                setTimeout(() => {
                    pullIndicator.style.transform = '';
                    pullIndicator.style.opacity = '';
                }, 300);
            }

            startY = 0;
            pullDistance = 0;
            pulling = false;
        }, { passive: true });
    }

    refreshDashboard() {
        if (window.app && typeof window.app.loadDashboardData === 'function') {
            window.app.loadDashboardData();
        }
    }

    initializeSwipeActions() {
        // Add swipe gesture detection to chore cells
        document.addEventListener('touchstart', (e) => {
            const choreItem = e.target.closest('.chore-entry, .chore-cell');
            if (choreItem) {
                this.touchStartX = e.touches[0].clientX;
                this.touchStartY = e.touches[0].clientY;
                this.touchStartTime = Date.now();
            }
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            const choreItem = e.target.closest('.chore-entry, .chore-cell');
            if (choreItem && this.touchStartX) {
                const touchEndX = e.changedTouches[0].clientX;
                const touchEndY = e.changedTouches[0].clientY;
                const deltaX = touchEndX - this.touchStartX;
                const deltaY = touchEndY - this.touchStartY;
                const deltaTime = Date.now() - this.touchStartTime;

                // Swipe right - complete/uncomplete
                if (Math.abs(deltaX) > Math.abs(deltaY) && 
                    Math.abs(deltaX) > this.swipeThreshold && 
                    deltaTime < 300) {
                    
                    if (deltaX > 0) {
                        // Swipe right - mark complete
                        this.handleSwipeComplete(choreItem, e);
                    } else {
                        // Swipe left - show options
                        this.handleSwipeOptions(choreItem, e);
                    }
                }

                this.touchStartX = 0;
                this.touchStartY = 0;
            }
        });
    }

    handleSwipeComplete(element, event) {
        element.style.transform = 'translateX(50px)';
        element.style.opacity = '0.7';
        
        setTimeout(() => {
            element.style.transform = '';
            element.style.opacity = '';
            
            // Trigger click/complete action
            element.click();
            
            // Visual feedback
            this.showSwipeFeedback('✓ Completed!', 'success');
        }, 200);
    }

    handleSwipeOptions(element, event) {
        element.style.transform = 'translateX(-50px)';
        element.style.opacity = '0.7';
        
        setTimeout(() => {
            element.style.transform = '';
            element.style.opacity = '';
            
            // Show options (could be edit/delete)
            this.showSwipeFeedback('← Swipe for options', 'info');
        }, 200);
    }

    showSwipeFeedback(message, type = 'info') {
        const feedback = document.createElement('div');
        feedback.className = `swipe-feedback swipe-${type}`;
        feedback.textContent = message;
        feedback.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0.8);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            z-index: 10000;
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            backdrop-filter: blur(10px);
        `;

        document.body.appendChild(feedback);
        
        requestAnimationFrame(() => {
            feedback.style.opacity = '1';
            feedback.style.transform = 'translate(-50%, -50%) scale(1)';
        });

        setTimeout(() => {
            feedback.style.opacity = '0';
            feedback.style.transform = 'translate(-50%, -50%) scale(0.8)';
            setTimeout(() => feedback.remove(), 300);
        }, 1500);
    }

    // ==========================================
    // ENHANCED TOOLTIPS
    // ==========================================
    initializeTooltips() {
        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.className = 'enhanced-tooltip';
        tooltip.style.cssText = `
            position: absolute;
            background: rgba(0, 0, 0, 0.95);
            color: white;
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 13px;
            pointer-events: none;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.2s;
            backdrop-filter: blur(10px);
            max-width: 250px;
        `;
        document.body.appendChild(tooltip);

        // Add tooltip listeners
        document.addEventListener('mouseover', (e) => {
            const target = e.target.closest('[data-tooltip]');
            if (target && !('ontouchstart' in window)) {
                const text = target.getAttribute('data-tooltip');
                const shortcut = target.getAttribute('data-shortcut');
                
                // Escape tooltip content to prevent XSS
                const escapeHtml = (str) => {
                    if (!str) return '';
                    const div = document.createElement('div');
                    div.textContent = str;
                    return div.innerHTML;
                };
                
                let content = escapeHtml(text);
                if (shortcut) {
                    const escapedShortcut = escapeHtml(shortcut);
                    content += ` <kbd style="background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 4px; margin-left: 8px;">${escapedShortcut}</kbd>`;
                }
                
                tooltip.innerHTML = content;
                tooltip.style.opacity = '1';
                
                this.positionTooltip(tooltip, target);
            }
        });

        document.addEventListener('mouseout', (e) => {
            const target = e.target.closest('[data-tooltip]');
            if (target) {
                tooltip.style.opacity = '0';
            }
        });

        document.addEventListener('mousemove', (e) => {
            const target = e.target.closest('[data-tooltip]');
            if (target && tooltip.style.opacity === '1') {
                this.positionTooltip(tooltip, target, e);
            }
        });
    }

    positionTooltip(tooltip, target, event = null) {
        const rect = target.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
        // Position tooltip BELOW the button by default (for header buttons)
        let top = rect.bottom + 8;
        
        // Keep tooltip on screen
        if (left < 10) left = 10;
        if (left + tooltipRect.width > window.innerWidth - 10) {
            left = window.innerWidth - tooltipRect.width - 10;
        }
        // If tooltip would go off bottom of screen, position above instead
        if (top + tooltipRect.height > window.innerHeight - 10) {
            top = rect.top - tooltipRect.height - 8;
            // If positioned above, change arrow to point down
            tooltip.classList.add('tooltip-above');
        } else {
            tooltip.classList.remove('tooltip-above');
        }
        
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
    }

    // ==========================================
    // FLOATING ACTION BUTTON
    // ==========================================
    initializeFloatingActionButton() {
        const fab = document.createElement('div');
        fab.className = 'floating-action-button';
        fab.innerHTML = `
            <button class="fab-main" data-tooltip="Quick Actions" aria-label="Quick actions menu">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
            </button>
            <div class="fab-menu">
                <button class="fab-action" data-action="add-child" data-tooltip="Add Child">
                    <span>👶</span>
                </button>
                <button class="fab-action" data-action="add-chore" data-tooltip="Add Chore">
                    <span>✅</span>
                </button>
                <button class="fab-action" data-action="analytics" data-tooltip="Analytics">
                    <span>📊</span>
                </button>
                <button class="fab-action" data-action="settings" data-tooltip="Settings">
                    <span>⚙️</span>
                </button>
            </div>
        `;

        // Only add FAB after user is logged in
        setTimeout(() => {
            const appContainer = document.getElementById('app-container');
            const authContainer = document.getElementById('auth-container');
            
            if (appContainer && !appContainer.classList.contains('hidden')) {
                document.body.appendChild(fab);
            } else {
                // Wait for auth to complete
                const checkAuth = setInterval(() => {
                    const appContainer = document.getElementById('app-container');
                    if (appContainer && !appContainer.classList.contains('hidden')) {
                        document.body.appendChild(fab);
                        clearInterval(checkAuth);
                    }
                }, 500);
            }
        }, 1000);

        // Toggle FAB menu
        const fabMain = fab.querySelector('.fab-main');
        let isOpen = false;

        const toggleFAB = (e) => {
            e.stopPropagation();
            isOpen = !isOpen;
            fab.classList.toggle('active', isOpen);
            
            const icon = fabMain.querySelector('svg');
            icon.style.transform = isOpen ? 'rotate(45deg)' : 'rotate(0deg)';
        };

        fabMain.addEventListener('click', toggleFAB);
        fabMain.addEventListener('touchend', (e) => {
            e.preventDefault();
            toggleFAB(e);
        });

        // Handle FAB actions
        const actions = fab.querySelectorAll('.fab-action');
        actions.forEach(action => {
            const handleAction = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const actionType = action.dataset.action;
                this.executeQuickAction(actionType);
                isOpen = false;
                fab.classList.remove('active');
                fabMain.querySelector('svg').style.transform = 'rotate(0deg)';
            };

            action.addEventListener('click', handleAction);
            action.addEventListener('touchend', handleAction);
        });

        // Close FAB when clicking outside
        document.addEventListener('click', () => {
            if (isOpen) {
                isOpen = false;
                fab.classList.remove('active');
                fabMain.querySelector('svg').style.transform = 'rotate(0deg)';
            }
        });
    }

    // ==========================================
    // ENHANCED PROGRESS INDICATORS
    // ==========================================
    initializeProgressIndicators() {
        // Add circular progress rings and trend indicators
        const style = document.createElement('style');
        style.textContent = `
            .progress-ring {
                transform: rotate(-90deg);
            }
            
            .progress-ring-circle {
                transition: stroke-dashoffset 0.35s cubic-bezier(0.4, 0, 0.2, 1);
                stroke-linecap: round;
            }
            
            .trend-indicator {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                font-size: 12px;
                font-weight: 600;
                padding: 2px 8px;
                border-radius: 12px;
                margin-left: 8px;
            }
            
            .trend-up {
                color: #10b981;
                background: rgba(16, 185, 129, 0.1);
            }
            
            .trend-down {
                color: #ef4444;
                background: rgba(239, 68, 68, 0.1);
            }
            
            .trend-neutral {
                color: #6b7280;
                background: rgba(107, 114, 128, 0.1);
            }
        `;
        document.head.appendChild(style);
    }

    createCircularProgress(percentage, size = 80, strokeWidth = 6) {
        const radius = (size - strokeWidth) / 2;
        const circumference = radius * 2 * Math.PI;
        const offset = circumference - (percentage / 100) * circumference;

        return `
            <svg class="progress-ring" width="${size}" height="${size}">
                <circle
                    class="progress-ring-circle-bg"
                    stroke="#e5e7eb"
                    stroke-width="${strokeWidth}"
                    fill="transparent"
                    r="${radius}"
                    cx="${size / 2}"
                    cy="${size / 2}"
                />
                <circle
                    class="progress-ring-circle"
                    stroke="#6366f1"
                    stroke-width="${strokeWidth}"
                    fill="transparent"
                    r="${radius}"
                    cx="${size / 2}"
                    cy="${size / 2}"
                    stroke-dasharray="${circumference} ${circumference}"
                    stroke-dashoffset="${offset}"
                />
                <text
                    x="50%"
                    y="50%"
                    text-anchor="middle"
                    dy="0.3em"
                    font-size="18"
                    font-weight="bold"
                    fill="#111827"
                    transform="rotate(90 ${size / 2} ${size / 2})"
                >${Math.round(percentage)}%</text>
            </svg>
        `;
    }

    createTrendIndicator(value, previousValue = null) {
        if (previousValue === null) {
            return '<span class="trend-indicator trend-neutral">—</span>';
        }

        const change = value - previousValue;
        const isUp = change > 0;
        const isDown = change < 0;

        if (change === 0) {
            return '<span class="trend-indicator trend-neutral">— No change</span>';
        }

        const arrow = isUp ? '↑' : '↓';
        const className = isUp ? 'trend-up' : 'trend-down';
        
        return `<span class="trend-indicator ${className}">${arrow} ${Math.abs(change)}</span>`;
    }

    // ==========================================
    // PAGE TRANSITIONS
    // ==========================================
    initializePageTransitions() {
        // Add smooth transitions when switching views
        const style = document.createElement('style');
        style.textContent = `
            .view-transition {
                animation: fadeInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .page-loading-bar {
                position: fixed;
                top: 0;
                left: 0;
                width: 0;
                height: 3px;
                background: linear-gradient(90deg, #6366f1, #8b5cf6);
                z-index: 10000;
                transition: width 0.3s ease;
            }
        `;
        document.head.appendChild(style);

        // Create loading bar
        const loadingBar = document.createElement('div');
        loadingBar.className = 'page-loading-bar';
        document.body.appendChild(loadingBar);
        this.loadingBar = loadingBar;
    }

    showLoadingBar() {
        this.loadingBar.style.width = '0%';
        this.loadingBar.style.opacity = '1';
        
        setTimeout(() => {
            this.loadingBar.style.width = '70%';
        }, 10);
    }

    hideLoadingBar() {
        this.loadingBar.style.width = '100%';
        
        setTimeout(() => {
            this.loadingBar.style.opacity = '0';
            setTimeout(() => {
                this.loadingBar.style.width = '0%';
            }, 300);
        }, 200);
    }

    // ==========================================
    // UNDO/REDO SYSTEM
    // ==========================================
    recordAction(action) {
        this.undoStack.push(action);
        this.redoStack = []; // Clear redo stack on new action
        
        if (this.undoStack.length > this.maxUndoStack) {
            this.undoStack.shift();
        }
    }

    undo() {
        if (this.undoStack.length === 0) {
            this.showSwipeFeedback('Nothing to undo', 'info');
            return;
        }

        const action = this.undoStack.pop();
        this.redoStack.push(action);
        
        // Execute undo
        if (action.undo && typeof action.undo === 'function') {
            action.undo();
            this.showSwipeFeedback(`↶ Undone: ${action.description}`, 'success');
        }
    }

    redo() {
        if (this.redoStack.length === 0) {
            this.showSwipeFeedback('Nothing to redo', 'info');
            return;
        }

        const action = this.redoStack.pop();
        this.undoStack.push(action);
        
        // Execute redo
        if (action.redo && typeof action.redo === 'function') {
            action.redo();
            this.showSwipeFeedback(`↷ Redone: ${action.description}`, 'success');
        }
    }
}

// Initialize UI Enhancements
document.addEventListener('DOMContentLoaded', () => {
    window.uiEnhancements = new UIEnhancementsManager();
});

