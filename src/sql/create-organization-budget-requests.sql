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

-- Create organization_budget_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.organization_budget_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  region_id UUID NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  requested_amount DECIMAL NOT NULL DEFAULT 0,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  response TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES auth.users(id)
);

-- Enable RLS for the table
ALTER TABLE public.organization_budget_requests ENABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated users
GRANT ALL ON public.organization_budget_requests TO authenticated;
GRANT ALL ON public.organization_budget_requests TO service_role;

-- Create security policies for organization_budget_requests
-- Organizations can view their own requests
DROP POLICY IF EXISTS "Organizations can view their own requests" ON public.organization_budget_requests;
CREATE POLICY "Organizations can view their own requests" 
ON public.organization_budget_requests 
FOR SELECT 
TO authenticated 
USING (
  -- Organization admins can view their org's requests
  organization_id IN (
    SELECT o.id FROM organizations o
    JOIN organization_members om ON o.id = om.organization_id
    WHERE om.user_id = auth.uid() AND om.role = 'admin'
  )
);

-- Organizations can create their own requests
DROP POLICY IF EXISTS "Organizations can create their own requests" ON public.organization_budget_requests;
CREATE POLICY "Organizations can create their own requests" 
ON public.organization_budget_requests 
FOR INSERT 
TO authenticated 
WITH CHECK (
  -- Organization admins can create requests for their org
  organization_id IN (
    SELECT o.id FROM organizations o
    JOIN organization_members om ON o.id = om.organization_id
    WHERE om.user_id = auth.uid() AND om.role = 'admin'
  )
);

-- Regional admins can view requests for their region
DROP POLICY IF EXISTS "Regional admins can view requests for their region" ON public.organization_budget_requests;
CREATE POLICY "Regional admins can view requests for their region" 
ON public.organization_budget_requests 
FOR SELECT 
TO authenticated 
USING (
  -- Regional admins can view requests in their region
  region_id IN (
    SELECT region_id FROM user_regions
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Regional admins can update requests for their region
DROP POLICY IF EXISTS "Regional admins can process requests for their region" ON public.organization_budget_requests;
CREATE POLICY "Regional admins can process requests for their region" 
ON public.organization_budget_requests 
FOR UPDATE 
TO authenticated 
USING (
  -- Regional admins can process requests in their region
  region_id IN (
    SELECT region_id FROM user_regions
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Super admins can do everything
DROP POLICY IF EXISTS "Super admins can manage all requests" ON public.organization_budget_requests;
CREATE POLICY "Super admins can manage all requests" 
ON public.organization_budget_requests 
FOR ALL 
TO authenticated 
USING (
  -- Check if user is a super admin
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'superadmin'
  )
);

-- Add function to process budget requests
CREATE OR REPLACE FUNCTION process_organization_budget_request(
  p_request_id UUID,
  p_status TEXT,
  p_response TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request organization_budget_requests%ROWTYPE;
  v_exists BOOLEAN;
BEGIN
  -- Check if the request exists
  SELECT EXISTS (
    SELECT 1 FROM organization_budget_requests
    WHERE id = p_request_id
  ) INTO v_exists;
  
  IF NOT v_exists THEN
    RAISE EXCEPTION 'Budget request not found';
  END IF;
  
  -- Get the request data
  SELECT * FROM organization_budget_requests
  WHERE id = p_request_id
  INTO v_request;
  
  -- Update the request status
  UPDATE organization_budget_requests
  SET 
    status = p_status,
    response = p_response,
    processed_at = NOW(),
    processed_by = auth.uid()
  WHERE id = p_request_id;
  
  -- If approved, update the organization's budget
  IF p_status = 'approved' THEN
    -- Check if the organization budget exists
    SELECT EXISTS (
      SELECT 1 FROM organization_budgets
      WHERE organization_id = v_request.organization_id
    ) INTO v_exists;
    
    IF v_exists THEN
      -- Update existing budget
      UPDATE organization_budgets
      SET 
        total_allocation = total_allocation + v_request.requested_amount,
        remaining_amount = remaining_amount + v_request.requested_amount
      WHERE organization_id = v_request.organization_id;
    ELSE
      -- Create new budget entry
      INSERT INTO organization_budgets (
        organization_id,
        total_allocation,
        utilized_amount,
        remaining_amount
      ) VALUES (
        v_request.organization_id,
        v_request.requested_amount,
        0,
        v_request.requested_amount
      );
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$;

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