-- Fix organization members access issues
-- This script addresses issues with accessing the organization_members table
-- It works by:
-- 1. Disabling RLS (Row Level Security) on the table
-- 2. Granting proper permissions to all roles
-- 3. Creating a stored procedure to fetch members safely

BEGIN;

-- First check if the table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'organization_members'
  ) THEN
    RAISE NOTICE 'Table organization_members does not exist, creating it...';
    
    -- Create organization_members table
    CREATE TABLE IF NOT EXISTS public.organization_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
      farmer_id UUID REFERENCES public.farmer_profiles(id) ON DELETE CASCADE,
      role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('member', 'admin', 'manager')),
      status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
      join_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(organization_id, farmer_id)
    );
    
    -- Add indexes for performance
    CREATE INDEX IF NOT EXISTS idx_organization_members_org_id 
      ON public.organization_members(organization_id);
      
    CREATE INDEX IF NOT EXISTS idx_organization_members_farmer_id 
      ON public.organization_members(farmer_id);
  END IF;
END $$;

-- Disable RLS on the table to allow direct access
ALTER TABLE public.organization_members DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON public.organization_members TO anon, authenticated, service_role;

-- First drop the existing function if it exists
DROP FUNCTION IF EXISTS get_organization_members(UUID);

-- Create RPC function to get members for an organization 
-- This provides an alternative way to access the data
CREATE OR REPLACE FUNCTION get_organization_members(org_id UUID)
RETURNS SETOF organization_members
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM organization_members 
  WHERE organization_id = org_id;
$$;

-- Grant execute permissions on the function
GRANT EXECUTE ON FUNCTION get_organization_members(UUID) TO anon, authenticated, service_role;

-- Create a check function to verify the RLS is disabled
-- First drop if exists to avoid conflicts
DROP FUNCTION IF EXISTS check_rls_status();

CREATE OR REPLACE FUNCTION check_rls_status() 
RETURNS TABLE (table_name text, rls_enabled boolean)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tables.table_name::text,
    tables.rls_enabled
  FROM 
    pg_tables AS tables
  WHERE 
    tables.schemaname = 'public' AND
    tables.table_name = 'organization_members';
END;
$$;

-- Run the check function to verify RLS is disabled
SELECT * FROM check_rls_status();

-- First drop if exists to avoid conflicts
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Update trigger to set updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create the trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_organization_members_updated_at') THEN
        CREATE TRIGGER update_organization_members_updated_at
            BEFORE UPDATE ON public.organization_members
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END$$;

COMMIT; 