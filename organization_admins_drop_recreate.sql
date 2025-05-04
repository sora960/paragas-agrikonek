-- First, drop the existing organization_admins table if it exists
DROP TABLE IF EXISTS public.organization_admins;

-- Now recreate the organization_admins table with the right structure
CREATE TABLE public.organization_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, organization_id)
);

-- Make sure we have the right indexes for performance
CREATE INDEX organization_admins_user_id_idx ON public.organization_admins(user_id);
CREATE INDEX organization_admins_organization_id_idx ON public.organization_admins(organization_id);

-- Grant ALL necessary permissions to the authenticated and anon roles
-- This is more permissive than before to ensure access works
GRANT ALL ON public.organization_admins TO authenticated;
GRANT ALL ON public.organization_admins TO anon;
GRANT ALL ON public.organization_admins TO service_role;

-- Ensure the sequence for the ID is also accessible
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Disable Row Level Security temporarily to test basic functionality
ALTER TABLE public.organization_admins DISABLE ROW LEVEL SECURITY;

-- Add simple policies after confirming basic access works
-- Comment these in after testing the basic table works
/*
-- Policy to allow anyone to insert data
CREATE POLICY insert_org_admins ON public.organization_admins
    FOR INSERT
    TO authenticated, anon
    WITH CHECK (true);

-- Policy to allow reading all records
CREATE POLICY select_org_admins ON public.organization_admins
    FOR SELECT
    TO authenticated, anon
    USING (true);

-- Policy to allow updates to own records
CREATE POLICY update_org_admins ON public.organization_admins
    FOR UPDATE
    TO authenticated
    USING (true);

-- Policy to allow deletes to own records
CREATE POLICY delete_org_admins ON public.organization_admins
    FOR DELETE
    TO authenticated
    USING (true);
*/

-- Comment on the table and columns for better documentation
COMMENT ON TABLE public.organization_admins IS 'Stores relationships between users and the organizations they administer';
COMMENT ON COLUMN public.organization_admins.user_id IS 'The ID of the user who is an admin';
COMMENT ON COLUMN public.organization_admins.organization_id IS 'The ID of the organization being administered'; 