-- Comprehensive Migration: Add all payment-related columns to subscriptions table
-- This adds ALL missing payment columns that were added to the Subscription model

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
        RAISE NOTICE 'Added payment_status column';
    ELSE
        RAISE NOTICE 'payment_status column already exists';
    END IF;
END $$;

-- Add transaction_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'subscriptions'
        AND column_name = 'transaction_id'
    ) THEN
        ALTER TABLE subscriptions
        ADD COLUMN transaction_id VARCHAR(255) DEFAULT NULL;
        RAISE NOTICE 'Added transaction_id column';
    ELSE
        RAISE NOTICE 'transaction_id column already exists';
    END IF;
END $$;

-- Add amount_paid column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'subscriptions'
        AND column_name = 'amount_paid'
    ) THEN
        ALTER TABLE subscriptions
        ADD COLUMN amount_paid FLOAT DEFAULT NULL;
        RAISE NOTICE 'Added amount_paid column';
    ELSE
        RAISE NOTICE 'amount_paid column already exists';
    END IF;
END $$;

-- Add stripe_customer_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'subscriptions'
        AND column_name = 'stripe_customer_id'
    ) THEN
        ALTER TABLE subscriptions
        ADD COLUMN stripe_customer_id VARCHAR(255) DEFAULT NULL;
        RAISE NOTICE 'Added stripe_customer_id column';
    ELSE
        RAISE NOTICE 'stripe_customer_id column already exists';
    END IF;
END $$;

-- Add stripe_subscription_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'subscriptions'
        AND column_name = 'stripe_subscription_id'
    ) THEN
        ALTER TABLE subscriptions
        ADD COLUMN stripe_subscription_id VARCHAR(255) DEFAULT NULL;
        RAISE NOTICE 'Added stripe_subscription_id column';
    ELSE
        RAISE NOTICE 'stripe_subscription_id column already exists';
    END IF;
END $$;

-- Update existing records to have 'paid' status if they have a transaction_id
-- This needs to be separate and AFTER the columns are added
DO $$
BEGIN
    UPDATE subscriptions
    SET payment_status = 'paid'
    WHERE transaction_id IS NOT NULL
      AND payment_status = 'unpaid';

    RAISE NOTICE 'Updated existing records with transaction_id to paid status';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not update existing records (this is okay if table is empty)';
END $$;

-- Show result - list all payment columns
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'subscriptions'
  AND column_name IN ('payment_status', 'transaction_id', 'amount_paid', 'stripe_customer_id', 'stripe_subscription_id')
ORDER BY column_name;
