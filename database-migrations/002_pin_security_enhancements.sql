-- Pin Security Enhancements Migration
-- This migration adds columns for enhanced PIN security:
-- - pin_salt: Random salt for each PIN (prevents rainbow table attacks)
-- - failed_attempts: Track failed login attempts per child
-- - locked_until: Timestamp for account lockout after too many failures
--
-- Run this in your Supabase SQL Editor or via psql

-- Add new columns to child_pins table
ALTER TABLE child_pins
ADD COLUMN IF NOT EXISTS pin_salt VARCHAR(64),
ADD COLUMN IF NOT EXISTS failed_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;

-- Create index on locked_until for faster queries
CREATE INDEX IF NOT EXISTS idx_child_pins_locked_until ON child_pins(locked_until);

-- Update existing PINs to have no lockout (they'll get salt when next updated)
UPDATE child_pins
SET failed_attempts = 0,
    locked_until = NULL
WHERE failed_attempts IS NULL;

-- Add comment explaining the columns
COMMENT ON COLUMN child_pins.pin_salt IS 'Random salt used for hashing the PIN (prevents rainbow table attacks)';
COMMENT ON COLUMN child_pins.failed_attempts IS 'Number of failed PIN verification attempts';
COMMENT ON COLUMN child_pins.locked_until IS 'Timestamp until which the PIN is locked due to too many failed attempts';
