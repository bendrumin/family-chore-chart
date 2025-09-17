-- Currency Support Migration Script
-- This script safely adds currency and locale support to the family_settings table
-- Run this on your production database to add international currency functionality

-- Step 1: Check if columns already exist (safety check)
DO $$
BEGIN
    -- Check if currency_code column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'family_settings' AND column_name = 'currency_code'
    ) THEN
        -- Add currency_code column for international currency support
        ALTER TABLE family_settings ADD COLUMN currency_code TEXT DEFAULT 'USD';
        RAISE NOTICE 'Added currency_code column to family_settings table';
    ELSE
        RAISE NOTICE 'currency_code column already exists, skipping';
    END IF;
    
    -- Check if locale column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'family_settings' AND column_name = 'locale'
    ) THEN
        -- Add locale column for internationalization
        ALTER TABLE family_settings ADD COLUMN locale TEXT DEFAULT 'en-US';
        RAISE NOTICE 'Added locale column to family_settings table';
    ELSE
        RAISE NOTICE 'locale column already exists, skipping';
    END IF;
    
    -- Check if date_format column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'family_settings' AND column_name = 'date_format'
    ) THEN
        -- Add date_format column for date formatting preferences
        ALTER TABLE family_settings ADD COLUMN date_format TEXT DEFAULT 'auto';
        RAISE NOTICE 'Added date_format column to family_settings table';
    ELSE
        RAISE NOTICE 'date_format column already exists, skipping';
    END IF;
    
    -- Check if language column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'family_settings' AND column_name = 'language'
    ) THEN
        -- Add language column for interface language preference
        ALTER TABLE family_settings ADD COLUMN language TEXT DEFAULT 'en';
        RAISE NOTICE 'Added language column to family_settings table';
    ELSE
        RAISE NOTICE 'language column already exists, skipping';
    END IF;
END $$;

-- Step 2: Add column comments for documentation
COMMENT ON COLUMN family_settings.currency_code IS 'ISO 4217 currency code (e.g., USD, GBP, EUR) for displaying rewards and earnings';
COMMENT ON COLUMN family_settings.locale IS 'Locale code (e.g., en-US, en-GB, fr-FR) for date/time formatting and number formatting';
COMMENT ON COLUMN family_settings.date_format IS 'Date format preference (auto, MM/DD/YYYY, DD/MM/YYYY, etc.) for displaying dates';
COMMENT ON COLUMN family_settings.language IS 'Interface language preference (en, es, fr, de) for app localization';

-- Step 3: Add constraints for data integrity
ALTER TABLE family_settings ADD CONSTRAINT check_currency_code 
    CHECK (currency_code ~ '^[A-Z]{3}$');

ALTER TABLE family_settings ADD CONSTRAINT check_locale_format 
    CHECK (locale ~ '^[a-z]{2}-[A-Z]{2}$');

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_family_settings_currency ON family_settings(currency_code);
CREATE INDEX IF NOT EXISTS idx_family_settings_locale ON family_settings(locale);

-- Step 5: Verify the migration was successful
SELECT 
    'Currency support migration completed successfully!' as status,
    COUNT(*) as total_families,
    COUNT(currency_code) as families_with_currency,
    COUNT(locale) as families_with_locale,
    COUNT(DISTINCT currency_code) as unique_currencies,
    COUNT(DISTINCT locale) as unique_locales
FROM family_settings;

-- Step 6: Show sample of existing data
SELECT 
    user_id,
    daily_reward_cents,
    weekly_bonus_cents,
    currency_code,
    locale,
    timezone
FROM family_settings 
LIMIT 5;

-- Step 7: Show the updated table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'family_settings' 
ORDER BY ordinal_position;
