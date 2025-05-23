-- Fix region_budgets table to remove fiscal_year column if it exists
ALTER TABLE region_budgets DROP COLUMN IF EXISTS fiscal_year;

-- Fix organization_budgets table to remove fiscal_year column if it exists
ALTER TABLE organization_budgets DROP COLUMN IF EXISTS fiscal_year;

-- Add appropriate RLS policy for crops table
ALTER TABLE IF EXISTS crops ENABLE ROW LEVEL SECURITY;

-- Create policy to allow farmers to access their own crops
DROP POLICY IF EXISTS crops_farmer_access ON crops;
CREATE POLICY crops_farmer_access ON crops
    FOR ALL
    TO authenticated
    USING (farmer_id = auth.uid() OR farmer_id IN (
        SELECT user_id FROM farmer_profiles WHERE user_id = auth.uid()
    ));

-- Confirm success
COMMENT ON TABLE region_budgets IS 'Region budget allocations - fiscal_year column removed';
