-- Add foreign key constraints
ALTER TABLE organization_announcements 
  ADD CONSTRAINT organization_announcements_organization_id_fkey 
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE organization_announcements 
  ADD CONSTRAINT organization_announcements_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- Add check constraint for status
ALTER TABLE organization_announcements 
  ADD CONSTRAINT organization_announcements_status_check 
  CHECK (status IN ('active', 'archived', 'deleted')); 