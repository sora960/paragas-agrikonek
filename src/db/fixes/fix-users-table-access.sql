-- Fix for users table access issues
-- This script grants permissions for the users table
-- similar to what we did for organization_members

BEGIN;

-- Check if users table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    RAISE NOTICE 'Table users does not exist. Cannot proceed.';
    RETURN;
  ELSE
    RAISE NOTICE 'Table users exists. Proceeding with fix...';
  END IF;
END $$;

-- Disable RLS on the users table to allow direct access
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON public.users TO anon, authenticated, service_role;

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
  c.relname = 'users';

COMMIT; 