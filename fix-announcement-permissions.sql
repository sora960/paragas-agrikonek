-- Fix organization_announcements permissions
-- Disable RLS completely for the organization_announcements table

BEGIN;

-- Disable Row Level Security on organization_announcements
ALTER TABLE organization_announcements DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies on the table to be safe
DROP POLICY IF EXISTS allow_select_announcements ON organization_announcements;
DROP POLICY IF EXISTS allow_insert_announcements ON organization_announcements;
DROP POLICY IF EXISTS allow_update_announcements ON organization_announcements;
DROP POLICY IF EXISTS allow_delete_announcements ON organization_announcements;

-- Grant all permissions to anon role for organization_announcements
GRANT ALL ON organization_announcements TO anon;
GRANT ALL ON organization_announcements TO authenticated;
GRANT ALL ON organization_announcements TO service_role;

-- Also grant permissions on the view
GRANT ALL ON organization_announcements_with_creator TO anon;
GRANT ALL ON organization_announcements_with_creator TO authenticated;
GRANT ALL ON organization_announcements_with_creator TO service_role;

-- Ensure the function is accessible
GRANT EXECUTE ON FUNCTION get_active_announcements(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_active_announcements(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_announcements(UUID) TO service_role;

COMMIT; 