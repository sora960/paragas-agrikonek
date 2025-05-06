-- Comprehensive fix for the announcements feature
-- This combines the most important fixes from all the previous scripts

BEGIN;

-- ================= DISABLE RLS ON ANNOUNCEMENTS =================
-- Disable Row Level Security on organization_announcements
ALTER TABLE organization_announcements DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies on the table to be safe
DROP POLICY IF EXISTS allow_select_announcements ON organization_announcements;
DROP POLICY IF EXISTS allow_insert_announcements ON organization_announcements;
DROP POLICY IF EXISTS allow_update_announcements ON organization_announcements;
DROP POLICY IF EXISTS allow_delete_announcements ON organization_announcements;

-- ================= GRANT TABLE PERMISSIONS =================
-- Grant all permissions to organization_announcements
GRANT ALL ON organization_announcements TO anon, authenticated, service_role;

-- Grant select permissions on other tables
GRANT SELECT ON organizations TO anon, authenticated, service_role;
GRANT SELECT ON organization_members TO anon, authenticated, service_role;
GRANT SELECT ON users TO anon, authenticated, service_role;

-- ================= FIX FOREIGN KEYS =================
-- Refresh the foreign key relationships to ensure they work properly
ALTER TABLE organization_announcements DROP CONSTRAINT IF EXISTS organization_announcements_created_by_fkey;
ALTER TABLE organization_announcements ADD CONSTRAINT organization_announcements_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- ================= CREATE IMPROVED VIEWS =================
-- 1. Create announcements with creator view
DROP VIEW IF EXISTS organization_announcements_with_creator CASCADE;
CREATE OR REPLACE VIEW organization_announcements_with_creator AS
SELECT 
  a.*,
  u.first_name || ' ' || u.last_name AS creator_name
FROM 
  organization_announcements a
LEFT JOIN 
  users u ON a.created_by = u.id;

-- 2. Create member_organizations view for farmers to see their org
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

-- 3. Create member_announcements for easier access
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

-- ================= GRANT VIEW PERMISSIONS =================
GRANT SELECT ON organization_announcements_with_creator TO anon, authenticated, service_role;
GRANT SELECT ON member_organizations TO anon, authenticated, service_role;
GRANT SELECT ON member_announcements TO anon, authenticated, service_role;

-- ================= FUNCTION FOR ACTIVE ANNOUNCEMENTS =================
-- Ensure the function is accessible and optimized
DROP FUNCTION IF EXISTS get_active_announcements(UUID);
CREATE OR REPLACE FUNCTION get_active_announcements(org_id UUID)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  title TEXT,
  content TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  is_pinned BOOLEAN,
  expires_at TIMESTAMP WITH TIME ZONE,
  status TEXT,
  creator_name TEXT
)
LANGUAGE sql
STABLE
AS $$
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
    u.first_name || ' ' || u.last_name AS creator_name
  FROM 
    organization_announcements a
  LEFT JOIN 
    users u ON a.created_by = u.id
  WHERE 
    a.organization_id = org_id
    AND a.status = 'active'
    AND (a.expires_at IS NULL OR a.expires_at > NOW())
  ORDER BY 
    a.is_pinned DESC, 
    a.created_at DESC;
$$;

-- Create a function to get all announcements for a member
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

-- ================= GRANT FUNCTION PERMISSIONS =================
GRANT EXECUTE ON FUNCTION get_active_announcements(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_member_announcements(UUID) TO anon, authenticated, service_role;

-- ================= VERIFICATION =================
-- Verify that RLS is disabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'organization_announcements';

COMMIT; 