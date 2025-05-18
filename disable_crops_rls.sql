-- Disable Row Level Security for crops table
-- This will allow all authenticated users to access all crop data

-- Disable RLS on crops table
ALTER TABLE crops DISABLE ROW LEVEL SECURITY;

-- Also disable RLS on crop_activities table if it's causing issues
ALTER TABLE crop_activities DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies on these tables
DROP POLICY IF EXISTS "Farmers can view their own crops" ON crops;
DROP POLICY IF EXISTS "Farmers can add crops to their plots" ON crops;
DROP POLICY IF EXISTS "Farmers can update their own crops" ON crops;
DROP POLICY IF EXISTS "Farmers can delete their own crops" ON crops;
DROP POLICY IF EXISTS "Farmers can view their own crop activities" ON crop_activities; 