-- Additional fixes to ensure that organization members (farmers) can view announcements

BEGIN;

-- Ensure the public schema has the necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Make sure that the organization_members table has permissions for querying
GRANT SELECT ON organization_members TO anon, authenticated, service_role;

-- Make sure the organizations table is accessible for lookups
GRANT SELECT ON organizations TO anon, authenticated, service_role;

-- Make sure users table is accessible for creator lookups in announcements
GRANT SELECT ON users TO anon, authenticated, service_role;

-- Grant specific permissions needed for the farmer's view
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- Refresh the foreign key relationships to ensure they work properly
ALTER TABLE organization_announcements DROP CONSTRAINT IF EXISTS organization_announcements_created_by_fkey;
ALTER TABLE organization_announcements ADD CONSTRAINT organization_announcements_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- Ensure the view is recreated to be accessible by all
DROP VIEW IF EXISTS organization_announcements_with_creator CASCADE;
CREATE OR REPLACE VIEW organization_announcements_with_creator AS
SELECT 
  a.*,
  u.first_name || ' ' || u.last_name AS creator_name
FROM 
  organization_announcements a
LEFT JOIN 
  users u ON a.created_by = u.id;

-- Grant permissions on the view again
GRANT SELECT ON organization_announcements_with_creator TO anon, authenticated, service_role;

COMMIT; 