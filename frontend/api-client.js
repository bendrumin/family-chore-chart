// API Client for Family Chore Chart
// Handles all Supabase interactions with proper error handling

class ApiClient {
    constructor() {
        this.supabase = window.supabase;
        this.currentUser = null;
        this.familySettings = null;
    }

    // Authentication Methods
    async signUp(email, password, familyName) {
        try {
            const { data, error } = await this.supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        family_name: familyName
                    }
                }
            });

            if (error) throw error;

            // Create profile record
            if (data.user) {
                const profileResult = await this.createProfile(data.user.id, email, familyName);
                if (!profileResult.success) {
                    console.error('Profile creation failed:', profileResult.error);
                    // Don't fail the signup, but log the error
                }
            }

            return { success: true, user: data.user };
        } catch (error) {
            console.error('Sign up error:', error);
            return { success: false, error: error.message };
        }
    }

    async signIn(email, password) {
        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            this.currentUser = data.user;
            return { success: true, user: data.user };
        } catch (error) {
            console.error('Sign in error:', error);
            return { success: false, error: error.message };
        }
    }

    async signOut() {
        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;
            
            this.currentUser = null;
            this.familySettings = null;
            return { success: true };
        } catch (error) {
            console.error('Sign out error:', error);
            return { success: false, error: error.message };
        }
    }

    async resetPassword(email) {
        try {
            const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin
            });

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Password reset error:', error);
            return { success: false, error: error.message };
        }
    }

    async getCurrentUser() {
        try {
            const { data: { user }, error } = await this.supabase.auth.getUser();
            if (error) throw error;
            
            this.currentUser = user;
            return user;
        } catch (error) {
            console.error('Get current user error:', error);
            return null;
        }
    }

    // Profile Methods
    async createProfile(userId, email, familyName) {
        try {
            // First check if profile already exists
            const { data: existingProfile } = await this.supabase
                .from('profiles')
                .select('id')
                .eq('id', userId)
                .single();

            if (existingProfile) {
                console.log('Profile already exists for user:', userId);
                return { success: true };
            }

            const { error } = await this.supabase
                .from('profiles')
                .insert({
                    id: userId,
                    email,
                    family_name: familyName
                });

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Create profile error:', error);
            return { success: false, error: error.message };
        }
    }

    async getProfile() {
        try {
            const { data, error } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('id', this.currentUser.id)
                .single();

            if (error) {
                // If profile doesn't exist, try to create it
                if (error.code === 'PGRST116') {
                    console.log('Profile not found, attempting to create...');
                    const createResult = await this.createProfile(
                        this.currentUser.id, 
                        this.currentUser.email, 
                        this.currentUser.user_metadata?.family_name || 'My Family'
                    );
                    if (createResult.success) {
                        // Try to get the profile again
                        const { data: newProfile, error: newError } = await this.supabase
                            .from('profiles')
                            .select('*')
                            .eq('id', this.currentUser.id)
                            .single();
                        
                        if (!newError) return newProfile;
                    }
                }
                throw error;
            }
            return data;
        } catch (error) {
            console.error('Get profile error:', error);
            return null;
        }
    }

    // Children Methods
    async getChildren() {
        try {
            const { data, error } = await this.supabase
                .from('children')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .order('name');

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get children error:', error);
            return [];
        }
    }

    async createChild(name, age, avatarColor) {
        try {
            const { data, error } = await this.supabase
                .from('children')
                .insert({
                    name,
                    age,
                    avatar_color: avatarColor,
                    user_id: this.currentUser.id
                })
                .select()
                .single();

            if (error) throw error;
            return { success: true, child: data };
        } catch (error) {
            console.error('Create child error:', error);
            return { success: false, error: error.message };
        }
    }

    async updateChild(childId, updates) {
        try {
            const { data, error } = await this.supabase
                .from('children')
                .update(updates)
                .eq('id', childId)
                .eq('user_id', this.currentUser.id)
                .select()
                .single();

            if (error) throw error;
            return { success: true, child: data };
        } catch (error) {
            console.error('Update child error:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteChild(childId) {
        try {
            const { error } = await this.supabase
                .from('children')
                .delete()
                .eq('id', childId)
                .eq('user_id', this.currentUser.id);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Delete child error:', error);
            return { success: false, error: error.message };
        }
    }

    // Chores Methods
    async getChores(childId = null) {
        try {
            let query = this.supabase
                .from('chores')
                .select(`
                    *,
                    children!inner(user_id)
                `)
                .eq('children.user_id', this.currentUser.id)
                .eq('is_active', true);

            if (childId) {
                query = query.eq('child_id', childId);
            }

            const { data, error } = await query.order('name');
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get chores error:', error);
            return [];
        }
    }

    async createChore(name, rewardCents, childId) {
        try {
            const { data, error } = await this.supabase
                .from('chores')
                .insert({
                    name,
                    reward_cents: rewardCents,
                    child_id: childId
                })
                .select()
                .single();

            if (error) throw error;
            return { success: true, chore: data };
        } catch (error) {
            console.error('Create chore error:', error);
            return { success: false, error: error.message };
        }
    }

    async updateChore(choreId, updates) {
        try {
            const { data, error } = await this.supabase
                .from('chores')
                .update(updates)
                .eq('id', choreId)
                .select()
                .single();

            if (error) throw error;
            return { success: true, chore: data };
        } catch (error) {
            console.error('Update chore error:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteChore(choreId) {
        try {
            const { error } = await this.supabase
                .from('chores')
                .delete()
                .eq('id', choreId);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Delete chore error:', error);
            return { success: false, error: error.message };
        }
    }

    // Chore Completions Methods
    async getChoreCompletions(weekStart = null) {
        try {
            if (!weekStart) {
                weekStart = this.getWeekStart();
            }

            const { data, error } = await this.supabase
                .from('chore_completions')
                .select(`
                    *,
                    chores!inner(
                        *,
                        children!inner(user_id)
                    )
                `)
                .eq('chores.children.user_id', this.currentUser.id)
                .eq('week_start', weekStart);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get chore completions error:', error);
            return [];
        }
    }

    async toggleChoreCompletion(choreId, dayOfWeek, weekStart = null) {
        try {
            if (!weekStart) {
                weekStart = this.getWeekStart();
            }

            // Check if completion exists
            const { data: existing } = await this.supabase
                .from('chore_completions')
                .select('id')
                .eq('chore_id', choreId)
                .eq('day_of_week', dayOfWeek)
                .eq('week_start', weekStart)
                .single();

            if (existing) {
                // Delete completion
                const { error } = await this.supabase
                    .from('chore_completions')
                    .delete()
                    .eq('id', existing.id);

                if (error) throw error;
                return { success: true, completed: false };
            } else {
                // Create completion
                const { error } = await this.supabase
                    .from('chore_completions')
                    .insert({
                        chore_id: choreId,
                        day_of_week: dayOfWeek,
                        week_start: weekStart
                    });

                if (error) throw error;
                return { success: true, completed: true };
            }
        } catch (error) {
            console.error('Toggle chore completion error:', error);
            return { success: false, error: error.message };
        }
    }

    // Family Settings Methods
    async getFamilySettings() {
        try {
            const { data, error } = await this.supabase
                .from('family_settings')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                throw error;
            }

            if (!data) {
                // Create default settings
                return await this.createFamilySettings();
            }

            this.familySettings = data;
            return data;
        } catch (error) {
            console.error('Get family settings error:', error);
            return null;
        }
    }

    async createFamilySettings() {
        try {
            const defaultSettings = {
                user_id: this.currentUser.id,
                daily_reward_cents: 7,
                weekly_bonus_cents: 1,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            };

            const { data, error } = await this.supabase
                .from('family_settings')
                .insert(defaultSettings)
                .select()
                .single();

            if (error) throw error;
            
            this.familySettings = data;
            return data;
        } catch (error) {
            console.error('Create family settings error:', error);
            return null;
        }
    }

    async updateFamilySettings(updates) {
        try {
            const { data, error } = await this.supabase
                .from('family_settings')
                .update(updates)
                .eq('user_id', this.currentUser.id)
                .select()
                .single();

            if (error) throw error;
            
            this.familySettings = data;
            return { success: true, settings: data };
        } catch (error) {
            console.error('Update family settings error:', error);
            return { success: false, error: error.message };
        }
    }

    // Progress and Analytics Methods
    async getChildProgress(childId, weekStart = null) {
        try {
            if (!weekStart) {
                weekStart = this.getWeekStart();
            }

            const { data, error } = await this.supabase
                .rpc('get_child_weekly_progress', {
                    p_child_id: childId,
                    p_week_start: weekStart
                });

            if (error) throw error;
            return data[0] || {
                total_chores: 0,
                completed_chores: 0,
                completion_percentage: 0,
                total_earnings_cents: 0
            };
        } catch (error) {
            console.error('Get child progress error:', error);
            return {
                total_chores: 0,
                completed_chores: 0,
                completion_percentage: 0,
                total_earnings_cents: 0
            };
        }
    }

    async getFamilyWeeklySummary(weekStart = null) {
        try {
            if (!weekStart) {
                weekStart = this.getWeekStart();
            }

            const { data, error } = await this.supabase
                .rpc('get_family_weekly_summary', {
                    p_user_id: this.currentUser.id,
                    p_week_start: weekStart
                });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get family weekly summary error:', error);
            return [];
        }
    }

    // Utility Methods
    getWeekStart(date = new Date()) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day; // Adjust to Sunday
        return new Date(d.setDate(diff)).toISOString().split('T')[0];
    }

    // Real-time subscriptions
    subscribeToChanges(callback) {
        return this.supabase
            .channel('family-chore-chart')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'chore_completions'
            }, callback)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'chores'
            }, callback)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'children'
            }, callback)
            .subscribe();
    }
}

// Create global instance
window.apiClient = new ApiClient(); 