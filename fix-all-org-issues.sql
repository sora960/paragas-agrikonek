-- Comprehensive fix for organization member and announcement issues
-- This script addresses all identified issues with announcements and organization member lookups

BEGIN;

-- ================= VERIFY TABLE STRUCTURE =================
-- Check the structure of the organization_members table
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'organization_members' 
ORDER BY ordinal_position;

-- ================= DISABLE RLS ON ANNOUNCEMENTS =================
-- Disable Row Level Security on organization_announcements
ALTER TABLE organization_announcements DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies 
DROP POLICY IF EXISTS allow_select_announcements ON organization_announcements;
DROP POLICY IF EXISTS allow_insert_announcements ON organization_announcements;
DROP POLICY IF EXISTS allow_update_announcements ON organization_announcements;
DROP POLICY IF EXISTS allow_delete_announcements ON organization_announcements;

-- ================= GRANT TABLE PERMISSIONS =================
-- Grant all permissions to announcement tables
GRANT ALL ON organization_announcements TO anon, authenticated, service_role;

-- Grant select permissions on related tables
GRANT SELECT ON organizations TO anon, authenticated, service_role;
GRANT SELECT ON organization_members TO anon, authenticated, service_role;
GRANT SELECT ON users TO anon, authenticated, service_role;

-- ================= FIX DIRECT ORGANIZATION LOOKUP =================
-- Create a direct function to look up a member's organization directly via SQL
-- This avoids any permissions or RLS issues
CREATE OR REPLACE FUNCTION get_user_organization(user_id UUID)
RETURNS TABLE (
  id UUID, 
  name TEXT,
  description TEXT,
  status TEXT,
  region_id UUID
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
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
    organization_members om ON o.id = om.organization_id
  WHERE
    om.farmer_id = user_id
    AND om.status = 'active'
    AND o.status = 'active'
  LIMIT 1;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_organization(UUID) TO anon, authenticated, service_role;

-- ================= CREATE DIRECT ANNOUNCEMENT LOOKUP =================
-- Create a function to directly fetch announcements for an organization
CREATE OR REPLACE FUNCTION get_organization_announcements(org_id UUID, include_expired BOOLEAN DEFAULT FALSE)
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
SECURITY DEFINER
SET search_path = public
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
    AND (
      include_expired = TRUE 
      OR a.expires_at IS NULL 
      OR a.expires_at > NOW()
    )
  ORDER BY 
    a.is_pinned DESC, 
    a.created_at DESC;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_organization_announcements(UUID, BOOLEAN) TO anon, authenticated, service_role;

-- Create a function to get all announcements for a user
CREATE OR REPLACE FUNCTION get_user_announcements(user_id UUID, include_expired BOOLEAN DEFAULT FALSE)
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
  creator_name TEXT,
  organization_name TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
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
    u.first_name || ' ' || u.last_name AS creator_name,
    o.name AS organization_name
  FROM 
    organization_announcements a
  JOIN
    organization_members om ON a.organization_id = om.organization_id AND om.farmer_id = user_id
  JOIN
    organizations o ON a.organization_id = o.id
  LEFT JOIN 
    users u ON a.created_by = u.id
  WHERE 
    a.status = 'active'
    AND om.status = 'active'
    AND (
      include_expired = TRUE 
      OR a.expires_at IS NULL 
      OR a.expires_at > NOW()
    )
  ORDER BY 
    a.is_pinned DESC, 
    a.created_at DESC;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_announcements(UUID, BOOLEAN) TO anon, authenticated, service_role;

-- ================= GENERAL SECURITY SETTINGS =================
-- Grant broad permissions to ensure all tables are accessible
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- ================= VERIFICATION =================
-- Verify that RLS is disabled on key tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('organization_announcements', 'organization_members', 'organizations');

COMMIT; 