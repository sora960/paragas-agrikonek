-- Function to allocate budget from region to organization
CREATE OR REPLACE FUNCTION allocate_organization_budget(
  p_organization_id UUID,
  p_amount DECIMAL,
  p_fiscal_year INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_region_id UUID;
  v_region_budget_id UUID;
  v_org_budget_id UUID;
  v_remaining_amount DECIMAL;
  v_result JSONB;
BEGIN
  -- Get the organization's region
  SELECT region_id INTO v_region_id
  FROM organizations
  WHERE id = p_organization_id;

  -- Get the region's budget record and remaining amount
  SELECT id, remaining_amount INTO v_region_budget_id, v_remaining_amount
  FROM region_budgets
  WHERE region_id = v_region_id AND fiscal_year = p_fiscal_year;

  -- Check if there's enough budget
  IF v_remaining_amount < p_amount THEN
    RAISE EXCEPTION 'Insufficient regional budget. Available: %, Requested: %', v_remaining_amount, p_amount;
  END IF;

  -- Start transaction
  BEGIN
    -- Update region budget
    UPDATE region_budgets
    SET 
      utilized_amount = utilized_amount + p_amount,
      remaining_amount = remaining_amount - p_amount
    WHERE id = v_region_budget_id;

    -- Create or update organization budget
    INSERT INTO organization_budgets (
      organization_id,
      fiscal_year,
      total_allocation,
      utilized_amount,
      remaining_amount
    )
    VALUES (
      p_organization_id,
      p_fiscal_year,
      p_amount,
      0,
      p_amount
    )
    ON CONFLICT (organization_id, fiscal_year)
    DO UPDATE SET
      total_allocation = organization_budgets.total_allocation + p_amount,
      remaining_amount = organization_budgets.remaining_amount + p_amount
    RETURNING id INTO v_org_budget_id;

    -- Create allocation record
    INSERT INTO budget_allocations (
      budget_id,
      amount,
      allocation_date,
      status,
      notes
    )
    VALUES (
      v_org_budget_id,
      p_amount,
      CURRENT_TIMESTAMP,
      'approved',
      'Allocated from regional budget'
    );

    -- Prepare result
    SELECT jsonb_build_object(
      'success', true,
      'region_budget_id', v_region_budget_id,
      'organization_budget_id', v_org_budget_id,
      'amount', p_amount
    ) INTO v_result;

    RETURN v_result;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Failed to allocate budget: %', SQLERRM;
  END;
END;
$$;

-- Function to record organization budget expense
CREATE OR REPLACE FUNCTION record_organization_expense(
  p_organization_id UUID,
  p_amount DECIMAL,
  p_description TEXT,
  p_expense_date DATE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_budget_id UUID;
  v_remaining_amount DECIMAL;
  v_result JSONB;
BEGIN
  -- Get the organization's current budget
  SELECT id, remaining_amount INTO v_budget_id, v_remaining_amount
  FROM organization_budgets
  WHERE organization_id = p_organization_id
  AND fiscal_year = EXTRACT(YEAR FROM CURRENT_DATE);

  -- Check if there's enough budget
  IF v_remaining_amount < p_amount THEN
    RAISE EXCEPTION 'Insufficient budget. Available: %, Requested: %', v_remaining_amount, p_amount;
  END IF;

  -- Start transaction
  BEGIN
    -- Update organization budget
    UPDATE organization_budgets
    SET 
      utilized_amount = utilized_amount + p_amount,
      remaining_amount = remaining_amount - p_amount
    WHERE id = v_budget_id;

    -- Record expense
    INSERT INTO budget_expenses (
      budget_id,
      amount,
      description,
      expense_date,
      status
    )
    VALUES (
      v_budget_id,
      p_amount,
      p_description,
      p_expense_date,
      'recorded'
    );

    -- Prepare result
    SELECT jsonb_build_object(
      'success', true,
      'budget_id', v_budget_id,
      'amount', p_amount,
      'remaining', v_remaining_amount - p_amount
    ) INTO v_result;

    RETURN v_result;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Failed to record expense: %', SQLERRM;
  END;
END;
$$;

-- Function to request budget increase
CREATE OR REPLACE FUNCTION request_budget_increase(
  p_organization_id UUID,
  p_current_amount DECIMAL,
  p_requested_amount DECIMAL,
  p_reason TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_budget_id UUID;
  v_result JSONB;
BEGIN
  -- Get the organization's current budget
  SELECT id INTO v_budget_id
  FROM organization_budgets
  WHERE organization_id = p_organization_id
  AND fiscal_year = EXTRACT(YEAR FROM CURRENT_DATE);

  -- Create budget request
  INSERT INTO budget_requests (
    organization_id,
    current_amount,
    requested_amount,
    reason,
    status,
    request_date
  )
  VALUES (
    p_organization_id,
    p_current_amount,
    p_requested_amount,
    p_reason,
    'pending',
    CURRENT_TIMESTAMP
  );

  -- Prepare result
  SELECT jsonb_build_object(
    'success', true,
    'organization_id', p_organization_id,
    'requested_amount', p_requested_amount
  ) INTO v_result;

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to submit budget request: %', SQLERRM;
END;
$$;

-- Function to approve/reject budget request
CREATE OR REPLACE FUNCTION process_budget_request(
  p_request_id UUID,
  p_status TEXT,
  p_notes TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_organization_id UUID;
  v_requested_amount DECIMAL;
  v_region_id UUID;
  v_region_budget_remaining DECIMAL;
  v_result JSONB;
BEGIN
  -- Get request details
  SELECT 
    organization_id,
    requested_amount
  INTO 
    v_organization_id,
    v_requested_amount
  FROM budget_requests
  WHERE id = p_request_id;

  -- Get organization's region
  SELECT region_id INTO v_region_id
  FROM organizations
  WHERE id = v_organization_id;

  -- Get region's remaining budget
  SELECT remaining_amount INTO v_region_budget_remaining
  FROM region_budgets
  WHERE region_id = v_region_id
  AND fiscal_year = EXTRACT(YEAR FROM CURRENT_DATE);

  -- Check if there's enough budget if approving
  IF p_status = 'approved' AND v_region_budget_remaining < v_requested_amount THEN
    RAISE EXCEPTION 'Insufficient regional budget for this request';
  END IF;

  -- Update request status
  UPDATE budget_requests
  SET 
    status = p_status,
    processed_date = CURRENT_TIMESTAMP,
    notes = p_notes
  WHERE id = p_request_id;

  -- If approved, allocate the budget
  IF p_status = 'approved' THEN
    PERFORM allocate_organization_budget(
      v_organization_id,
      v_requested_amount,
      EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
    );
  END IF;

  -- Prepare result
  SELECT jsonb_build_object(
    'success', true,
    'request_id', p_request_id,
    'status', p_status
  ) INTO v_result;

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to process budget request: %', SQLERRM;
END;
$$; 