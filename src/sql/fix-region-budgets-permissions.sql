-- Fix permissions for region_budgets table
-- This script addresses the "permission denied for table region_budgets" error

-- First, make sure RLS is disabled for region_budgets
ALTER TABLE region_budgets DISABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON region_budgets;
DROP POLICY IF EXISTS "Enable superadmin access" ON region_budgets;
DROP POLICY IF EXISTS "Enable regional admin access" ON region_budgets;

-- Re-create the policies with proper permissions
-- 1. Superadmin can do anything with all rows
CREATE POLICY "Enable superadmin access" 
ON region_budgets FOR ALL 
USING (auth.jwt() ->> 'role' = 'superadmin' OR auth.jwt() ->> 'role' = 'admin')
WITH CHECK (auth.jwt() ->> 'role' = 'superadmin' OR auth.jwt() ->> 'role' = 'admin');

-- 2. Regional admins can only view and update their own region's budget
CREATE POLICY "Enable regional admin access" 
ON region_budgets FOR ALL 
USING (
  auth.jwt() ->> 'role' = 'regional_admin' AND 
  region_id IN (
    SELECT region_id FROM user_regions WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'regional_admin' AND 
  region_id IN (
    SELECT region_id FROM user_regions WHERE user_id = auth.uid()
  )
);

-- Re-enable RLS
ALTER TABLE region_budgets ENABLE ROW LEVEL SECURITY;

-- Grant explicit permissions
GRANT ALL ON region_budgets TO authenticated;
GRANT ALL ON region_budgets TO service_role; 