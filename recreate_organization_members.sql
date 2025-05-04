-- Script to recreate organization_members table with RLS disabled
-- First make sure farmer_profiles table exists (run recreate_farmer_profiles.sql first)

-- Drop existing table if exists
DROP TABLE IF EXISTS public.organization_members;

-- Organization Members Table
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    farmer_id UUID REFERENCES public.farmer_profiles(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('member', 'admin', 'manager')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    join_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, farmer_id)
);

-- Important: Disable RLS on the table
ALTER TABLE public.organization_members DISABLE ROW LEVEL SECURITY;

-- Add trigger to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Only create the trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_organization_members_updated_at') THEN
        CREATE TRIGGER update_organization_members_updated_at
            BEFORE UPDATE ON public.organization_members
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END$$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_farmer_id ON public.organization_members(farmer_id);

-- Insert sample data - associate farmers with organizations
INSERT INTO public.organization_members (
    organization_id,
    farmer_id,
    role
)
SELECT 
    o.id,
    f.id,
    CASE WHEN ROW_NUMBER() OVER () = 1 THEN 'admin' ELSE 'member' END
FROM 
    public.organizations o
    CROSS JOIN public.farmer_profiles f
WHERE EXISTS (
    SELECT 1 FROM public.farmer_profiles WHERE id = f.id
)
LIMIT 10;

-- Create or replace view for organization member statistics
CREATE OR REPLACE VIEW public.organization_member_stats AS
SELECT 
    o.id AS organization_id,
    o.name AS organization_name,
    COUNT(DISTINCT om.farmer_id) AS total_members,
    COUNT(DISTINCT CASE WHEN om.status = 'active' THEN om.farmer_id END) AS active_members,
    COUNT(DISTINCT CASE WHEN om.role = 'admin' THEN om.farmer_id END) AS admin_count,
    COUNT(DISTINCT CASE WHEN om.role = 'manager' THEN om.farmer_id END) AS manager_count
FROM 
    public.organizations o
    LEFT JOIN public.organization_members om ON om.organization_id = o.id
GROUP BY 
    o.id, o.name; 