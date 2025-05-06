-- Fix to ensure organization members can view their organization data and announcements

BEGIN;

-- First, check for any cross-schema issues with the organization_members table
SELECT schemaname, tablename FROM pg_tables WHERE tablename = 'organization_members';

-- Grant permissions on organization_members table
GRANT SELECT ON organization_members TO anon, authenticated, service_role;

-- Grant permissions on organizations table for checking memberships
GRANT SELECT ON organizations TO anon, authenticated, service_role;

-- Create improved view for organization members to see their organization
CREATE OR REPLACE VIEW member_organizations AS
SELECT 
  om.farmer_id,
  o.id AS organization_id,
  o.name AS organization_name,
  o.description,
  o.status,
  o.region_id,
  o.province_id,
  o.island_group_id,
  om.role AS member_role,
  om.status AS member_status,
  om.joined_at
FROM 
  organization_members om
JOIN 
  organizations o ON om.organization_id = o.id
WHERE 
  om.status = 'active';

-- Grant access to the view
GRANT SELECT ON member_organizations TO anon, authenticated, service_role;

-- Create a view for announcements with organization and creator info
CREATE OR REPLACE VIEW member_announcements AS
SELECT 
  a.id,
  a.organization_id,
  a.title,
  a.content,
  a.created_by,
  a.created_at,
  a.updated_at,
  a.is_pinned,
  a.expires_at,
  a.status,
  o.name AS organization_name,
  u.first_name || ' ' || u.last_name AS creator_name
FROM 
  organization_announcements a
JOIN 
  organizations o ON a.organization_id = o.id
LEFT JOIN 
  users u ON a.created_by = u.id
WHERE 
  a.status = 'active';

-- Grant access to the view
GRANT SELECT ON member_announcements TO anon, authenticated, service_role;

-- Create a function to get all announcements for a user's organizations
CREATE OR REPLACE FUNCTION get_member_announcements(member_id UUID)
RETURNS SETOF member_announcements
LANGUAGE sql
STABLE
AS $$
  SELECT a.*
  FROM member_announcements a
  JOIN organization_members om ON a.organization_id = om.organization_id
  WHERE om.farmer_id = member_id
  AND om.status = 'active'
  AND a.status = 'active'
  AND (a.expires_at IS NULL OR a.expires_at > NOW())
  ORDER BY a.is_pinned DESC, a.created_at DESC;
$$;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION get_member_announcements(UUID) TO anon, authenticated, service_role;

COMMIT; 