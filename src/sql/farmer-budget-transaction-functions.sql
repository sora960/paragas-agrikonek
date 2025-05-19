-- Functions for handling farmer budget request approvals and budget transfers

-- Simple decrement function
CREATE OR REPLACE FUNCTION decrement(x numeric)
RETURNS numeric AS $$
BEGIN
  RETURN x - 1;
END;
$$ LANGUAGE plpgsql;

-- Process a farmer budget request
CREATE OR REPLACE FUNCTION process_farmer_budget_request(
  request_id UUID,
  approve BOOLEAN,
  admin_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_request RECORD;
  v_org_budget RECORD;
  v_farmer_budget RECORD;
  v_amount NUMERIC;
BEGIN
  -- Get the request
  SELECT * INTO v_request 
  FROM farmer_budget_requests 
  WHERE id = request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Budget request not found';
  END IF;
  
  -- If it's already processed, return an error
  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'Budget request is already processed with status: %', v_request.status;
  END IF;
  
  -- If not approving, just reject the request
  IF NOT approve THEN
    UPDATE farmer_budget_requests
    SET 
      status = 'rejected',
      approved_by = admin_id,
      approval_date = NOW(),
      notes = 'Request rejected by organization admin'
    WHERE id = request_id;
    
    RETURN TRUE;
  END IF;
  
  -- Get the request amount
  v_amount := v_request.amount;
  
  -- Get the organization budget
  SELECT * INTO v_org_budget 
  FROM organization_budgets 
  WHERE organization_id = v_request.organization_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization budget not found';
  END IF;
  
  -- Check if organization has enough budget
  IF v_org_budget.remaining_balance < v_amount THEN
    RAISE EXCEPTION 'Not enough funds in organization budget: % < %', 
      v_org_budget.remaining_balance, v_amount;
  END IF;
  
  -- Update organization budget (reduce remaining balance)
  UPDATE organization_budgets
  SET remaining_balance = remaining_balance - v_amount
  WHERE organization_id = v_request.organization_id;
  
  -- Check if farmer budget exists
  SELECT * INTO v_farmer_budget 
  FROM farmer_budgets 
  WHERE farmer_id = v_request.farmer_id 
  AND organization_id = v_request.organization_id;
  
  -- Update or create farmer budget
  IF FOUND THEN
    -- Update existing budget
    UPDATE farmer_budgets
    SET 
      total_allocation = total_allocation + v_amount,
      remaining_balance = remaining_balance + v_amount,
      updated_at = NOW()
    WHERE id = v_farmer_budget.id;
  ELSE
    -- Create new budget
    INSERT INTO farmer_budgets (
      farmer_id,
      organization_id,
      total_allocation,
      remaining_balance,
      created_at,
      updated_at
    ) VALUES (
      v_request.farmer_id,
      v_request.organization_id,
      v_amount,
      v_amount,
      NOW(),
      NOW()
    );
  END IF;
  
  -- Update the request status
  UPDATE farmer_budget_requests
  SET 
    status = 'approved',
    approval_date = NOW(),
    approved_by = admin_id,
    notes = 'Request approved and budget transferred'
  WHERE id = request_id;
  
  -- Record transaction in farmer_transactions table if it exists
  BEGIN
    INSERT INTO farmer_transactions (
      farmer_id,
      organization_id,
      amount,
      transaction_type,
      description,
      status,
      created_at
    ) VALUES (
      v_request.farmer_id,
      v_request.organization_id,
      v_amount,
      'budget_allocation',
      'Budget request approved: ' || v_request.purpose,
      'completed',
      NOW()
    );
  EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist, just ignore
    NULL;
  END;
  
  RETURN TRUE;

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION process_farmer_budget_request TO authenticated;
GRANT EXECUTE ON FUNCTION decrement TO authenticated; 