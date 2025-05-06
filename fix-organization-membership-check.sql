-- Fix organization membership check functions
-- This addresses the issue where members are added but announcements show they are not members
-- The problem is in the relationship between user_id and farmer_id

BEGIN;

-- First, ensure UUID extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Fix the core membership check function
CREATE OR REPLACE FUNCTION is_organization_member(user_id UUID, org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM organization_members om
    JOIN farmer_profiles fp ON om.farmer_id = fp.id
    WHERE 
      fp.user_id = is_organization_member.user_id
      AND om.organization_id = is_organization_member.org_id
      AND om.status = 'active'
  );
$$;

-- Fix the function to get member's organization ID
CREATE OR REPLACE FUNCTION get_member_organization_id(user_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT om.organization_id 
  FROM organization_members om
  JOIN farmer_profiles fp ON om.farmer_id = fp.id
  WHERE 
    fp.user_id = get_member_organization_id.user_id
    AND om.status = 'active'
  ORDER BY om.join_date DESC NULLS LAST, om.created_at DESC NULLS LAST
  LIMIT 1;
$$;

-- Fix get_member_primary_organization if it exists
DROP FUNCTION IF EXISTS get_member_primary_organization(UUID);
CREATE OR REPLACE FUNCTION get_member_primary_organization(p_user_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT om.organization_id 
  FROM organization_members om
  JOIN farmer_profiles fp ON om.farmer_id = fp.id
  WHERE 
    fp.user_id = p_user_id
    AND om.status = 'active'
  ORDER BY om.join_date DESC NULLS LAST, om.created_at DESC NULLS LAST
  LIMIT 1;
$$;

-- Fix get_member_organizations if it exists
DROP FUNCTION IF EXISTS get_member_organizations(UUID);
CREATE OR REPLACE FUNCTION get_member_organizations(p_user_id UUID)
RETURNS TABLE (
  organization_id UUID,
  organization_name TEXT,
  member_role TEXT,
  join_date TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    om.organization_id,
    o.name AS organization_name,
    om.role AS member_role,
    om.join_date
  FROM 
    organization_members om
  JOIN 
    farmer_profiles fp ON om.farmer_id = fp.id
  JOIN 
    organizations o ON om.organization_id = o.id
  WHERE 
    fp.user_id = p_user_id
    AND om.status = 'active'
  ORDER BY 
    om.join_date DESC NULLS LAST, 
    om.created_at DESC NULLS LAST;
$$;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION is_organization_member TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_member_organization_id TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_member_primary_organization TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_member_organizations TO anon, authenticated, service_role;

-- Create a view for easier querying of organization memberships
CREATE OR REPLACE VIEW active_organization_members AS
SELECT 
  om.id AS membership_id,
  om.organization_id,
  om.farmer_id,
  fp.user_id,
  u.first_name || ' ' || u.last_name AS member_name,
  fp.farm_name,
  om.role AS member_role,
  om.status AS member_status,
  om.join_date,
  o.name AS organization_name
FROM 
  organization_members om
JOIN 
  farmer_profiles fp ON om.farmer_id = fp.id
JOIN 
  users u ON fp.user_id = u.id
JOIN 
  organizations o ON om.organization_id = o.id
WHERE 
  om.status = 'active';

-- Grant access to the view
GRANT SELECT ON active_organization_members TO anon, authenticated, service_role;

-- Check for any membership inconsistencies
SELECT 
  'Users without farmer profiles' AS issue,
  COUNT(*) AS count
FROM 
  users u
LEFT JOIN 
  farmer_profiles fp ON u.id = fp.user_id
WHERE 
  fp.id IS NULL;

SELECT 
  'Farmer profiles without organization memberships' AS issue,
  COUNT(*) AS count
FROM 
  farmer_profiles fp
LEFT JOIN 
  organization_members om ON fp.id = om.farmer_id
WHERE 
  om.id IS NULL;

COMMIT; 