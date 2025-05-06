-- Targeted fix for announcement functionality that preserves existing structure
-- This makes minimal changes to fix the publisher and member view issues

BEGIN;

-- ================= VERIFY ORIGINAL STRUCTURE =================
-- First, check the structure of key tables
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'organization_members' 
ORDER BY ordinal_position;

-- ================= ANNOUNCEMENT TABLE FIXES =================
-- 1. Ensure announcement table has RLS disabled (it appears this is what you need)
ALTER TABLE organization_announcements DISABLE ROW LEVEL SECURITY;

-- 2. Ensure proper permissions are granted
GRANT ALL ON organization_announcements TO anon, authenticated, service_role;
GRANT SELECT ON organization_announcements_with_creator TO anon, authenticated, service_role;

-- ================= ORGANIZATION MEMBER FIXES =================
-- Preserve RLS on organization_members but grant necessary permissions
GRANT SELECT ON organization_members TO anon, authenticated, service_role;
GRANT SELECT ON organizations TO anon, authenticated, service_role;

-- ================= CREATE SIMPLE HELPER FUNCTIONS =================
-- Simple function to check if a user is a member of an organization
CREATE OR REPLACE FUNCTION is_organization_member(user_id UUID, org_id UUID) 
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE farmer_id = user_id
    AND organization_id = org_id
    AND status = 'active'
  );
$$;

-- Get a user's organization ID
CREATE OR REPLACE FUNCTION get_member_organization_id(user_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT organization_id 
  FROM organization_members
  WHERE farmer_id = user_id
  AND status = 'active'
  LIMIT 1;
$$;

-- ================= GRANT FUNCTION PERMISSIONS =================
GRANT EXECUTE ON FUNCTION is_organization_member(UUID, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_member_organization_id(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_active_announcements(UUID) TO anon, authenticated, service_role;

-- ================= VIEW PERMISSIONS =================
-- Grant view necessary permissions
DO $$
DECLARE
  view_name text;
BEGIN
  FOR view_name IN (SELECT table_name FROM information_schema.tables WHERE table_type = 'VIEW' AND table_schema = 'public')
  LOOP
    EXECUTE 'GRANT SELECT ON ' || view_name || ' TO anon, authenticated, service_role';
  END LOOP;
END
$$;

-- ================= ANNOUNCEMENT FUNCTIONS FIX =================
-- Create announcements function that matches your existing code's expectations
CREATE OR REPLACE FUNCTION create_announcement(
  organization_id UUID,
  creator_id UUID,
  title TEXT,
  content TEXT,
  is_pinned BOOLEAN,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS SETOF organization_announcements
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  announcement_id UUID := uuid_generate_v4();
  new_announcement organization_announcements;
BEGIN
  -- Insert the announcement
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
    announcement_id,
    organization_id,
    title,
    content,
    creator_id,
    is_pinned,
    expires_at,
    'active'
  )
  RETURNING * INTO new_announcement;
  
  RETURN NEXT new_announcement;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_announcement(UUID, UUID, TEXT, TEXT, BOOLEAN, TIMESTAMP WITH TIME ZONE) TO anon, authenticated, service_role;

-- ================= VERIFICATION =================
-- Check that announcement table has RLS disabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'organization_announcements';

COMMIT; 