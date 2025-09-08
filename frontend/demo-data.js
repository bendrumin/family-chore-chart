// Demo Data for ChoreStar
// This creates sample data for testing the app

console.log('🎭 Loading demo data...');

// Demo data
const demoData = {
    children: [
        {
            id: 'demo-child-1',
            name: 'Emma',
            age: 8,
            avatar_color: '#ff6b6b',
            avatar_url: null,
            avatar_file: null
        },
        {
            id: 'demo-child-2', 
            name: 'Liam',
            age: 6,
            avatar_color: '#4ecdc4',
            avatar_url: null,
            avatar_file: null
        }
    ],
    chores: [
        {
            id: 'demo-chore-1',
            name: 'Make Bed',
            reward_cents: 5,
            child_id: 'demo-child-1',
            icon: '🛏️',
            category: 'Bedroom',
            notes: 'Make sure sheets are tucked in',
            color: null,
            is_active: true
        },
        {
            id: 'demo-chore-2',
            name: 'Feed Pet',
            reward_cents: 7,
            child_id: 'demo-child-1',
            icon: '🐕',
            category: 'Pet Care',
            notes: 'Give fresh water too',
            color: null,
            is_active: true
        },
        {
            id: 'demo-chore-3',
            name: 'Put Away Toys',
            reward_cents: 3,
            child_id: 'demo-child-2',
            icon: '🧸',
            category: 'Cleanup',
            notes: 'All toys in toy box',
            color: null,
            is_active: true
        },
        {
            id: 'demo-chore-4',
            name: 'Set Table',
            reward_cents: 4,
            child_id: 'demo-child-2',
            icon: '🍽️',
            category: 'Kitchen',
            notes: 'Plates, cups, and silverware',
            color: null,
            is_active: true
        }
    ],
    completions: [
        {
            id: 'demo-completion-1',
            chore_id: 'demo-chore-1',
            day_of_week: 1, // Monday
            week_start: '2025-01-06',
            completed_at: new Date().toISOString()
        },
        {
            id: 'demo-completion-2',
            chore_id: 'demo-chore-2',
            day_of_week: 1, // Monday
            week_start: '2025-01-06',
            completed_at: new Date().toISOString()
        }
    ]
};

// Function to load demo data
function loadDemoData() {
    console.log('🎭 Loading demo data into app...');
    
    if (window.app) {
        // Set demo data
        window.app.children = demoData.children;
        window.app.chores = demoData.chores;
        
        // Render the data
        if (window.app.renderChildren) {
            window.app.renderChildren();
        }
        
        // Show success message
        if (window.app.showToast) {
            window.app.showToast('Demo data loaded!', 'success');
        }
        
        // Add exit demo button
        addExitDemoButton();
        
        console.log('✅ Demo data loaded successfully');
        return true;
    } else {
        console.warn('⚠️ App not ready yet, retrying...');
        return false;
    }
}

// Function to setup demo buttons
function setupDemoButtons() {
    // Note: The main demo button (demo-loading-btn) was removed from the main page
    // as it should only be available to non-authenticated users on the signup form
    console.log('✅ Demo button setup complete (no main demo button needed)');
    
    // Signup demo button (for registration page)
    const signupDemoBtn = document.getElementById('signup-demo-btn');
    if (signupDemoBtn && !signupDemoBtn.hasAttribute('data-demo-setup')) {
        signupDemoBtn.setAttribute('data-demo-setup', 'true');
        
        signupDemoBtn.addEventListener('click', async function() {
            const originalText = this.innerHTML;
            this.innerHTML = '<span aria-hidden="true">⏳</span> Loading Demo...';
            this.disabled = true;
            
            try {
                // Simulate loading
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Redirect to demo page
                window.location.href = 'demo.html';
                
            } catch (error) {
                console.error('Demo loading error:', error);
                this.innerHTML = '<span aria-hidden="true">❌</span> Demo Failed';
                setTimeout(() => {
                    this.innerHTML = originalText;
                    this.disabled = false;
                }, 2000);
            }
        });
        
        console.log('✅ Signup demo button setup complete');
    }
    
    // Login demo button (for login page)
    const loginDemoBtn = document.getElementById('login-demo-btn');
    if (loginDemoBtn && !loginDemoBtn.hasAttribute('data-demo-setup')) {
        loginDemoBtn.setAttribute('data-demo-setup', 'true');
        
        loginDemoBtn.addEventListener('click', async function() {
            const originalText = this.innerHTML;
            this.innerHTML = '<span aria-hidden="true">⏳</span> Loading Demo...';
            this.disabled = true;
            
            try {
                // Simulate loading
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Redirect to demo page
                window.location.href = 'demo.html';
                
            } catch (error) {
                console.error('Demo loading error:', error);
                this.innerHTML = '<span aria-hidden="true">❌</span> Demo Failed';
                setTimeout(() => {
                    this.innerHTML = originalText;
                    this.disabled = false;
                }, 2000);
            }
        });
        
        console.log('✅ Login demo button setup complete');
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupDemoButtons);
} else {
    setupDemoButtons();
}

// Demo exit functions removed - now using separate demo page

// Export for manual use
window.loadDemoData = loadDemoData;
window.demoData = demoData;
