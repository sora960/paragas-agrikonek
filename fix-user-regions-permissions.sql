-- Fix permissions for user_regions table
-- This script disables RLS and grants proper permissions

BEGIN;

-- Disable Row Level Security on the user_regions table
ALTER TABLE public.user_regions DISABLE ROW LEVEL SECURITY;

-- Grant all permissions to all roles (anon, authenticated, and service_role)
GRANT ALL ON public.user_regions TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Grant permissions specifically for the sequence
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- Verify that RLS is disabled on user_regions
SELECT 
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled
FROM 
  pg_class c
JOIN 
  pg_namespace n ON c.relnamespace = n.oid
WHERE 
  n.nspname = 'public' AND
  c.relname = 'user_regions';

COMMIT; 