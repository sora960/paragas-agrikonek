-- Create a view to get announcements with creator information
CREATE OR REPLACE VIEW organization_announcements_with_creator AS
SELECT 
  a.*,
  u.first_name || ' ' || u.last_name AS creator_name
FROM 
  organization_announcements a
LEFT JOIN 
  users u ON a.created_by = u.id;

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