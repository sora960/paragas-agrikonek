-- Create organization budget requests table

-- First ensure notifications table exists
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_role TEXT NOT NULL, -- 'farmer', 'organization_admin', 'region_admin', 'admin', etc.
  target_id UUID NOT NULL, -- typically a user_id
  notification_type TEXT NOT NULL, -- 'budget_request', 'budget_approval', etc.
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  data JSONB -- additional data specific to the notification type
);

-- Add notification table indexes
CREATE INDEX IF NOT EXISTS idx_notifications_target_id ON notifications(target_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_role ON notifications(user_role);

-- Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Grant access to notifications
GRANT ALL ON notifications TO service_role;
GRANT SELECT, UPDATE ON notifications TO authenticated;

-- RLS policy for notifications (users can only see their own)
CREATE POLICY user_notifications_policy ON notifications
  FOR ALL
  TO authenticated
  USING (target_id = auth.uid());
  
-- Create admins policy for notifications
CREATE POLICY admin_notifications_policy ON notifications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND (role = 'super_admin' OR role = 'admin')
    )
  );

-- Check if the table exists before creating it
CREATE TABLE IF NOT EXISTS organization_budget_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  requested_amount DECIMAL NOT NULL,
  approved_amount DECIMAL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  request_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  approval_date TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_org_budget_requests_org_id ON organization_budget_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_budget_requests_region_id ON organization_budget_requests(region_id);
CREATE INDEX IF NOT EXISTS idx_org_budget_requests_status ON organization_budget_requests(status);

-- Grant access
ALTER TABLE organization_budget_requests ENABLE ROW LEVEL SECURITY;

GRANT ALL ON organization_budget_requests TO service_role;
GRANT SELECT, INSERT ON organization_budget_requests TO authenticated;

-- Create RLS policies

-- Organization admins can view and create requests for their own organization
CREATE POLICY organization_admins_policy ON organization_budget_requests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      -- Direct query instead of using organization_admins_view
      (
        -- Direct admin through organization_admins table
        SELECT 1 FROM organization_admins
        WHERE user_id = auth.uid()
        AND organization_id = organization_budget_requests.organization_id
      )
      UNION ALL
      (
        -- Member admin through organization_members and farmer_profiles
        SELECT 1 FROM organization_members om
        JOIN farmer_profiles fp ON om.farmer_id = fp.id
        WHERE fp.user_id = auth.uid()
        AND om.organization_id = organization_budget_requests.organization_id
        AND om.role = 'org_admin'
      )
    )
  );

-- Region admins can view and approve requests for their region
CREATE POLICY region_admins_policy ON organization_budget_requests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM region_admins
      WHERE user_id = auth.uid()
      AND region_id = organization_budget_requests.region_id
    )
  );

-- Super admins can view and manage all requests
CREATE POLICY super_admins_policy ON organization_budget_requests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND (role = 'super_admin' OR role = 'admin')
    )
  );

-- Create or replace a function to approve organization budget requests
CREATE OR REPLACE FUNCTION approve_organization_budget_request(
  p_request_id UUID,
  p_approved_amount DECIMAL,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request RECORD;
  v_org_budget_id UUID;
BEGIN
  -- Get the request details
  SELECT * INTO v_request FROM organization_budget_requests
  WHERE id = p_request_id AND status = 'pending';
  
  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Budget request not found or not in pending status';
  END IF;
  
  -- Get the organization budget ID
  SELECT id INTO v_org_budget_id
  FROM organization_budgets
  WHERE organization_id = v_request.organization_id
  AND fiscal_year = EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- If no budget exists, create one
  IF v_org_budget_id IS NULL THEN
    INSERT INTO organization_budgets (
      organization_id,
      fiscal_year,
      total_allocation,
      remaining_balance,
      status,
      created_at,
      updated_at
    ) VALUES (
      v_request.organization_id,
      EXTRACT(YEAR FROM CURRENT_DATE),
      p_approved_amount,
      p_approved_amount,
      'active',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_org_budget_id;
  ELSE
    -- Update existing budget
    UPDATE organization_budgets
    SET 
      total_allocation = total_allocation + p_approved_amount,
      remaining_balance = remaining_balance + p_approved_amount,
      updated_at = NOW()
    WHERE id = v_org_budget_id;
  END IF;
  
  -- Update the request status
  UPDATE organization_budget_requests
  SET 
    status = 'approved',
    approved_amount = p_approved_amount,
    approval_date = NOW(),
    approved_by = auth.uid(),
    notes = p_notes,
    updated_at = NOW()
  WHERE id = p_request_id;
  
  -- Create notification for organization admins
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
    'organization_admin',
    oa.user_id,
    'budget_approval',
    'Budget Request Approved',
    'Your budget request for ' || p_approved_amount || ' has been approved.',
    FALSE,
    NOW()
  FROM (
    -- Direct admins
    SELECT user_id FROM organization_admins 
    WHERE organization_id = v_request.organization_id
    UNION ALL
    -- Member admins
    SELECT fp.user_id FROM organization_members om
    JOIN farmer_profiles fp ON om.farmer_id = fp.id
    WHERE om.organization_id = v_request.organization_id
    AND om.role = 'org_admin'
  ) oa;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error approving budget request: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION approve_organization_budget_request TO authenticated, service_role; 