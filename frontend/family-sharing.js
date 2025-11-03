// Family Sharing System for ChoreStar
class FamilySharing {
    constructor() {
        this.supabase = window.supabaseClient || window.supabase;
    }

    // Generate a unique 6-digit family code
    generateFamilyCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    // Create or get family code for current user
    async getOrCreateFamilyCode() {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) return null;

            // Check if user already has a family code
            const { data: existingCode, error: existingError } = await this.supabase
                .from('family_codes')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (existingCode) {
                return existingCode.code;
            }

            // Generate new family code
            const code = this.generateFamilyCode();
            
            // Save to database
            const { error: insertError } = await this.supabase
                .from('family_codes')
                .insert({
                    user_id: user.id,
                    code: code,
                    created_at: new Date().toISOString()
                });

            if (insertError) throw insertError;
            
            return code;
        } catch (error) {
            console.error('Error getting family code:', error);
            return null;
        }
    }

    // Join family using code
    async joinFamily(code) {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) return { success: false, error: 'Not authenticated' };

            // Find family by code
            const { data: familyCode, error: findError } = await this.supabase
                .from('family_codes')
                .select('*')
                .eq('code', code)
                .single();

            if (findError || !familyCode) {
                return { success: false, error: 'Invalid family code' };
            }

            // Check if user is already in a family
            const { data: existingMembership, error: membershipError } = await this.supabase
                .from('family_members')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (existingMembership) {
                return { success: false, error: 'Already in a family' };
            }

            // Add user to family
            const { error: joinError } = await this.supabase
                .from('family_members')
                .insert({
                    user_id: user.id,
                    family_id: familyCode.user_id,
                    joined_at: new Date().toISOString()
                });

            if (joinError) throw joinError;

            return { success: true, familyId: familyCode.user_id };
        } catch (error) {
            console.error('Error joining family:', error);
            return { success: false, error: error.message };
        }
    }

    // Get family members
    async getFamilyMembers() {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) return [];

            // Get family ID (either as owner or member)
            const { data: familyCode } = await this.supabase
                .from('family_codes')
                .select('user_id')
                .eq('user_id', user.id)
                .single();

            const { data: familyMembership } = await this.supabase
                .from('family_members')
                .select('family_id')
                .eq('user_id', user.id)
                .single();

            const familyId = familyCode?.user_id || familyMembership?.family_id;
            if (!familyId) return [];

            // Get all family members
            const { data: members, error } = await this.supabase
                .from('family_members')
                .select(`
                    user_id,
                    joined_at,
                    profiles:user_id (
                        email,
                        family_name
                    )
                `)
                .eq('family_id', familyId);

            if (error) throw error;
            return members || [];
        } catch (error) {
            console.error('Error getting family members:', error);
            return [];
        }
    }

    // Check if user is in a family
    async isInFamily() {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) return false;

            // Check if user owns a family
            const { data: ownsFamily } = await this.supabase
                .from('family_codes')
                .select('code')
                .eq('user_id', user.id)
                .single();

            if (ownsFamily) return true;

            // Check if user is a member of a family
            const { data: isMember } = await this.supabase
                .from('family_members')
                .select('family_id')
                .eq('user_id', user.id)
                .single();

            return !!isMember;
        } catch (error) {
            console.error('Error checking family status:', error);
            return false;
        }
    }

    // Get family data (children, chores, etc.) for all family members
    async getFamilyData() {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) return null;

            // Get family ID
            const { data: familyCode } = await this.supabase
                .from('family_codes')
                .select('user_id')
                .eq('user_id', user.id)
                .single();

            const { data: familyMembership } = await this.supabase
                .from('family_members')
                .select('family_id')
                .eq('user_id', user.id)
                .single();

            const familyId = familyCode?.user_id || familyMembership?.family_id;
            if (!familyId) return null;

            // Get all children for the family
            const { data: children, error: childrenError } = await this.supabase
                .from('children')
                .select('*')
                .eq('user_id', familyId)
                .order('name');

            if (childrenError) throw childrenError;

            // Get all chores for the family
            const { data: chores, error: choresError } = await this.supabase
                .from('chores')
                .select('*')
                .eq('user_id', familyId)
                .order('name');

            if (choresError) throw choresError;

            return {
                children: children || [],
                chores: chores || []
            };
        } catch (error) {
            console.error('Error getting family data:', error);
            return null;
        }
    }

    // Share family code via clipboard
    async shareFamilyCode() {
        try {
            const code = await this.getOrCreateFamilyCode();
            if (!code) return { success: false, error: 'Could not generate code' };

            // Copy to clipboard
            await navigator.clipboard.writeText(code);
            
            return { success: true, code };
        } catch (error) {
            console.error('Error sharing family code:', error);
            return { success: false, error: error.message };
        }
    }

    // Validate family code format
    isValidCode(code) {
        return /^\d{6}$/.test(code);
    }
}

// Create global instance
window.familySharing = new FamilySharing(); 