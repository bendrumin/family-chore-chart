// Toast Cleanup Script
// This script provides intelligent toast filtering to reduce notification spam

console.log('🧹 Loading toast cleanup system...');

// Store original showToast method
let originalShowToast = null;

// Essential toast messages that should always be shown
const essentialToasts = [
    // Critical errors
    'failed to',
    'error',
    'unable to',
    'cannot',
    'invalid',
    'not found',
    'permission denied',
    'network error',
    
    // Important user actions
    'account created',
    'password reset',
    'successfully joined',
    'family code copied',
    'exported successfully',
    'deleted successfully',
    'added successfully',
    'updated successfully',
    
    // Demo and special features
    'demo data loaded',
    'demo mode exited',
    'notifications enabled',
    
    // Payment and premium
    'payment',
    'upgrade',
    'premium',
    'badge earned'
];

// Redundant toast messages that should be filtered out
const redundantToasts = [
    'dashboard refreshed',
    'theme activated',
    'seasonal theme disabled',
    'all children have been updated',
    'pdf export coming soon',
    'weekly summary coming soon',
    'chore reordering coming soon',
    'no chores to edit',
    'all streaks have been reset',
    'streak data exported',
    'csv exported',
    'chore duplicated',
    'family data restored',
    'family data may have been lost',
    'family data was deleted',
    'could not restore family data',
    'no backup data found',
    'family data recovery needed',
    'app optimized and ready',
    'safe optimizations completed',
    'toast notifications filtered',
    'redundant toast messages filtered',
    // New redundant patterns identified
    'demo: edit children screen',
    'demo: edit children page closed',
    'demo: switched to',
    'demo: try adding a child',
    'demo: try adding chores',
    'switched to mode',
    'child updated!',
    'chore unchecked!'
];

// Function to check if a toast message is essential
function isEssentialToast(message) {
    const lowerMessage = message.toLowerCase();
    return essentialToasts.some(essential => lowerMessage.includes(essential));
}

// Function to check if a toast message is redundant
function isRedundantToast(message) {
    const lowerMessage = message.toLowerCase();
    return redundantToasts.some(redundant => lowerMessage.includes(redundant));
}

// Override showToast to filter messages intelligently
function setupToastCleanup() {
    if (window.app && window.app.showToast && !originalShowToast) {
        originalShowToast = window.app.showToast;
        
        window.app.showToast = function(message, type = 'info') {
            // Always show errors and critical messages
            if (type === 'error') {
                return originalShowToast.call(this, message, type);
            }
            
            // Filter out redundant messages
            if (isRedundantToast(message)) {
                console.log(`🧹 Redundant toast filtered: ${message} (${type})`);
                return;
            }
            
            // Show essential messages
            if (isEssentialToast(message)) {
                return originalShowToast.call(this, message, type);
            }
            
            // For other messages, show them but log to console for debugging
            console.log(`📢 Toast shown: ${message} (${type})`);
            return originalShowToast.call(this, message, type);
        };
        
        console.log('✅ Toast cleanup system active - redundant messages filtered');
    }
}

// Function to restore original showToast
function restoreAllToasts() {
    if (originalShowToast && window.app) {
        window.app.showToast = originalShowToast;
        console.log('✅ All toast notifications restored');
    }
}

// Setup the cleanup when app is ready
function waitForApp() {
    if (window.app) {
        setupToastCleanup();
    } else {
        setTimeout(waitForApp, 100);
    }
}

// Start cleanup
waitForApp();

// Export functions for manual control
window.setupToastCleanup = setupToastCleanup;
window.restoreAllToasts = restoreAllToasts;
window.isEssentialToast = isEssentialToast;
window.isRedundantToast = isRedundantToast;
