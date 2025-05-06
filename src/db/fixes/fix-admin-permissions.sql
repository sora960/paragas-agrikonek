-- Fix organization admin permissions to ensure admins can create and manage announcements

BEGIN;

-- ================= ORGANIZATION ADMIN TABLE FIXES =================
-- 1. Ensure organization_admins table has correct structure and permissions
CREATE TABLE IF NOT EXISTS public.organization_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, organization_id)
);

-- 2. Ensure indexes exist
CREATE INDEX IF NOT EXISTS organization_admins_user_id_idx ON public.organization_admins(user_id);
CREATE INDEX IF NOT EXISTS organization_admins_organization_id_idx ON public.organization_admins(organization_id);

-- 3. Disable RLS on organization_admins to ensure direct access
ALTER TABLE organization_admins DISABLE ROW LEVEL SECURITY;

-- 4. Grant necessary permissions
GRANT ALL ON organization_admins TO anon, authenticated, service_role;

-- ================= HELPER FUNCTIONS FOR ADMIN PERMISSIONS =================
-- Function to check if a user is an admin of an organization
CREATE OR REPLACE FUNCTION is_organization_admin(user_id UUID, org_id UUID) 
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_admins
    WHERE user_id = $1
    AND organization_id = $2
  );
$$;

-- Function to get organizations for which a user is an admin
CREATE OR REPLACE FUNCTION get_user_admin_organizations(admin_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  status TEXT,
  region_id UUID
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    o.id,
    o.name,
    o.description,
    o.status,
    o.region_id
  FROM 
    organizations o
  JOIN
    organization_admins oa ON o.id = oa.organization_id
  WHERE
    oa.user_id = admin_id
  ORDER BY
    o.name;
$$;

-- ================= GRANT FUNCTION PERMISSIONS =================
GRANT EXECUTE ON FUNCTION is_organization_admin(UUID, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_user_admin_organizations(UUID) TO anon, authenticated, service_role;

-- ================= LINK TO ANNOUNCEMENT SYSTEM =================
-- Ensure admin has proper permissions on the announcement table
GRANT ALL ON organization_announcements TO anon, authenticated, service_role;

-- Create a function for admins to create announcements
CREATE OR REPLACE FUNCTION admin_create_announcement(
  admin_id UUID,
  org_id UUID,
  title TEXT,
  content TEXT,
  is_pinned BOOLEAN,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id UUID;
BEGIN
  -- Check if the user is an admin of the organization
  IF NOT is_organization_admin(admin_id, org_id) THEN
    RAISE EXCEPTION 'User is not an admin of this organization';
  END IF;
  
  -- Create the announcement
  INSERT INTO organization_announcements (
    id,
    organization_id,
    title,
    content,
    created_by,
    is_pinned,
    expires_at,
    status
  )
  VALUES (
    gen_random_uuid(),
    org_id,
    title,
    content,
    admin_id,
    is_pinned,
    expires_at,
    'active'
  )
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- Grant execute permission on the admin function
GRANT EXECUTE ON FUNCTION admin_create_announcement(UUID, UUID, TEXT, TEXT, BOOLEAN, TIMESTAMP WITH TIME ZONE) TO anon, authenticated, service_role;

-- ================= VERIFICATION =================
-- Verify the status of the organization_admins table
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'organization_admins';
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'organization_announcements';

COMMIT; 