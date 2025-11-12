-- Migration: Add payment_status column to subscriptions table
-- This adds the missing payment_status column that was added to the Subscription model

-- Add payment_status column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'subscriptions'
        AND column_name = 'payment_status'
    ) THEN
        ALTER TABLE subscriptions
        ADD COLUMN payment_status VARCHAR(50) DEFAULT 'unpaid';

        RAISE NOTICE 'Added payment_status column to subscriptions table';
    ELSE
        RAISE NOTICE 'payment_status column already exists';
    END IF;
END $$;

-- Update existing records to have 'paid' status if they have a transaction_id
UPDATE subscriptions
SET payment_status = 'paid'
WHERE transaction_id IS NOT NULL
  AND payment_status = 'unpaid';

-- Show result
SELECT
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'subscriptions'
  AND column_name = 'payment_status';
