-- Fix for users table permissions
-- This script grants proper permissions to the users table
-- to resolve the "permission denied for table users" error

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

-- Option 1: Disable RLS on the users table entirely (simplest approach)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Option 2: If you need RLS, ensure proper policy exists
-- Uncomment this section and comment out the DISABLE line above if you prefer
/*
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
CREATE POLICY "Enable read access for all users" 
  ON public.users 
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.users;
CREATE POLICY "Enable insert for authenticated users" 
  ON public.users 
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Enable update for users based on email" ON public.users;
CREATE POLICY "Enable update for users based on email" 
  ON public.users 
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND email = auth.email())
  WITH CHECK (email = auth.email());
*/

-- Grant comprehensive permissions
GRANT ALL ON public.users TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Verify that the RLS is disabled
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