// EMERGENCY FAMILY DATA RECOVERY
// Copy and paste this entire script into your browser console (F12)

console.log('🚨 EMERGENCY FAMILY DATA RECOVERY STARTING...');

async function emergencyRecovery() {
    if (!window.apiClient) {
        console.error('❌ API client not available');
        return;
    }

    try {
        console.log('🔍 Checking what data exists in database...');
        
        // Check children
        const children = await window.apiClient.getChildren();
        console.log(`👶 Children found: ${children.length}`);
        children.forEach(child => {
            console.log(`  - ${child.name} (age ${child.age})`);
        });
        
        // Check chores
        const chores = await window.apiClient.getChores();
        console.log(`📝 Chores found: ${chores.length}`);
        
        // Check if there are any non-demo children
        const realChildren = children.filter(child => 
            child.name !== 'Emma' && child.name !== 'Liam'
        );
        
        if (realChildren.length === 0) {
            console.log('❌ NO REAL FAMILY DATA FOUND');
            console.log('🚨 Your family data was accidentally deleted');
            
            // Check for any backup in localStorage
            const backupData = localStorage.getItem('chorestar_family_backup');
            if (backupData) {
                console.log('📦 Found backup data! Attempting recovery...');
                const backup = JSON.parse(backupData);
                
                // Restore children
                for (const child of backup.children || []) {
                    if (child.name !== 'Emma' && child.name !== 'Liam') {
                        console.log(`Restoring child: ${child.name}`);
                        const result = await window.apiClient.createChild(
                            child.name, 
                            child.age, 
                            child.avatar_color || '#4ecdc4'
                        );
                        if (result.success) {
                            console.log(`✅ Restored child: ${child.name}`);
                        } else {
                            console.error(`❌ Failed to restore child: ${child.name}`);
                        }
                    }
                }
                
                // Restore chores
                for (const chore of backup.chores || []) {
                    const children = await window.apiClient.getChildren();
                    const child = children.find(c => c.name === chore.child_name);
                    if (child) {
                        console.log(`Restoring chore: ${chore.name} for ${child.name}`);
                        const result = await window.apiClient.createChore(
                            chore.name,
                            chore.reward_cents,
                            child.id,
                            chore.icon || '📝',
                            chore.category || 'General',
                            chore.notes || ''
                        );
                        if (result.success) {
                            console.log(`✅ Restored chore: ${chore.name}`);
                        } else {
                            console.error(`❌ Failed to restore chore: ${chore.name}`);
                        }
                    }
                }
                
                console.log('✅ Recovery completed! Refreshing app...');
                
                // Refresh the app
                if (window.app && window.app.loadApp) {
                    await window.app.loadApp();
                }
                
                if (window.app && window.app.showToast) {
                    window.app.showToast('Family data recovered from backup!', 'success');
                }
                
            } else {
                console.log('❌ No backup data found');
                console.log('💡 You will need to recreate your family members');
            }
        } else {
            console.log(`✅ Found ${realChildren.length} real family members`);
            console.log('Your family data is still there!');
        }
        
    } catch (error) {
        console.error('❌ Error during recovery:', error);
    }
}

// Run the recovery
emergencyRecovery();
