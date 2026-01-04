-- Migration: Add password reset columns to users table
-- Run with: psql -U postgres -d insightsheet_lite -f add_reset_columns.sql

-- Add reset_token column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'reset_token'
    ) THEN
        ALTER TABLE users ADD COLUMN reset_token VARCHAR(255);
        RAISE NOTICE '✅ Added reset_token column';
    ELSE
        RAISE NOTICE 'reset_token column already exists';
    END IF;
END $$;

-- Add reset_token_expires column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'reset_token_expires'
    ) THEN
        ALTER TABLE users ADD COLUMN reset_token_expires TIMESTAMP;
        RAISE NOTICE '✅ Added reset_token_expires column';
    ELSE
        RAISE NOTICE 'reset_token_expires column already exists';
    END IF;
END $$;

-- Verify columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users' AND column_name IN ('reset_token', 'reset_token_expires');
