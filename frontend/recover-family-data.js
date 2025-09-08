// Family Data Recovery Script
// This script helps recover accidentally deleted family data

console.log('🚨 Family Data Recovery Script Loaded');

// Function to check if family data was accidentally deleted
async function checkFamilyData() {
    if (!window.apiClient) {
        console.error('API client not available');
        return;
    }

    try {
        const children = await window.apiClient.getChildren();
        const chores = await window.apiClient.getChores();
        
        console.log('📊 Current Family Data:');
        console.log(`Children: ${children.length}`);
        console.log(`Chores: ${chores.length}`);
        
        if (children.length === 0) {
            console.warn('⚠️ No children found - family data may have been accidentally deleted');
            return { needsRecovery: true, children: [], chores: [] };
        }
        
        return { needsRecovery: false, children, chores };
    } catch (error) {
        console.error('Error checking family data:', error);
        return { needsRecovery: true, children: [], chores: [] };
    }
}

// Function to restore family data from backup (if available)
async function restoreFamilyData() {
    console.log('🔄 Attempting to restore family data...');
    
    // Check if there's any backup data in localStorage
    const backupData = localStorage.getItem('chorestar_family_backup');
    if (backupData) {
        try {
            const backup = JSON.parse(backupData);
            console.log('📦 Found backup data:', backup);
            
            // Restore children
            for (const child of backup.children || []) {
                if (child.name !== 'Emma' && child.name !== 'Liam') { // Skip demo data
                    const result = await window.apiClient.createChild(
                        child.name, 
                        child.age, 
                        child.avatar_color || '#4ecdc4'
                    );
                    if (result.success) {
                        console.log(`✅ Restored child: ${child.name}`);
                    }
                }
            }
            
            // Restore chores
            for (const chore of backup.chores || []) {
                // Find the restored child
                const children = await window.apiClient.getChildren();
                const child = children.find(c => c.name === chore.child_name);
                if (child) {
                    const result = await window.apiClient.createChore(
                        chore.name,
                        chore.reward_cents,
                        child.id,
                        chore.icon || '📝',
                        chore.category || 'General',
                        chore.notes || ''
                    );
                    if (result.success) {
                        console.log(`✅ Restored chore: ${chore.name} for ${child.name}`);
                    }
                }
            }
            
            console.log('✅ Family data restoration completed');
            return true;
        } catch (error) {
            console.error('Error restoring from backup:', error);
        }
    }
    
    console.log('❌ No backup data found');
    return false;
}

// Function to create backup of current family data
async function createFamilyBackup() {
    if (!window.apiClient) return;
    
    try {
        const children = await window.apiClient.getChildren();
        const chores = await window.apiClient.getChores();
        
        const backup = {
            timestamp: new Date().toISOString(),
            children: children.map(child => ({
                name: child.name,
                age: child.age,
                avatar_color: child.avatar_color
            })),
            chores: chores.map(chore => ({
                name: chore.name,
                reward_cents: chore.reward_cents,
                child_name: children.find(c => c.id === chore.child_id)?.name,
                icon: chore.icon,
                category: chore.category,
                notes: chore.notes
            }))
        };
        
        localStorage.setItem('chorestar_family_backup', JSON.stringify(backup));
        console.log('💾 Family data backup created');
        return true;
    } catch (error) {
        console.error('Error creating backup:', error);
        return false;
    }
}

// Auto-check family data when script loads
document.addEventListener('DOMContentLoaded', async () => {
    // Wait for app to be ready
    setTimeout(async () => {
        const dataCheck = await checkFamilyData();
        
        if (dataCheck.needsRecovery) {
            console.log('🚨 Family data recovery needed');
            
            // Try to restore from backup
            const restored = await restoreFamilyData();
            
            if (restored) {
                // Refresh the app
                if (window.app && window.app.loadApp) {
                    await window.app.loadApp();
                }
                
                console.log('✅ Family data restored from backup!');
            } else {
                console.log('❌ Could not restore family data');
            }
        } else {
            // Create backup of current data
            await createFamilyBackup();
        }
    }, 2000);
});

// Export functions for manual use
window.checkFamilyData = checkFamilyData;
window.restoreFamilyData = restoreFamilyData;
window.createFamilyBackup = createFamilyBackup;
