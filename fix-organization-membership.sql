-- Fix organization membership issues in the database
-- This script fixes issues with the organization_members table and relationships

BEGIN;

-- First, ensure UUID extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create a direct membership check function that doesn't rely on RLS
CREATE OR REPLACE FUNCTION is_organization_member(user_id UUID, org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM organization_members 
    WHERE 
      farmer_id = user_id 
      AND organization_id = org_id
      AND status = 'active'
  );
END;
$$;

-- Check for orphaned membership records (no corresponding user or organization)
DELETE FROM organization_members 
WHERE 
  farmer_id NOT IN (SELECT id FROM users)
  OR organization_id NOT IN (SELECT id FROM organizations);

-- Add missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_org_members_farmer_id ON organization_members(farmer_id);
CREATE INDEX IF NOT EXISTS idx_org_members_organization_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_status ON organization_members(status);

-- Create a view for easy membership checking
CREATE OR REPLACE VIEW active_memberships AS
SELECT 
  om.farmer_id,
  om.organization_id,
  om.role,
  om.join_date,
  u.first_name || ' ' || u.last_name AS member_name,
  o.name AS organization_name
FROM 
  organization_members om
JOIN 
  users u ON om.farmer_id = u.id
JOIN 
  organizations o ON om.organization_id = o.id
WHERE 
  om.status = 'active';

-- Grant access to the view
GRANT SELECT ON active_memberships TO anon, authenticated, service_role;

-- Add a function to get a member's primary organization
CREATE OR REPLACE FUNCTION get_member_primary_organization(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- First try to get the most recent joined organization
  SELECT organization_id INTO v_org_id
  FROM organization_members
  WHERE farmer_id = p_user_id AND status = 'active'
  ORDER BY join_date DESC NULLS LAST, created_at DESC NULLS LAST
  LIMIT 1;
  
  -- If not found, try any active membership
  IF v_org_id IS NULL THEN
    SELECT organization_id INTO v_org_id
    FROM organization_members
    WHERE farmer_id = p_user_id AND status = 'active'
    LIMIT 1;
  END IF;
  
  RETURN v_org_id;
END;
$$;

-- Add a function to get all organizations for a member
CREATE OR REPLACE FUNCTION get_member_organizations(p_user_id UUID)
RETURNS TABLE (
  organization_id UUID,
  organization_name TEXT,
  member_role TEXT,
  join_date TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    om.organization_id,
    o.name AS organization_name,
    om.role AS member_role,
    om.join_date
  FROM 
    organization_members om
  JOIN 
    organizations o ON om.organization_id = o.id
  WHERE 
    om.farmer_id = p_user_id
    AND om.status = 'active'
  ORDER BY 
    om.join_date DESC NULLS LAST, 
    om.created_at DESC NULLS LAST;
$$;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION is_organization_member TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_member_primary_organization TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_member_organizations TO anon, authenticated, service_role;

-- Show all membership issues
SELECT
  'Missing user' AS issue,
  COUNT(*) AS count
FROM
  organization_members om
LEFT JOIN
  users u ON om.farmer_id = u.id
WHERE
  u.id IS NULL
UNION ALL
SELECT
  'Missing organization' AS issue,
  COUNT(*) AS count
FROM
  organization_members om
LEFT JOIN
  organizations o ON om.organization_id = o.id
WHERE
  o.id IS NULL;

COMMIT; 