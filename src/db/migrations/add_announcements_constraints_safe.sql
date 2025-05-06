-- Safely add foreign key constraints only if they don't exist
DO $$ 
BEGIN 
  -- Check if organization_id foreign key constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'organization_announcements_organization_id_fkey'
  ) THEN
    ALTER TABLE organization_announcements 
      ADD CONSTRAINT organization_announcements_organization_id_fkey 
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;

  -- Check if created_by foreign key constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'organization_announcements_created_by_fkey'
  ) THEN
    ALTER TABLE organization_announcements 
      ADD CONSTRAINT organization_announcements_created_by_fkey 
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  -- Check if status check constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'organization_announcements_status_check'
  ) THEN
    ALTER TABLE organization_announcements 
      ADD CONSTRAINT organization_announcements_status_check 
      CHECK (status IN ('active', 'archived', 'deleted'));
  END IF;
END $$; 