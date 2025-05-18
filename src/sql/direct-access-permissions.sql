-- Direct access permissions for region_budgets
-- This script completely disables RLS to match the other tables

-- Make sure the table has the appropriate structure
ALTER TABLE region_budgets DROP CONSTRAINT IF EXISTS region_budgets_pkey CASCADE;
ALTER TABLE region_budgets ADD PRIMARY KEY (region_id);

-- Drop existing policies
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON region_budgets;
DROP POLICY IF EXISTS "Enable superadmin access" ON region_budgets;
DROP POLICY IF EXISTS "Enable regional admin access" ON region_budgets;

-- Completely disable RLS
ALTER TABLE region_budgets DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON region_budgets TO authenticated;
GRANT ALL ON region_budgets TO anon; 