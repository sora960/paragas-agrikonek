-- Run these statements one by one in the Supabase SQL editor
-- if the automated script doesn't work

-- 1. Disable Row Level Security on organization_announcements
ALTER TABLE organization_announcements DISABLE ROW LEVEL SECURITY;

-- 2. Drop any existing policies one by one (run each line separately)
DROP POLICY IF EXISTS allow_select_announcements ON organization_announcements;
DROP POLICY IF EXISTS allow_insert_announcements ON organization_announcements;
DROP POLICY IF EXISTS allow_update_announcements ON organization_announcements;
DROP POLICY IF EXISTS allow_delete_announcements ON organization_announcements;

-- 3. Grant permissions to anon role (run each line separately)
GRANT ALL ON organization_announcements TO anon;
GRANT ALL ON organization_announcements TO authenticated;
GRANT ALL ON organization_announcements TO service_role;

-- 4. Grant permissions on the view
GRANT ALL ON organization_announcements_with_creator TO anon;
GRANT ALL ON organization_announcements_with_creator TO authenticated;
GRANT ALL ON organization_announcements_with_creator TO service_role;

-- 5. Grant execute permissions on the function
GRANT EXECUTE ON FUNCTION get_active_announcements(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_active_announcements(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_announcements(UUID) TO service_role;

-- 6. Verify that RLS is disabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'organization_announcements'; 