-- Fix for farmer organization lookup issue
-- This addresses the 406 error when trying to get a farmer's organization

BEGIN;

-- Check if the organization_members table has the expected structure
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'organization_members' 
ORDER BY ordinal_position;

-- Create a simple view that makes it easier to get a farmer's organization
CREATE OR REPLACE VIEW farmer_organizations AS
SELECT 
  om.farmer_id,
  om.organization_id,
  om.status AS member_status,
  om.role AS member_role,
  o.name AS organization_name,
  o.description,
  o.status AS organization_status,
  o.region_id,
  o.province_id,
  o.island_group_id
FROM 
  organization_members om
JOIN 
  organizations o ON om.organization_id = o.id;

-- Grant access to the view
GRANT SELECT ON farmer_organizations TO anon, authenticated, service_role;

-- Create a function to get a member's organization more reliably
CREATE OR REPLACE FUNCTION get_farmer_organization(farmer_id UUID)
RETURNS TABLE (
  farmer_id UUID,
  organization_id UUID,
  organization_name TEXT,
  description TEXT,
  status TEXT,
  region_id UUID,
  province_id UUID,
  island_group_id UUID,
  member_role TEXT,
  member_status TEXT
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    fo.farmer_id,
    fo.organization_id,
    fo.organization_name,
    fo.description,
    fo.organization_status AS status,
    fo.region_id,
    fo.province_id,
    fo.island_group_id,
    fo.member_role,
    fo.member_status
  FROM 
    farmer_organizations fo
  WHERE 
    fo.farmer_id = get_farmer_organization.farmer_id
    AND fo.member_status = 'active'
    AND fo.organization_status = 'active'
  LIMIT 1;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_farmer_organization(UUID) TO anon, authenticated, service_role;

-- Create a function to get all members of an organization
CREATE OR REPLACE FUNCTION get_organization_members(org_id UUID)
RETURNS TABLE (
  farmer_id UUID,
  organization_id UUID,
  member_role TEXT,
  member_status TEXT,
  join_date TIMESTAMP WITH TIME ZONE,
  first_name TEXT,
  last_name TEXT,
  email TEXT
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    om.farmer_id,
    om.organization_id,
    om.role AS member_role,
    om.status AS member_status,
    om.join_date,
    u.first_name,
    u.last_name,
    u.email
  FROM 
    organization_members om
  JOIN
    users u ON om.farmer_id = u.id
  WHERE 
    om.organization_id = get_organization_members.org_id
    AND om.status = 'active'
  ORDER BY 
    om.role, u.last_name, u.first_name;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_organization_members(UUID) TO anon, authenticated, service_role;

-- Additional permissions to ensure the farmer can access their organization
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;

COMMIT; 