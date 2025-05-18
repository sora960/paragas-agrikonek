-- SQL script to disable Row Level Security (RLS) on organization_admins table
-- Use this if you encounter permission issues with organization admin assignments

-- Disable RLS on the organization_admins table
ALTER TABLE public.organization_admins DISABLE ROW LEVEL SECURITY;

-- Ensure proper permissions are granted
GRANT ALL ON public.organization_admins TO anon, authenticated, service_role;

-- Output success message
DO $$
BEGIN
    RAISE NOTICE 'Row Level Security has been disabled on organization_admins table';
    RAISE NOTICE 'Organization admin assignments should now work properly';
END $$; 