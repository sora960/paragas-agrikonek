-- Combined SQL fixes for organization_members table

-- 1. Add application fields if they don't exist
ALTER TABLE public.organization_members 
  ADD COLUMN IF NOT EXISTS application_reason TEXT,
  ADD COLUMN IF NOT EXISTS experience_level TEXT,
  ADD COLUMN IF NOT EXISTS has_previous_organizations BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS previous_organizations TEXT,
  ADD COLUMN IF NOT EXISTS farm_description TEXT;

-- 2. Drop the existing constraint and create a new one that includes 'pending' and 'rejected' statuses
ALTER TABLE public.organization_members 
  DROP CONSTRAINT IF EXISTS organization_members_status_check;

ALTER TABLE public.organization_members 
  ADD CONSTRAINT organization_members_status_check 
  CHECK (status IN ('active', 'inactive', 'suspended', 'pending', 'rejected'));

-- 3. Fix any bad data - convert any NULL application fields to empty strings
-- Each update needs to be a separate statement
UPDATE public.organization_members
SET application_reason = '' 
WHERE application_reason IS NULL;

UPDATE public.organization_members
SET experience_level = '' 
WHERE experience_level IS NULL;

UPDATE public.organization_members
SET previous_organizations = '' 
WHERE previous_organizations IS NULL;

UPDATE public.organization_members
SET farm_description = '' 
WHERE farm_description IS NULL;

-- 4. Ensure active members have a join_date
UPDATE public.organization_members
SET join_date = NOW()
WHERE status = 'active' AND join_date IS NULL;

-- 5. Make sure the unique constraint allows one membership per organization-farmer pair
-- First check if the constraint exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'organization_members_organization_id_farmer_id_key'
  ) THEN
    -- Drop the constraint if it exists
    ALTER TABLE public.organization_members
    DROP CONSTRAINT organization_members_organization_id_farmer_id_key;
  END IF;
END$$;

-- We won't re-add the constraint since we want to allow multiple applications with different statuses 