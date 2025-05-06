-- Add missing columns to organization_announcements table
DO $$ 
BEGIN 
  -- Check if created_by column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organization_announcements' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE organization_announcements 
      ADD COLUMN created_by UUID;
  END IF;

  -- Check if status column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organization_announcements' AND column_name = 'status'
  ) THEN
    ALTER TABLE organization_announcements 
      ADD COLUMN status TEXT DEFAULT 'active';
  END IF;
END $$; 