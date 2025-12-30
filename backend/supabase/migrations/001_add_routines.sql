-- Visual Routines Feature Migration
-- Adds support for step-by-step visual routines for children

-- Create routine_type enum
CREATE TYPE routine_type AS ENUM ('morning', 'bedtime', 'afterschool', 'custom');

-- Routines table
CREATE TABLE routines (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    child_id UUID REFERENCES children(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    type routine_type DEFAULT 'custom',
    icon TEXT DEFAULT '📋', -- Lucide icon key or emoji
    color TEXT DEFAULT '#6366f1', -- Hex color for visual distinction
    reward_cents INTEGER DEFAULT 7 CHECK (reward_cents >= 0), -- Points awarded on completion (uses family settings default)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Routine steps table
CREATE TABLE routine_steps (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    routine_id UUID REFERENCES routines(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT, -- Optional instructions for the step
    icon TEXT NOT NULL DEFAULT '✓', -- Lucide icon key from routine-icons.ts
    order_index INTEGER NOT NULL CHECK (order_index >= 0), -- Order of step in routine (0-based)
    duration_seconds INTEGER CHECK (duration_seconds >= 0), -- Optional timer duration
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Routine completions table (tracks each time a routine is completed)
CREATE TABLE routine_completions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    routine_id UUID REFERENCES routines(id) ON DELETE CASCADE NOT NULL,
    child_id UUID REFERENCES children(id) ON DELETE CASCADE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration_seconds INTEGER, -- How long it took to complete the routine
    steps_completed INTEGER NOT NULL, -- Number of steps completed
    steps_total INTEGER NOT NULL, -- Total steps in routine at time of completion
    points_earned INTEGER NOT NULL, -- reward_cents earned
    date DATE DEFAULT CURRENT_DATE NOT NULL -- For daily tracking
);

-- Child PIN codes table (for kid login access)
CREATE TABLE child_pins (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    child_id UUID REFERENCES children(id) ON DELETE CASCADE UNIQUE NOT NULL,
    pin_hash TEXT NOT NULL, -- Hashed PIN (4-6 digits)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_routines_child_id ON routines(child_id);
CREATE INDEX idx_routines_active ON routines(is_active);
CREATE INDEX idx_routines_type ON routines(type);
CREATE INDEX idx_routine_steps_routine_id ON routine_steps(routine_id);
CREATE INDEX idx_routine_steps_order ON routine_steps(routine_id, order_index);
CREATE INDEX idx_routine_completions_routine_id ON routine_completions(routine_id);
CREATE INDEX idx_routine_completions_child_id ON routine_completions(child_id);
CREATE INDEX idx_routine_completions_date ON routine_completions(date);
CREATE INDEX idx_child_pins_child_id ON child_pins(child_id);

-- Add updated_at triggers
CREATE TRIGGER update_routines_updated_at
    BEFORE UPDATE ON routines
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_child_pins_updated_at
    BEFORE UPDATE ON child_pins
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on all new tables
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_pins ENABLE ROW LEVEL SECURITY;

-- Routines policies (parents can manage routines for their children)
CREATE POLICY "Users can view routines for own children" ON routines
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM children
            WHERE children.id = routines.child_id
            AND children.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert routines for own children" ON routines
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM children
            WHERE children.id = routines.child_id
            AND children.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update routines for own children" ON routines
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM children
            WHERE children.id = routines.child_id
            AND children.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete routines for own children" ON routines
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM children
            WHERE children.id = routines.child_id
            AND children.user_id = auth.uid()
        )
    );

-- Routine steps policies
CREATE POLICY "Users can view steps for own children's routines" ON routine_steps
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM routines
            JOIN children ON children.id = routines.child_id
            WHERE routines.id = routine_steps.routine_id
            AND children.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert steps for own children's routines" ON routine_steps
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM routines
            JOIN children ON children.id = routines.child_id
            WHERE routines.id = routine_steps.routine_id
            AND children.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update steps for own children's routines" ON routine_steps
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM routines
            JOIN children ON children.id = routines.child_id
            WHERE routines.id = routine_steps.routine_id
            AND children.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete steps for own children's routines" ON routine_steps
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM routines
            JOIN children ON children.id = routines.child_id
            WHERE routines.id = routine_steps.routine_id
            AND children.user_id = auth.uid()
        )
    );

-- Routine completions policies
CREATE POLICY "Users can view completions for own children" ON routine_completions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM children
            WHERE children.id = routine_completions.child_id
            AND children.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert completions for own children" ON routine_completions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM children
            WHERE children.id = routine_completions.child_id
            AND children.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update completions for own children" ON routine_completions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM children
            WHERE children.id = routine_completions.child_id
            AND children.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete completions for own children" ON routine_completions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM children
            WHERE children.id = routine_completions.child_id
            AND children.user_id = auth.uid()
        )
    );

-- Child PINs policies
CREATE POLICY "Users can view PINs for own children" ON child_pins
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM children
            WHERE children.id = child_pins.child_id
            AND children.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert PINs for own children" ON child_pins
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM children
            WHERE children.id = child_pins.child_id
            AND children.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update PINs for own children" ON child_pins
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM children
            WHERE children.id = child_pins.child_id
            AND children.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete PINs for own children" ON child_pins
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM children
            WHERE children.id = child_pins.child_id
            AND children.user_id = auth.uid()
        )
    );

-- Helper functions for routines

-- Function to get child's routine completion stats for a date range
CREATE OR REPLACE FUNCTION get_child_routine_stats(
    p_child_id UUID,
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    total_completions INTEGER,
    total_steps_completed INTEGER,
    total_points_earned INTEGER,
    average_duration_seconds NUMERIC,
    completion_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH completion_data AS (
        SELECT
            COUNT(*) as completions,
            SUM(steps_completed) as steps,
            SUM(points_earned) as points,
            AVG(duration_seconds) as avg_duration
        FROM routine_completions
        WHERE child_id = p_child_id
            AND date BETWEEN p_start_date AND p_end_date
    ),
    active_routines AS (
        SELECT COUNT(*) as routine_count
        FROM routines
        WHERE child_id = p_child_id AND is_active = true
    )
    SELECT
        COALESCE(completions, 0)::INTEGER as total_completions,
        COALESCE(steps, 0)::INTEGER as total_steps_completed,
        COALESCE(points, 0)::INTEGER as total_points_earned,
        ROUND(COALESCE(avg_duration, 0), 1) as average_duration_seconds,
        CASE
            WHEN routine_count > 0 AND (p_end_date - p_start_date + 1) > 0 THEN
                ROUND((completions::NUMERIC / (routine_count * (p_end_date - p_start_date + 1))) * 100, 1)
            ELSE 0
        END as completion_rate
    FROM completion_data, active_routines;
END;
$$ LANGUAGE plpgsql;

-- Function to get today's completed routines for a child
CREATE OR REPLACE FUNCTION get_todays_completed_routine_ids(p_child_id UUID)
RETURNS TABLE(routine_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT rc.routine_id
    FROM routine_completions rc
    WHERE rc.child_id = p_child_id
        AND rc.date = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Function to verify child PIN (returns child_id if PIN is correct)
CREATE OR REPLACE FUNCTION verify_child_pin(p_pin TEXT)
RETURNS TABLE(child_id UUID, child_name TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT c.id as child_id, c.name as child_name
    FROM child_pins cp
    JOIN children c ON c.id = cp.child_id
    WHERE cp.pin_hash = crypt(p_pin, cp.pin_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
