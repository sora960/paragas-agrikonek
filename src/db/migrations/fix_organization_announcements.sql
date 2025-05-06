-- Step 1: Create the table first (run this step alone)
CREATE TABLE IF NOT EXISTS organization_announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  is_pinned BOOLEAN DEFAULT FALSE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted'))
);

-- Step 2: Create indexes (run after the table is created)
-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_org_announcements_organization 
ON organization_announcements(organization_id);

CREATE INDEX IF NOT EXISTS idx_org_announcements_status 
ON organization_announcements(status);

CREATE INDEX IF NOT EXISTS idx_org_announcements_created_at 
ON organization_announcements(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_org_announcements_is_pinned 
ON organization_announcements(is_pinned DESC);

-- Step 3: Create view (run after indexes are created)
-- Create a view to get announcements with creator information
CREATE OR REPLACE VIEW organization_announcements_with_creator AS
SELECT 
  a.*,
  u.first_name || ' ' || u.last_name AS creator_name
FROM 
  organization_announcements a
LEFT JOIN 
  users u ON a.created_by = u.id;

-- Step 4: Create function (run after view is created)
-- Create a function to get active announcements for an organization
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