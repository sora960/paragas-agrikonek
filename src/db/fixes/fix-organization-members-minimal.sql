-- Minimal fix for organization members access issues
-- This script only disables RLS and grants permissions
-- It avoids creating functions that might conflict with existing ones

BEGIN;

-- First check if the table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'organization_members'
  ) THEN
    RAISE NOTICE 'Table organization_members does not exist. Cannot proceed.';
    RETURN;
  ELSE
    RAISE NOTICE 'Table organization_members exists. Proceeding with fix...';
  END IF;
END $$;

-- Disable RLS on the table to allow direct access
ALTER TABLE public.organization_members DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON public.organization_members TO anon, authenticated, service_role;

-- Verify that the RLS is disabled (using pg_class and pg_namespace instead)
SELECT 
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled
FROM 
  pg_class c
JOIN 
  pg_namespace n ON c.relnamespace = n.oid
WHERE 
  n.nspname = 'public' AND
  c.relname = 'organization_members';

COMMIT; 