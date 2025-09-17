// Manual Customer Upgrade Script
// Use this to manually upgrade paying customers to premium status

const { createClient } = require('@supabase/supabase-js');

// You'll need to set these environment variables or replace with actual values
const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'YOUR_SUPABASE_SERVICE_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function upgradeCustomerToPremium(email) {
    try {
        console.log(`🔍 Looking for customer: ${email}`);
        
        // Find the user by email
        const { data: user, error: userError } = await supabase.auth.admin.listUsers();
        
        if (userError) {
            throw new Error(`Error fetching users: ${userError.message}`);
        }
        
        const customer = user.users.find(u => u.email === email);
        
        if (!customer) {
            console.log(`❌ Customer not found: ${email}`);
            return false;
        }
        
        console.log(`✅ Found customer: ${customer.email} (ID: ${customer.id})`);
        
        // Check current subscription status
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('subscription_type, family_name')
            .eq('id', customer.id)
            .single();
            
        if (profileError) {
            console.log(`⚠️ Profile not found, creating profile for ${email}`);
            // Create profile if it doesn't exist
            const { data: newProfile, error: createError } = await supabase
                .from('profiles')
                .insert({
                    id: customer.id,
                    email: customer.email,
                    family_name: customer.email.split('@')[0] + "'s Family",
                    subscription_type: 'premium'
                })
                .select()
                .single();
                
            if (createError) {
                throw new Error(`Error creating profile: ${createError.message}`);
            }
            
            console.log(`🎉 Created premium profile for ${email}`);
            return true;
        }
        
        console.log(`📊 Current status: ${profile.subscription_type} (Family: ${profile.family_name})`);
        
        if (profile.subscription_type === 'premium') {
            console.log(`✅ Customer ${email} is already premium!`);
            return true;
        }
        
        // Upgrade to premium
        const { data: updated, error: updateError } = await supabase
            .from('profiles')
            .update({ subscription_type: 'premium' })
            .eq('id', customer.id)
            .select();
            
        if (updateError) {
            throw new Error(`Error updating subscription: ${updateError.message}`);
        }
        
        console.log(`🎉 Successfully upgraded ${email} to premium!`);
        return true;
        
    } catch (error) {
        console.error(`❌ Error upgrading customer:`, error.message);
        return false;
    }
}

async function checkCustomerStatus(email) {
    try {
        console.log(`🔍 Checking status for: ${email}`);
        
        // Find the user by email
        const { data: user, error: userError } = await supabase.auth.admin.listUsers();
        
        if (userError) {
            throw new Error(`Error fetching users: ${userError.message}`);
        }
        
        const customer = user.users.find(u => u.email === email);
        
        if (!customer) {
            console.log(`❌ Customer not found: ${email}`);
            return null;
        }
        
        // Get profile info
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', customer.id)
            .single();
            
        if (profileError) {
            console.log(`⚠️ No profile found for ${email}`);
            return null;
        }
        
        console.log(`📊 Customer Status:`);
        console.log(`   Email: ${customer.email}`);
        console.log(`   ID: ${customer.id}`);
        console.log(`   Family: ${profile.family_name}`);
        console.log(`   Subscription: ${profile.subscription_type}`);
        console.log(`   Created: ${customer.created_at}`);
        console.log(`   Last Sign In: ${customer.last_sign_in_at || 'Never'}`);
        
        return profile;
        
    } catch (error) {
        console.error(`❌ Error checking customer:`, error.message);
        return null;
    }
}

// Main execution
async function main() {
    const customerEmail = 'candaceriddell@yahoo.com';
    
    console.log('🚀 ChoreStar Customer Management Tool');
    console.log('=====================================\n');
    
    // First check current status
    await checkCustomerStatus(customerEmail);
    
    console.log('\n📝 Action Options:');
    console.log('1. To upgrade this customer to premium, uncomment the line below');
    console.log('2. To check another customer, change the email above\n');
    
    // Uncomment this line to actually upgrade the customer:
    // await upgradeCustomerToPremium(customerEmail);
    
    console.log('✅ Done!');
}

// Run the script
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { upgradeCustomerToPremium, checkCustomerStatus };
