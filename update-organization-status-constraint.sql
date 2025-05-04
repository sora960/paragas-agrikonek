-- Update the status check constraint on organization_members table to allow 'pending' status

-- First, get the current constraint definition
DO $$
DECLARE
  constraint_def text;
BEGIN
  -- Get the constraint definition
  SELECT pg_get_constraintdef(oid) INTO constraint_def
  FROM pg_constraint
  WHERE conname = 'organization_members_status_check' 
  AND conrelid = 'organization_members'::regclass;

  -- Drop the existing constraint
  EXECUTE 'ALTER TABLE public.organization_members DROP CONSTRAINT IF EXISTS organization_members_status_check';

  -- Add a new constraint that includes 'pending'
  EXECUTE 'ALTER TABLE public.organization_members ADD CONSTRAINT organization_members_status_check 
           CHECK (status IN (''active'', ''inactive'', ''suspended'', ''pending'', ''rejected''))';
  
  RAISE NOTICE 'Updated organization_members_status_check constraint to include pending status';
END $$; 