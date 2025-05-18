-- Fix organization_budgets table schema

-- Check if remaining_amount column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'organization_budgets'
        AND column_name = 'remaining_amount'
    ) THEN
        -- Add the missing column
        ALTER TABLE public.organization_budgets ADD COLUMN remaining_amount DECIMAL DEFAULT 0;
        
        -- Update remaining_amount to match total_allocation where null
        UPDATE public.organization_budgets
        SET remaining_amount = total_allocation
        WHERE remaining_amount IS NULL;
    END IF;
END $$;

-- Check for remaining_balance column (alternate name that might exist)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'organization_budgets'
        AND column_name = 'remaining_balance'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'organization_budgets'
        AND column_name = 'remaining_amount'
    ) THEN
        -- Add remaining_amount as a copy of remaining_balance
        ALTER TABLE public.organization_budgets ADD COLUMN remaining_amount DECIMAL DEFAULT 0;
        
        -- Copy values from remaining_balance
        UPDATE public.organization_budgets
        SET remaining_amount = remaining_balance;
    END IF;
END $$;

-- Check for utilized_amount column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'organization_budgets'
        AND column_name = 'utilized_amount'
    ) THEN
        -- Add the missing column
        ALTER TABLE public.organization_budgets ADD COLUMN utilized_amount DECIMAL DEFAULT 0;
    END IF;
END $$;

-- Output success message
DO $$
BEGIN
    RAISE NOTICE 'Organization budgets table schema has been fixed.';
END $$; 