-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE subscription_type AS ENUM ('free', 'premium', 'enterprise');

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    family_name TEXT NOT NULL,
    subscription_type subscription_type DEFAULT 'free',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Children table
CREATE TABLE children (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    age INTEGER CHECK (age >= 0 AND age <= 18),
    avatar_color TEXT DEFAULT '#6366f1',
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chores table
CREATE TABLE chores (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    reward_cents INTEGER DEFAULT 7 CHECK (reward_cents >= 0),
    child_id UUID REFERENCES children(id) ON DELETE CASCADE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    icon TEXT DEFAULT '📝',
    category TEXT DEFAULT 'General',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chore completions table (tracks daily completion)
CREATE TABLE chore_completions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    chore_id UUID REFERENCES chores(id) ON DELETE CASCADE NOT NULL,
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6) NOT NULL, -- 0=Sunday, 1=Monday, etc.
    week_start DATE NOT NULL, -- Start of the week (Sunday)
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(chore_id, day_of_week, week_start)
);

-- Family settings table
CREATE TABLE family_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
    daily_reward_cents INTEGER DEFAULT 7 CHECK (daily_reward_cents >= 0),
    weekly_bonus_cents INTEGER DEFAULT 1 CHECK (weekly_bonus_cents >= 0),
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Family codes table (for sharing)
CREATE TABLE family_codes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);



-- Achievement badges table
CREATE TABLE achievement_badges (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    child_id UUID REFERENCES children(id) ON DELETE CASCADE NOT NULL,
    badge_type TEXT NOT NULL,
    badge_name TEXT NOT NULL,
    badge_description TEXT NOT NULL,
    badge_icon TEXT NOT NULL,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(child_id, badge_type)
);

-- Family members table (for family sharing)
CREATE TABLE family_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    family_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, family_id)
);

-- Contact submissions table (for contact form)
CREATE TABLE contact_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    family_name TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    user_agent TEXT,
    url TEXT,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'spam')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_children_user_id ON children(user_id);
CREATE INDEX idx_chores_child_id ON chores(child_id);
CREATE INDEX idx_chores_active ON chores(is_active);
CREATE INDEX idx_chores_category ON chores(category);
CREATE INDEX idx_chore_completions_chore_id ON chore_completions(chore_id);
CREATE INDEX idx_chore_completions_week ON chore_completions(week_start, day_of_week);
CREATE INDEX idx_family_settings_user_id ON family_settings(user_id);
CREATE INDEX idx_contact_submissions_user_id ON contact_submissions(user_id);
CREATE INDEX idx_contact_submissions_status ON contact_submissions(status);
CREATE INDEX idx_contact_submissions_timestamp ON contact_submissions(timestamp);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_children_updated_at BEFORE UPDATE ON children FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chores_updated_at BEFORE UPDATE ON chores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_family_settings_updated_at BEFORE UPDATE ON family_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contact_submissions_updated_at BEFORE UPDATE ON contact_submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE chores ENABLE ROW LEVEL SECURITY;
ALTER TABLE chore_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Children policies
CREATE POLICY "Users can view own children" ON children
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own children" ON children
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own children" ON children
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own children" ON children
    FOR DELETE USING (auth.uid() = user_id);

-- Chores policies
CREATE POLICY "Users can view chores for own children" ON chores
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM children 
            WHERE children.id = chores.child_id 
            AND children.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert chores for own children" ON chores
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM children 
            WHERE children.id = chores.child_id 
            AND children.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update chores for own children" ON chores
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM children 
            WHERE children.id = chores.child_id 
            AND children.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete chores for own children" ON chores
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM children 
            WHERE children.id = chores.child_id 
            AND children.user_id = auth.uid()
        )
    );

-- Chore completions policies
CREATE POLICY "Users can view completions for own children" ON chore_completions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chores 
            JOIN children ON children.id = chores.child_id
            WHERE chores.id = chore_completions.chore_id 
            AND children.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert completions for own children" ON chore_completions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM chores 
            JOIN children ON children.id = chores.child_id
            WHERE chores.id = chore_completions.chore_id 
            AND children.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update completions for own children" ON chore_completions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM chores 
            JOIN children ON children.id = chores.child_id
            WHERE chores.id = chore_completions.chore_id 
            AND children.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete completions for own children" ON chore_completions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM chores 
            JOIN children ON children.id = chores.child_id
            WHERE chores.id = chore_completions.chore_id 
            AND children.user_id = auth.uid()
        )
    );

-- Family settings policies
CREATE POLICY "Users can view own settings" ON family_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON family_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON family_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings" ON family_settings
    FOR DELETE USING (auth.uid() = user_id);

-- Enable RLS on family_codes and family_members
ALTER TABLE family_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- Family codes policies
CREATE POLICY "Users can view own family codes" ON family_codes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own family codes" ON family_codes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own family codes" ON family_codes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own family codes" ON family_codes
    FOR DELETE USING (auth.uid() = user_id);

-- Allow family code lookup for joining families (no user context needed)
CREATE POLICY "Allow family code lookup for joining" ON family_codes
    FOR SELECT USING (true);

-- Family members policies
CREATE POLICY "Users can view family members" ON family_members
    FOR SELECT USING (
        auth.uid() = user_id OR 
        auth.uid() = family_id
    );

CREATE POLICY "Users can insert family members" ON family_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update family members" ON family_members
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        auth.uid() = family_id
    );

CREATE POLICY "Users can delete family members" ON family_members
    FOR DELETE USING (
        auth.uid() = user_id OR 
        auth.uid() = family_id
    );

-- Contact submissions policies
CREATE POLICY "Users can insert their own contact submissions" ON contact_submissions
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view their own contact submissions" ON contact_submissions
    FOR SELECT USING (auth.uid() = user_id);



-- Helper functions for common operations

-- Function to get week start date (Sunday)
CREATE OR REPLACE FUNCTION get_week_start(input_date DATE DEFAULT CURRENT_DATE)
RETURNS DATE AS $$
BEGIN
    RETURN input_date - (EXTRACT(DOW FROM input_date)::INTEGER);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate child's weekly progress
CREATE OR REPLACE FUNCTION get_child_weekly_progress(
    p_child_id UUID,
    p_week_start DATE DEFAULT get_week_start()
)
RETURNS TABLE(
    total_chores INTEGER,
    completed_chores INTEGER,
    completion_percentage NUMERIC,
    total_earnings_cents INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH week_completions AS (
        SELECT 
            c.id as chore_id,
            c.reward_cents,
            COUNT(cc.id) as completed_days
        FROM chores c
        LEFT JOIN chore_completions cc ON c.id = cc.chore_id 
            AND cc.week_start = p_week_start
        WHERE c.child_id = p_child_id AND c.is_active = true
        GROUP BY c.id, c.reward_cents
    )
    SELECT 
        COUNT(*)::INTEGER as total_chores,
        COUNT(CASE WHEN completed_days = 7 THEN 1 END)::INTEGER as completed_chores,
        ROUND(
            (COUNT(CASE WHEN completed_days = 7 THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 
            1
        ) as completion_percentage,
        COALESCE(SUM(
            CASE 
                WHEN completed_days = 7 THEN reward_cents * 7
                ELSE reward_cents * completed_days
            END
        ), 0)::INTEGER as total_earnings_cents
    FROM week_completions;
END;
$$ LANGUAGE plpgsql;

-- Function to get family's weekly summary
CREATE OR REPLACE FUNCTION get_family_weekly_summary(
    p_user_id UUID,
    p_week_start DATE DEFAULT get_week_start()
)
RETURNS TABLE(
    child_id UUID,
    child_name TEXT,
    avatar_color TEXT,
    total_chores INTEGER,
    completed_chores INTEGER,
    completion_percentage NUMERIC,
    total_earnings_cents INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as child_id,
        c.name as child_name,
        c.avatar_color,
        wp.total_chores,
        wp.completed_chores,
        wp.completion_percentage,
        wp.total_earnings_cents
    FROM children c
    CROSS JOIN LATERAL get_child_weekly_progress(c.id, p_week_start) wp
    WHERE c.user_id = p_user_id
    ORDER BY c.name;
END;
$$ LANGUAGE plpgsql;

-- Function to create user profile (bypasses RLS)
CREATE OR REPLACE FUNCTION create_user_profile(
    user_id UUID,
    user_email TEXT,
    family_name TEXT
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO profiles (id, email, family_name)
    VALUES (user_id, user_email, family_name)
    ON CONFLICT (id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 