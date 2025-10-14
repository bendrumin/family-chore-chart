-- Add achievement_badges table if it doesn't exist
-- Safe to run multiple times

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'achievement_badges') THEN
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
        
        -- Create index for performance
        CREATE INDEX IF NOT EXISTS idx_achievement_badges_child_id ON achievement_badges(child_id);
        CREATE INDEX IF NOT EXISTS idx_achievement_badges_earned_at ON achievement_badges(earned_at DESC);
        
        RAISE NOTICE '✅ Created achievement_badges table';
    ELSE
        RAISE NOTICE 'ℹ️  achievement_badges table already exists';
    END IF;
END $$;

-- Verify the table was created
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'achievement_badges'
ORDER BY ordinal_position;

