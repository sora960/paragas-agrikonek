-- Add application fields and fix status constraint

-- Add application fields if they don't exist
ALTER TABLE public.organization_members 
  ADD COLUMN IF NOT EXISTS application_reason TEXT,
  ADD COLUMN IF NOT EXISTS experience_level TEXT,
  ADD COLUMN IF NOT EXISTS has_previous_organizations BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS previous_organizations TEXT,
  ADD COLUMN IF NOT EXISTS farm_description TEXT;

-- Drop the existing constraint and create a new one that includes 'pending' and 'rejected' statuses
ALTER TABLE public.organization_members 
  DROP CONSTRAINT IF EXISTS organization_members_status_check;

ALTER TABLE public.organization_members 
  ADD CONSTRAINT organization_members_status_check 
  CHECK (status IN ('active', 'inactive', 'suspended', 'pending', 'rejected')); 