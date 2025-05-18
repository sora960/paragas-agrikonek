-- Fix organization members status and permissions
-- This script addresses issues with accepting farmers into organizations

BEGIN;

-- Check current constraint
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'organization_members'::regclass
AND conname LIKE '%status%';

-- Drop the existing constraint if it exists
ALTER TABLE IF EXISTS public.organization_members 
  DROP CONSTRAINT IF EXISTS organization_members_status_check;

-- Add the correct constraint including 'pending' and 'rejected' statuses
ALTER TABLE IF EXISTS public.organization_members 
  ADD CONSTRAINT organization_members_status_check 
  CHECK (status IN ('active', 'inactive', 'suspended', 'pending', 'rejected'));

-- Ensure the table has proper columns for application tracking
ALTER TABLE IF EXISTS public.organization_members
  ADD COLUMN IF NOT EXISTS application_reason TEXT,
  ADD COLUMN IF NOT EXISTS experience_level TEXT,
  ADD COLUMN IF NOT EXISTS has_previous_organizations BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS previous_organizations TEXT,
  ADD COLUMN IF NOT EXISTS farm_description TEXT;

-- Make sure RLS is disabled on this table
ALTER TABLE IF EXISTS public.organization_members DISABLE ROW LEVEL SECURITY;

-- Grant proper permissions
GRANT ALL ON public.organization_members TO anon, authenticated, service_role;

-- Create a helper function to approve applications
CREATE OR REPLACE FUNCTION approve_member_application(p_application_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_app_record RECORD;
BEGIN
  -- Get the application details
  SELECT * INTO v_app_record 
  FROM organization_members
  WHERE id = p_application_id AND status = 'pending';
  
  IF v_app_record IS NULL THEN
    RAISE EXCEPTION 'Application not found or not in pending status';
    RETURN FALSE;
  END IF;
  
  -- Update to active status
  UPDATE organization_members
  SET 
    status = 'active',
    join_date = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_application_id;
  
  -- Update organization's member count
  UPDATE organizations
  SET 
    member_count = (
      SELECT COUNT(*) FROM organization_members 
      WHERE organization_id = v_app_record.organization_id AND status = 'active'
    ),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = v_app_record.organization_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error approving member application: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION approve_member_application TO anon, authenticated, service_role;

-- Show current organization member counts for verification
SELECT 
  o.id,
  o.name, 
  o.member_count AS current_count,
  (SELECT COUNT(*) FROM organization_members WHERE organization_id = o.id AND status = 'active') AS actual_count
FROM organizations o;

COMMIT; 