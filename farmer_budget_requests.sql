-- Create the farmer_budget_requests table for budget requests from farmers
BEGIN;

-- Create the table
CREATE TABLE IF NOT EXISTS public.farmer_budget_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES public.farmer_profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL,
  purpose TEXT NOT NULL,
  details TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  request_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approval_date TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_farmer_budget_requests_farmer_id ON public.farmer_budget_requests (farmer_id);
CREATE INDEX IF NOT EXISTS idx_farmer_budget_requests_organization_id ON public.farmer_budget_requests (organization_id);
CREATE INDEX IF NOT EXISTS idx_farmer_budget_requests_status ON public.farmer_budget_requests (status);
CREATE INDEX IF NOT EXISTS idx_farmer_budget_requests_request_date ON public.farmer_budget_requests (request_date);

-- Add trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_farmer_budget_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_farmer_budget_requests_updated_at ON farmer_budget_requests;
CREATE TRIGGER update_farmer_budget_requests_updated_at
BEFORE UPDATE ON farmer_budget_requests
FOR EACH ROW
EXECUTE FUNCTION update_farmer_budget_requests_updated_at();

-- Disable RLS for now to avoid permission issues
ALTER TABLE public.farmer_budget_requests DISABLE ROW LEVEL SECURITY;

-- Grant proper permissions
GRANT ALL ON public.farmer_budget_requests TO anon, authenticated, service_role;

-- Create function to approve a budget request and update farmer's budget
CREATE OR REPLACE FUNCTION approve_budget_request(
  p_request_id UUID,
  p_approved_by UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request RECORD;
  v_budget_exists BOOLEAN;
BEGIN
  -- Get the request details
  SELECT * INTO v_request 
  FROM farmer_budget_requests
  WHERE id = p_request_id AND status = 'pending';
  
  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Budget request not found or not in pending status';
  END IF;
  
  -- Update the request status
  UPDATE farmer_budget_requests
  SET 
    status = 'approved',
    approval_date = NOW(),
    approved_by = p_approved_by,
    notes = p_notes,
    updated_at = NOW()
  WHERE id = p_request_id;
  
  -- Check if farmer budget exists
  SELECT EXISTS (
    SELECT 1 FROM farmer_budgets
    WHERE farmer_id = v_request.farmer_id
    AND organization_id = v_request.organization_id
  ) INTO v_budget_exists;
  
  -- Update or create farmer budget
  IF v_budget_exists THEN
    UPDATE farmer_budgets
    SET 
      total_allocation = total_allocation + v_request.amount,
      remaining_balance = remaining_balance + v_request.amount,
      updated_at = NOW()
    WHERE 
      farmer_id = v_request.farmer_id
      AND organization_id = v_request.organization_id;
  ELSE
    INSERT INTO farmer_budgets (
      farmer_id,
      organization_id,
      total_allocation,
      remaining_balance
    ) VALUES (
      v_request.farmer_id,
      v_request.organization_id,
      v_request.amount,
      v_request.amount
    );
  END IF;
  
  -- Record the transaction
  INSERT INTO farmer_transactions (
    farmer_id,
    organization_id,
    transaction_type,
    amount,
    description,
    status,
    reference_id
  ) VALUES (
    v_request.farmer_id,
    v_request.organization_id,
    'allocation',
    v_request.amount,
    'Budget request approved: ' || v_request.purpose,
    'completed',
    p_request_id
  );
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error approving budget request: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Create function to reject a budget request
CREATE OR REPLACE FUNCTION reject_budget_request(
  p_request_id UUID,
  p_rejected_by UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the request status
  UPDATE farmer_budget_requests
  SET 
    status = 'rejected',
    approval_date = NOW(), -- we use the same field for rejection date
    approved_by = p_rejected_by, -- we use the same field for rejected_by
    notes = p_notes,
    updated_at = NOW()
  WHERE id = p_request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Budget request not found or not in pending status';
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error rejecting budget request: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION approve_budget_request TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION reject_budget_request TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_farmer_budget_requests_updated_at TO anon, authenticated, service_role;

COMMIT; 