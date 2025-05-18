-- First ensure the organization_admins table exists with the right structure
CREATE TABLE IF NOT EXISTS public.organization_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, organization_id)
);

-- Make sure we have the right indexes for performance
CREATE INDEX IF NOT EXISTS organization_admins_user_id_idx ON public.organization_admins(user_id);
CREATE INDEX IF NOT EXISTS organization_admins_organization_id_idx ON public.organization_admins(organization_id);

-- Grant the necessary permissions to the authenticated and anon roles
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_admins TO authenticated;
GRANT SELECT, INSERT ON public.organization_admins TO anon;

-- Add RLS (Row Level Security) policies to protect data
ALTER TABLE public.organization_admins DISABLE ROW LEVEL SECURITY;

-- Policy to allow superadmins to manage all organization admin relationships
CREATE POLICY manage_all_org_admins ON public.organization_admins
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'superadmin'
        )
    );

-- Policy to allow organization admins to view their admin relationships
CREATE POLICY view_own_org_admin_status ON public.organization_admins
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
    );
    
-- Comment on the table and columns for better documentation
COMMENT ON TABLE public.organization_admins IS 'Stores relationships between users and the organizations they administer';
COMMENT ON COLUMN public.organization_admins.user_id IS 'The ID of the user who is an admin';
COMMENT ON COLUMN public.organization_admins.organization_id IS 'The ID of the organization being administered'; 