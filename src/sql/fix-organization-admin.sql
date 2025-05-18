-- Fix organization admin access to the budget center

-- Create a more flexible function to get an admin's organization
CREATE OR REPLACE FUNCTION get_admin_organization(admin_id UUID)
RETURNS TABLE (
  organization_id UUID,
  organization_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- First try to find through organization_admins table (direct admin relationship)
  RETURN QUERY
  SELECT 
    o.id, 
    o.name
  FROM organizations o
  JOIN organization_admins oa ON o.id = oa.organization_id
  WHERE oa.user_id = admin_id
  LIMIT 1;
  
  -- If no rows returned, try through org_members with farmer_profile
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      o.id, 
      o.name
    FROM organization_members om
    JOIN farmer_profiles fp ON om.farmer_id = fp.id
    JOIN organizations o ON om.organization_id = o.id
    WHERE fp.user_id = admin_id
    AND om.role = 'org_admin'
    LIMIT 1;
  END IF;
  
  -- If still no rows returned and admin is in auth.users with org_admin role, get any organization
  IF NOT FOUND THEN
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = admin_id AND (role = 'org_admin' OR role = 'organization_admin')) THEN
      RETURN QUERY
      SELECT 
        o.id, 
        o.name
      FROM organizations o
      LIMIT 1;
    END IF;
  END IF;
  
  RETURN;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_admin_organization TO anon, authenticated, service_role;

-- Create a view for easier querying of organization admins
CREATE OR REPLACE VIEW organization_admins_view AS
SELECT 
  au.id AS user_id,
  au.email,
  pu.first_name || ' ' || pu.last_name AS full_name,
  o.id AS organization_id,
  o.name AS organization_name,
  'direct_admin' AS admin_type
FROM auth.users au
JOIN public.users pu ON au.id = pu.id
JOIN organization_admins oa ON au.id = oa.user_id
JOIN organizations o ON oa.organization_id = o.id

UNION ALL

SELECT 
  au.id AS user_id,
  au.email,
  pu.first_name || ' ' || pu.last_name AS full_name,
  o.id AS organization_id,
  o.name AS organization_name,
  'member_admin' AS admin_type
FROM auth.users au
JOIN public.users pu ON au.id = pu.id
JOIN farmer_profiles fp ON au.id = fp.user_id
JOIN organization_members om ON fp.id = om.farmer_id
JOIN organizations o ON om.organization_id = o.id
WHERE om.role = 'org_admin';

-- Grant access to the view
GRANT SELECT ON organization_admins_view TO anon, authenticated, service_role;

-- Make sure organization budgets table has necessary columns
DO $$
BEGIN
  -- Check if remaining_balance column exists in organization_budgets
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'organization_budgets'
    AND column_name = 'remaining_balance'
  ) THEN
    -- Add remaining_balance column if it doesn't exist
    ALTER TABLE organization_budgets
    ADD COLUMN remaining_balance DECIMAL DEFAULT 0;
    
    -- Initialize remaining_balance with the same value as total_allocation
    UPDATE organization_budgets
    SET remaining_balance = total_allocation;
  END IF;
END $$; 

-- Create function to handle organization budget requests to region
CREATE OR REPLACE FUNCTION request_organization_budget(
  p_organization_id UUID,
  p_requested_amount DECIMAL,
  p_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_region_id UUID;
  v_organization_name TEXT;
BEGIN
  -- Get the region for this organization
  SELECT region_id, name INTO v_region_id, v_organization_name
  FROM organizations
  WHERE id = p_organization_id;
  
  IF v_region_id IS NULL THEN
    RAISE EXCEPTION 'Organization not found or has no region assigned';
  END IF;
  
  -- Create a budget request record
  INSERT INTO organization_budget_requests (
    organization_id,
    region_id,
    requested_amount,
    reason,
    status,
    request_date
  ) VALUES (
    p_organization_id,
    v_region_id,
    p_requested_amount,
    p_reason,
    'pending',
    NOW()
  );
  
  -- Create notification for region admins
  INSERT INTO notifications (
    user_role,
    target_id,
    notification_type,
    title,
    message,
    is_read,
    created_at
  )
  SELECT
    'region_admin',
    ra.user_id,
    'budget_request',
    'Budget Request',
    'Organization ' || v_organization_name || ' has requested a budget of ' || p_requested_amount || '.',
    FALSE,
    NOW()
  FROM region_admins ra
  WHERE ra.region_id = v_region_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error requesting budget: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION request_organization_budget TO anon, authenticated, service_role; 