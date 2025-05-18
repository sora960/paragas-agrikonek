-- Fix permissions for user_regions table
-- Run this SQL query in your Supabase SQL editor

-- First check if the table exists
DO $$
BEGIN
  -- Disable Row Level Security on the user_regions table
  EXECUTE 'ALTER TABLE public.user_regions DISABLE ROW LEVEL SECURITY;';

  -- Grant all privileges to the table
  EXECUTE 'GRANT ALL ON public.user_regions TO anon, authenticated, service_role;';
  
  -- Verify that RLS is disabled
  RAISE NOTICE 'RLS disabled for user_regions table, all permissions granted.';
  
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Table user_regions does not exist';
  WHEN others THEN
    RAISE NOTICE 'Error: %', SQLERRM;
END $$;

-- Verify that RLS is disabled on user_regions
SELECT 
  c.relname AS table_name,
  CASE WHEN c.relrowsecurity THEN 'enabled' ELSE 'disabled' END AS rls_status
FROM 
  pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE 
  n.nspname = 'public' AND
  c.relname = 'user_regions'; 