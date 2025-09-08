// Safe ChoreStar Optimizations
// This script provides safe optimizations without risky DOM overrides

console.log('🔧 Loading safe ChoreStar optimizations...');

// 1. Demo button is handled by demo-data.js

// 2. Improve Error Handling
function improveErrorHandling() {
    // Global error handler for unhandled promises
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        
        // Try to recover from common errors
        if (event.reason?.message?.includes('family') || 
            event.reason?.message?.includes('profile')) {
            console.log('Attempting to recover from family data error...');
            if (window.app && window.app.loadApp) {
                setTimeout(() => window.app.loadApp(), 1000);
            }
        }
        
        // Prevent the error from showing in console
        event.preventDefault();
    });
    
    console.log('✅ Error recovery system added');
}

// 3. Fix Console Warnings
function fixConsoleIssues() {
    // Suppress non-critical console warnings
    const originalWarn = console.warn;
    console.warn = function(...args) {
        const message = args.join(' ');
        // Only show warnings that are actually important
        if (!message.includes('Auth session missing') && 
            !message.includes('Nodemailer not available') &&
            !message.includes('SendGrid not available')) {
            originalWarn.apply(console, args);
        }
    };
    
    console.log('✅ Console warnings optimized');
}

// 4. Improve Loading States
function improveLoadingStates() {
    // Add loading indicators for better UX
    const loadingElements = document.querySelectorAll('[data-loading]');
    loadingElements.forEach(el => {
        if (!el.hasAttribute('data-optimized')) {
            el.setAttribute('data-optimized', 'true');
            
            const showLoading = () => {
                el.style.opacity = '0.6';
                el.style.pointerEvents = 'none';
            };
            
            const hideLoading = () => {
                el.style.opacity = '1';
                el.style.pointerEvents = 'auto';
            };
            
            el.addEventListener('click', showLoading);
            setTimeout(hideLoading, 2000); // Auto-hide after 2 seconds
        }
    });
    
    console.log('✅ Loading states improved');
}

// 5. Optimize Image Loading
function optimizeImageLoading() {
    // Add lazy loading for images
    const images = document.querySelectorAll('img[src]');
    images.forEach(img => {
        if (!img.hasAttribute('loading')) {
            img.setAttribute('loading', 'lazy');
        }
    });
    
    console.log('✅ Image loading optimized');
}

// 6. Fix Accessibility Issues
function fixAccessibility() {
    // Ensure all interactive elements have proper ARIA labels
    const buttons = document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])');
    buttons.forEach(btn => {
        if (btn.textContent.trim()) {
            btn.setAttribute('aria-label', btn.textContent.trim());
        }
    });
    
    // Add focus management
    const focusableElements = document.querySelectorAll('button, input, select, textarea, [tabindex]');
    focusableElements.forEach(el => {
        if (!el.hasAttribute('tabindex') && el.tagName !== 'BUTTON' && el.tagName !== 'INPUT') {
            el.setAttribute('tabindex', '0');
        }
    });
    
    console.log('✅ Accessibility improvements added');
}

// Run all safe optimizations
function runSafeOptimizations() {
    try {
        improveErrorHandling();
        fixConsoleIssues();
        improveLoadingStates();
        optimizeImageLoading();
        fixAccessibility();
        
        console.log('🎉 Safe optimizations completed successfully!');
        
    } catch (error) {
        console.error('Safe optimization error:', error);
    }
}

// Run optimizations when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runSafeOptimizations);
} else {
    runSafeOptimizations();
}

// Export for manual execution
window.optimizeChoreStar = runSafeOptimizations;
