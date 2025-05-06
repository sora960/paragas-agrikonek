-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_org_announcements_organization 
ON organization_announcements(organization_id);

CREATE INDEX IF NOT EXISTS idx_org_announcements_status 
ON organization_announcements(status);

CREATE INDEX IF NOT EXISTS idx_org_announcements_created_at 
ON organization_announcements(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_org_announcements_is_pinned 
ON organization_announcements(is_pinned DESC); 