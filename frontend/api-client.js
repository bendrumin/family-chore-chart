// API Client for Family Chore Chart
// Handles all Supabase interactions with proper error handling

class ApiClient {
    constructor() {
        // Prefer the initialized client; fallback to legacy global if present
        this.supabase = window.supabaseClient || window.supabase;
        this.currentUser = null;
        this.familySettings = null;
        
        // Check if Supabase is properly initialized
        if (!this.supabase) {
            console.error('❌ Supabase client not initialized. Check supabase-config.js');
        }
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
            
            // Check if Supabase is available
            if (!this.supabase || !this.supabase.auth) {
                throw new Error('Supabase client not properly initialized. Please refresh the page and try again.');
            }
            
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            this.currentUser = data.user;
            return { success: true, user: data.user, session: data.session };
        } catch (error) {
            console.error('Sign in error:', error);
            return { success: false, error: error.message };
        }
    }

    async signOut() {
        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;
            
            // Clear PIN session as well
            localStorage.removeItem('chorestar_pin_session');
            
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
            // Check for regular Supabase session
            const { data: { user }, error } = await this.supabase.auth.getUser();
            if (error) {
                // Don't log AuthSessionMissingError as it's expected for new users
                if (error.message !== 'Auth session missing!') {
                    console.error('Get current user error:', error);
                }
                return null;
            }
            
            this.currentUser = user;
            return user;
        } catch (error) {
            // Don't log AuthSessionMissingError as it's expected for new users
            if (error.message !== 'Auth session missing!') {
                console.error('Get current user error:', error);
            }
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

            // Use RPC function to bypass RLS for profile creation
            const { error } = await this.supabase
                .rpc('create_user_profile', {
                    user_id: userId,
                    user_email: email,
                    family_name: familyName
                });

            if (error) {
                // Fallback to direct insert if RPC doesn't exist
                const { error: insertError } = await this.supabase
                    .from('profiles')
                    .insert({
                        id: userId,
                        email,
                        family_name: familyName
                    });
                
                if (insertError) throw insertError;
            }
            
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
            if (!this.currentUser || !this.currentUser.id) {
                return [];
            }
            
            
            // Check if we're in a PIN session
            const pinSessionStr = localStorage.getItem('chorestar_pin_session');
            if (pinSessionStr) {
                const pinSession = JSON.parse(pinSessionStr);
                if (pinSession.userId) {
                    // Use the stored user ID from PIN session
                    const { data, error } = await this.supabase
                        .from('children')
                        .select('*')
                        .eq('user_id', pinSession.userId)
                        .order('name');

                    if (error) {
                        console.error('Get children error with PIN session:', error);
                        return [];
                    }
                    return data || [];
                }
            }
            
            // Fallback to regular method
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

    async createChild(name, age, avatarColor, avatarUrl = '', avatarFile = '') {
        try {
            if (!this.currentUser || !this.currentUser.id) {
                console.error('No current user - cannot create child');
                return { success: false, error: 'User not authenticated' };
            }
            
            const { data, error } = await this.supabase
                .from('children')
                .insert({
                    name,
                    age,
                    avatar_color: avatarColor,
                    user_id: this.currentUser.id,
                    avatar_url: avatarUrl,
                    avatar_file: avatarFile
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
            if (!this.currentUser || !this.currentUser.id) {
                console.log('No current user - returning empty chores array');
                return [];
            }
            
            // Check if we're in a PIN session
            const pinSessionStr = localStorage.getItem('chorestar_pin_session');
            let userId = this.currentUser.id;
            
            if (pinSessionStr) {
                const pinSession = JSON.parse(pinSessionStr);
                if (pinSession.userId) {
                    userId = pinSession.userId;
                }
            }
            
            let query = this.supabase
                .from('chores')
                .select(`
                    *,
                    children!inner(user_id)
                `)
                .eq('children.user_id', userId)
                .eq('is_active', true);

            if (childId) {
                query = query.eq('child_id', childId);
            }

            // Order by sort_order first (ascending), then by name as secondary sort
            // Supabase supports chained .order() calls for multi-column sorting
            const { data, error } = await query
                .order('sort_order', { ascending: true, nullsFirst: false })
                .order('name', { ascending: true });
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get chores error:', error);
            return [];
        }
    }

    async createChore(name, rewardCents, childId, icon = '📝', category = 'household_chores', notes = '', color = null) {
        try {
            const { data, error } = await this.supabase
                .from('chores')
                .insert({
                    name,
                    reward_cents: rewardCents,
                    child_id: childId,
                    icon: icon,
                    category: category,
                    notes: notes,
                    color: color
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

            // Check if we're in a PIN session
            const pinSessionStr = localStorage.getItem('chorestar_pin_session');
            let userId = this.currentUser.id;
            
            if (pinSessionStr) {
                const pinSession = JSON.parse(pinSessionStr);
                if (pinSession.userId) {
                    userId = pinSession.userId;
                }
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
                .eq('chores.children.user_id', userId)
                .eq('week_start', weekStart);

            if (error) {
                console.error('Supabase query error:', error);
                // Check for CORS/network errors
                if (error.message && (error.message.includes('CORS') || error.message.includes('fetch'))) {
                    console.error('⚠️ CORS or network error detected. Check Supabase project settings:');
                    console.error('   1. Go to Supabase Dashboard > Project Settings > API');
                    console.error('   2. Add "http://localhost:3000" to "Allowed Origins"');
                    console.error('   3. Also check if Supabase service is operational (502 error suggests service issue)');
                }
                throw error;
            }
            return data || [];
        } catch (error) {
            console.error('Get chore completions error:', error);
            // Show user-friendly error for network issues
            if (error.message && error.message.includes('CORS')) {
                console.error('❌ CORS Error: Your Supabase project needs to allow localhost:3000');
                console.error('   Fix: Supabase Dashboard > Settings > API > Add "http://localhost:3000" to allowed origins');
            }
            if (error.status === 502 || error.message?.includes('502')) {
                console.error('❌ Supabase service appears to be down (502 Bad Gateway)');
                console.error('   Check: https://status.supabase.com for service status');
            }
            return [];
        }
    }

    async toggleChoreCompletion(choreId, dayOfWeek, weekStart = null) {
        try {
            if (!weekStart) {
                weekStart = this.getWeekStart();
            }


            // Check if user is authenticated
            const { data: { user }, error: authError } = await this.supabase.auth.getUser();
            if (authError || !user) {
                console.error('Authentication error:', authError);
                throw new Error('User not authenticated');
            }

            // Check if completion exists
            const { data: existing, error: queryError } = await this.supabase
                .from('chore_completions')
                .select('id')
                .eq('chore_id', choreId)
                .eq('day_of_week', dayOfWeek)
                .eq('week_start', weekStart)
                .maybeSingle();

            if (queryError) {
                console.error('Query error:', queryError);
                throw queryError;
            }

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
            // Check if we're in a PIN session
            const pinSessionStr = localStorage.getItem('chorestar_pin_session');
            let userId = this.currentUser.id;
            
            if (pinSessionStr) {
                const pinSession = JSON.parse(pinSessionStr);
                if (pinSession.userId) {
                    userId = pinSession.userId;
                }
            }
            
            const { data, error } = await this.supabase
                .from('family_settings')
                .select('*')
                .eq('user_id', userId)
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
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                currency_code: this.detectCurrency(),
                locale: navigator.language || 'en-US',
                date_format: 'auto',
                language: 'en'
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

    // Theme Methods
    async saveCustomTheme(theme) {
        try {
            if (!this.currentUser || !this.currentUser.id) {
                return { success: false, error: 'User not authenticated' };
            }

            // Ensure family_settings exists
            await this.getFamilySettings();

            const { data, error } = await this.supabase
                .from('family_settings')
                .update({ custom_theme: theme })
                .eq('user_id', this.currentUser.id)
                .select()
                .single();

            if (error) throw error;
            
            if (this.familySettings) {
                this.familySettings.custom_theme = theme;
            }
            
            return { success: true, theme };
        } catch (error) {
            console.error('Save custom theme error:', error);
            return { success: false, error: error.message };
        }
    }

    async getCustomTheme() {
        try {
            const settings = await this.getFamilySettings();
            if (!settings || !settings.custom_theme) {
                return null;
            }
            return settings.custom_theme;
        } catch (error) {
            console.error('Get custom theme error:', error);
            return null;
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
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - day);
        const result = weekStart.toISOString().split('T')[0];
        return result;
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

    // Subscription Methods
    async getSubscription() {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) return null;

            const { data, error } = await this.supabase
                .from('profiles')
                .select('subscription_type')
                .eq('id', user.id)
                .single();
            
            if (error) throw error;
            return data?.subscription_type || 'free';
        } catch (error) {
            console.error('Error fetching subscription:', error);
            return 'free';
        }
    }

    async getSubscriptionType() {
        try {
            return await this.getSubscription();
        } catch (error) {
            console.error('Error getting subscription type:', error);
            return 'free';
        }
    }

    async updateSubscriptionStatus(subscriptionType) {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const { data, error } = await this.supabase
                .from('profiles')
                .update({ subscription_type: subscriptionType })
                .eq('id', user.id)
                .select();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating subscription status:', error);
            throw error;
        }
    }

    async checkSubscriptionLimits() {
        const subscription = await this.getSubscription();
        
        // Admin account (your email) gets premium access
        const { data: { user } } = await this.supabase.auth.getUser();
        if (user?.email === 'bsiegel13@gmail.com') {
            return { 
                canAddChildren: true, 
                canAddChores: true, 
                isPremium: true,
                canUseCustomIcons: true,
                canUseCategories: true,
                canUsePointsSystem: true,
                canEarnBadges: true,
                canExportReports: true
            };
        }

        if (subscription === 'premium' || subscription === 'lifetime') {
            return { 
                canAddChildren: true, 
                canAddChores: true, 
                isPremium: true,
                canUseCustomIcons: true,
                canUseCategories: true,
                canUsePointsSystem: true,
                canEarnBadges: true,
                canExportReports: true
            };
        }

        // Free tier limits
        const children = await this.getChildren();
        const chores = await this.getChores();
        const maxChildren = 2;
        const maxChores = 5;
        return {
            canAddChildren: children.length < maxChildren,
            canAddChores: chores.length < maxChores,
            isPremium: false,
            childrenCount: children.length,
            maxChildren,
            choresCount: chores.length,
            maxChores,
            canUseCustomIcons: false,
            canUseCategories: false,
            canUsePointsSystem: false,
            canEarnBadges: false,
            canExportReports: false
        };
    }

    // Premium feature methods
    async getAchievementBadges(childId) {
        try {
            const { data, error } = await this.supabase
                .from('achievement_badges')
                .select('*')
                .eq('child_id', childId)
                .order('earned_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get achievement badges error:', error);
            return [];
        }
    }

    async awardBadge(childId, badgeType, badgeName, badgeDescription, badgeIcon) {
        try {
            const { data, error } = await this.supabase
                .from('achievement_badges')
                .insert({
                    child_id: childId,
                    badge_type: badgeType,
                    badge_name: badgeName,
                    badge_description: badgeDescription,
                    badge_icon: badgeIcon
                })
                .select()
                .single();

            if (error) throw error;
            return { success: true, badge: data };
        } catch (error) {
            console.error('Award badge error:', error);
            return { success: false, error: error.message };
        }
    }

    async exportFamilyReport() {
        try {
            const children = await this.getChildren();
            const chores = await this.getChores();
            const completions = await this.getChoreCompletions();
            
            const report = {
                generatedAt: new Date().toISOString(),
                children: children.map(child => ({
                    name: child.name,
                    age: child.age,
                    chores: chores.filter(chore => chore.child_id === child.id).map(chore => ({
                        name: chore.name,
                        icon: chore.icon,
                        category: chore.category,
                        reward: chore.reward_cents
                    }))
                })),
                totalChores: chores.length,
                totalCompletions: completions.length
            };

            return { success: true, report };
        } catch (error) {
            console.error('Export report error:', error);
            return { success: false, error: error.message };
        }
    }

    // Contact form submission
    async submitContactForm(name, email, subject, message) {
        try {
            // Get current user info for additional context
            const user = await this.getCurrentUser();
            const profile = await this.getProfile();
            
            const contactData = {
                name,
                email,
                subject,
                message,
                user_id: user?.id || null,
                family_name: profile?.family_name || 'Unknown',
                timestamp: new Date().toISOString(),
                user_agent: navigator.userAgent,
                url: window.location.href
            };

            // Store in Supabase for admin review
            const { data, error } = await this.supabase
                .from('contact_submissions')
                .insert(contactData)
                .select()
                .single();

            if (error) throw error;

            // Send email notification to admin
            try {
                const emailResponse = await fetch('/api/send-contact-email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name,
                        email,
                        subject,
                        message,
                        submissionId: data.id
                    })
                });

                const emailResult = await emailResponse.json();

                if (!emailResponse.ok) {
                    console.warn('Email notification failed, but contact form submission was successful');
                }
            } catch (emailError) {
                console.warn('Email notification error:', emailError);
                // Don't fail the entire submission if email fails
            }

            return { success: true, submissionId: data.id };
        } catch (error) {
            console.error('Contact form submission error:', error);
            return { success: false, error: error.message };
        }
    }
    
    detectCurrency() {
        // Detect currency based on user's locale
        const locale = navigator.language || 'en-US';
        const country = locale.split('-')[1];
        
        const currencyMap = {
            'US': 'USD',
            'GB': 'GBP',
            'CA': 'CAD',
            'AU': 'AUD',
            'DE': 'EUR',
            'FR': 'EUR',
            'IT': 'EUR',
            'ES': 'EUR',
            'NL': 'EUR',
            'BE': 'EUR',
            'AT': 'EUR',
            'IE': 'EUR',
            'FI': 'EUR',
            'PT': 'EUR',
            'LU': 'EUR',
            'CY': 'EUR',
            'MT': 'EUR',
            'SK': 'EUR',
            'SI': 'EUR',
            'EE': 'EUR',
            'LV': 'EUR',
            'LT': 'EUR',
            'JP': 'JPY',
            'CN': 'CNY',
            'IN': 'INR',
            'BR': 'BRL',
            'MX': 'MXN',
            'RU': 'RUB',
            'KR': 'KRW',
            'SG': 'SGD',
            'HK': 'HKD',
            'NZ': 'NZD',
            'CH': 'CHF',
            'SE': 'SEK',
            'NO': 'NOK',
            'DK': 'DKK',
            'PL': 'PLN',
            'CZ': 'CZK',
            'HU': 'HUF'
        };
        
        return currencyMap[country] || 'USD';
    }

    // Update chore order for a specific child
    async updateChoreOrder(childId, newOrder) {
        try {
            if (!childId || !newOrder || !Array.isArray(newOrder)) {
                throw new Error('Invalid parameters for updateChoreOrder');
            }

            // Update each chore's sort_order individually
            // Using individual updates is more reliable than upsert for updates
            const updatePromises = newOrder.map(item => {
                return this.supabase
                    .from('chores')
                    .update({ sort_order: item.sort_order })
                    .eq('id', item.id)
                    .eq('child_id', childId); // Extra safety check
            });

            const results = await Promise.all(updatePromises);
            
            // Check for errors
            const errors = results.filter(result => result.error);
            if (errors.length > 0) {
                const errorMessages = errors.map(e => e.error?.message || 'Unknown error').join('; ');
                throw new Error(`Failed to update some chores: ${errorMessages}`);
            }

            return { success: true, data: results.map(r => r.data).flat() };
        } catch (error) {
            console.error('Error updating chore order:', error);
            return { success: false, error: error.message || 'Unknown error' };
        }
    }
}

// Create global instance
window.apiClient = new ApiClient(); 