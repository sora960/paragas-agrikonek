-- Create stored procedures for admin operations
-- These functions will bypass RLS for authorized operations

-- Function to update a region budget
CREATE OR REPLACE FUNCTION admin_update_region_budget(
  p_region_id UUID,
  p_amount NUMERIC,
  p_fiscal_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if the row exists
  IF EXISTS (SELECT 1 FROM region_budgets WHERE region_id = p_region_id) THEN
    -- Update existing row
    UPDATE region_budgets
    SET amount = p_amount,
        updated_at = NOW()
    WHERE region_id = p_region_id;
  ELSE
    -- Insert new row
    INSERT INTO region_budgets (region_id, amount, created_at, updated_at)
    VALUES (p_region_id, p_amount, NOW(), NOW());
  END IF;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in admin_update_region_budget: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Function to get all region budgets
CREATE OR REPLACE FUNCTION admin_get_region_budgets()
RETURNS TABLE (
  region_id UUID,
  region_name TEXT,
  amount NUMERIC,
  updated_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT r.id, r.name, COALESCE(rb.amount, 0), COALESCE(rb.updated_at, NOW())
  FROM regions r
  LEFT JOIN region_budgets rb ON r.id = rb.region_id
  ORDER BY r.name;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in admin_get_region_budgets: %', SQLERRM;
    RETURN;
END;
$$;

-- Function to update multiple region budgets in a batch
CREATE OR REPLACE FUNCTION admin_save_region_budgets_batch(
  p_allocations JSON
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  allocation_record RECORD;
BEGIN
  -- Process each allocation
  FOR allocation_record IN SELECT * FROM json_to_recordset(p_allocations) AS x(region_id UUID, amount NUMERIC)
  LOOP
    -- Check if the row exists
    IF EXISTS (SELECT 1 FROM region_budgets WHERE region_id = allocation_record.region_id) THEN
      -- Update existing row
      UPDATE region_budgets
      SET amount = allocation_record.amount,
          updated_at = NOW()
      WHERE region_id = allocation_record.region_id;
    ELSE
      -- Insert new row
      INSERT INTO region_budgets (region_id, amount, created_at, updated_at)
      VALUES (allocation_record.region_id, allocation_record.amount, NOW(), NOW());
    END IF;
  END LOOP;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in admin_save_region_budgets_batch: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Grant permissions on functions
GRANT EXECUTE ON FUNCTION admin_update_region_budget TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_region_budgets TO authenticated;
GRANT EXECUTE ON FUNCTION admin_save_region_budgets_batch TO authenticated; 