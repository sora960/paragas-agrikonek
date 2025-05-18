-- SQL Function to allow superadmin to execute SQL directly
-- This bypasses RLS policies by using SECURITY DEFINER
CREATE OR REPLACE FUNCTION admin_execute_sql(sql_query text)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- This makes it run with the privileges of the function creator
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Execute the SQL query
  EXECUTE 'WITH result AS (' || sql_query || ') SELECT json_agg(row_to_json(result)) FROM result' INTO result;
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION admin_execute_sql TO authenticated;

-- RPC function to bypass RLS for region budget updates
CREATE OR REPLACE FUNCTION admin_update_region_budget(
  p_region_id UUID,
  p_amount NUMERIC,
  p_fiscal_year INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Upsert the region budget
  WITH updated AS (
    INSERT INTO region_budgets (region_id, fiscal_year, amount, allocated)
    VALUES (p_region_id, p_fiscal_year, p_amount, false)
    ON CONFLICT (region_id, fiscal_year)
    DO UPDATE SET 
      amount = p_amount,
      updated_at = NOW()
    RETURNING *
  )
  SELECT json_agg(row_to_json(updated)) FROM updated INTO result;
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION admin_update_region_budget TO authenticated;

-- RPC function to process budget requests directly
CREATE OR REPLACE FUNCTION admin_process_budget_request(
  p_request_id UUID,
  p_status TEXT,
  p_notes TEXT,
  p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request budget_requests;
  v_fiscal_year INTEGER;
  v_current_amount NUMERIC;
  v_new_amount NUMERIC;
  result JSONB;
BEGIN
  -- Get the budget request
  SELECT * INTO v_request FROM budget_requests WHERE id = p_request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Budget request not found';
  END IF;
  
  -- If approved, update the region budget
  IF p_status = 'approved' THEN
    -- Get fiscal year
    v_fiscal_year := EXTRACT(YEAR FROM v_request.request_date)::INTEGER;
    
    -- Get current budget amount
    SELECT amount INTO v_current_amount
    FROM region_budgets
    WHERE region_id = v_request.region_id AND fiscal_year = v_fiscal_year;
    
    IF NOT FOUND THEN
      v_current_amount := 0;
    END IF;
    
    -- Calculate new amount
    v_new_amount := v_current_amount + v_request.requested_amount;
    
    -- Upsert region budget
    INSERT INTO region_budgets (region_id, fiscal_year, amount, allocated)
    VALUES (v_request.region_id, v_fiscal_year, v_new_amount, false)
    ON CONFLICT (region_id, fiscal_year)
    DO UPDATE SET 
      amount = v_new_amount,
      updated_at = NOW();
  END IF;
  
  -- Update the request status
  UPDATE budget_requests
  SET 
    status = p_status,
    notes = p_notes,
    processed_by = p_admin_id,
    processed_date = NOW()
  WHERE id = p_request_id
  RETURNING row_to_json(budget_requests) INTO result;
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION admin_process_budget_request TO authenticated; 