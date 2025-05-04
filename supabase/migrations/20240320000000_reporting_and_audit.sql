-- Audit Tables
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  changes JSONB NOT NULL,
  ip_address TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Approval Workflow Tables
CREATE TABLE IF NOT EXISTS approval_workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_type TEXT NOT NULL,
  min_amount DECIMAL,
  max_amount DECIMAL,
  current_step INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approval_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID REFERENCES approval_workflows(id),
  role TEXT NOT NULL,
  required_approvers INTEGER DEFAULT 1,
  order_number INTEGER NOT NULL,
  is_final BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS approval_decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID REFERENCES approval_workflows(id),
  step_id UUID REFERENCES approval_steps(id),
  approver_id UUID REFERENCES auth.users(id),
  decision TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Batch Processing Tables
CREATE TABLE IF NOT EXISTS disbursement_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_number TEXT UNIQUE NOT NULL,
  total_amount DECIMAL NOT NULL,
  organization_count INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS disbursement_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID REFERENCES disbursement_batches(id),
  organization_id UUID REFERENCES organizations(id),
  amount DECIMAL NOT NULL,
  purpose TEXT,
  reference_number TEXT,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  processed_at TIMESTAMPTZ
);

-- Reporting Functions
CREATE OR REPLACE FUNCTION generate_regional_budget_report(
  p_region_id UUID,
  p_fiscal_year INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_report JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_budget', rb.amount,
    'total_allocated', rb.utilized_amount,
    'total_utilized', COALESCE(
      (SELECT SUM(utilized_amount) FROM organization_budgets 
       WHERE organization_id IN (SELECT id FROM organizations WHERE region_id = p_region_id)
       AND fiscal_year = p_fiscal_year
      ), 0),
    'allocation_by_region', (
      SELECT jsonb_object_agg(o.name, ob.total_allocation)
      FROM organizations o
      LEFT JOIN organization_budgets ob ON ob.organization_id = o.id
      WHERE o.region_id = p_region_id AND ob.fiscal_year = p_fiscal_year
    ),
    'utilization_by_category', (
      SELECT jsonb_object_agg(category, SUM(amount))
      FROM budget_allocations
      WHERE organization_id IN (SELECT id FROM organizations WHERE region_id = p_region_id)
      AND fiscal_year = p_fiscal_year
      GROUP BY category
    ),
    'monthly_spending', (
      SELECT jsonb_object_agg(
        TO_CHAR(expense_date, 'YYYY-MM'),
        SUM(amount)
      )
      FROM budget_expenses be
      JOIN organization_budgets ob ON be.budget_id = ob.id
      WHERE ob.fiscal_year = p_fiscal_year
      AND ob.organization_id IN (SELECT id FROM organizations WHERE region_id = p_region_id)
      GROUP BY TO_CHAR(expense_date, 'YYYY-MM')
    )
  ) INTO v_report
  FROM region_budgets rb
  WHERE rb.region_id = p_region_id AND rb.fiscal_year = p_fiscal_year;

  RETURN v_report;
END;
$$;

-- Audit Functions
CREATE OR REPLACE FUNCTION create_audit_log(
  p_action_type TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_changes JSONB,
  p_metadata JSONB DEFAULT '{}'::JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_log_id UUID;
BEGIN
  -- Get current user ID from auth.uid()
  v_user_id := auth.uid();
  
  INSERT INTO audit_logs (
    action_type,
    entity_type,
    entity_id,
    user_id,
    changes,
    metadata,
    ip_address
  ) VALUES (
    p_action_type,
    p_entity_type,
    p_entity_id,
    v_user_id,
    p_changes,
    p_metadata,
    current_setting('request.headers')::json->>'x-forwarded-for'
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Approval Workflow Functions
CREATE OR REPLACE FUNCTION create_approval_workflow(
  p_request_type TEXT,
  p_amount DECIMAL,
  p_organization_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_workflow_id UUID;
BEGIN
  -- Create workflow
  INSERT INTO approval_workflows (
    request_type,
    min_amount,
    max_amount
  ) VALUES (
    p_request_type,
    p_amount,
    p_amount
  ) RETURNING id INTO v_workflow_id;

  -- Create approval steps based on amount thresholds
  IF p_amount >= 1000000 THEN
    -- Large amount workflow
    INSERT INTO approval_steps (workflow_id, role, required_approvers, order_number, is_final)
    VALUES
      (v_workflow_id, 'regional_admin', 1, 1, false),
      (v_workflow_id, 'finance_officer', 2, 2, false),
      (v_workflow_id, 'super_admin', 1, 3, true);
  ELSE
    -- Standard workflow
    INSERT INTO approval_steps (workflow_id, role, required_approvers, order_number, is_final)
    VALUES
      (v_workflow_id, 'regional_admin', 1, 1, false),
      (v_workflow_id, 'finance_officer', 1, 2, true);
  END IF;

  RETURN v_workflow_id;
END;
$$;

-- Batch Processing Functions
CREATE OR REPLACE FUNCTION create_batch_disbursement(
  p_items JSONB[],
  p_metadata JSONB DEFAULT '{}'::JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_batch_id UUID;
  v_total_amount DECIMAL := 0;
  v_item JSONB;
BEGIN
  -- Calculate total amount
  FOREACH v_item IN ARRAY p_items
  LOOP
    v_total_amount := v_total_amount + (v_item->>'amount')::DECIMAL;
  END LOOP;

  -- Create batch record
  INSERT INTO disbursement_batches (
    batch_number,
    total_amount,
    organization_count,
    created_by
  ) VALUES (
    'BATCH-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS'),
    v_total_amount,
    array_length(p_items, 1),
    auth.uid()
  ) RETURNING id INTO v_batch_id;

  -- Create individual disbursement items
  FOREACH v_item IN ARRAY p_items
  LOOP
    INSERT INTO disbursement_items (
      batch_id,
      organization_id,
      amount,
      purpose,
      reference_number
    ) VALUES (
      v_batch_id,
      (v_item->>'organization_id')::UUID,
      (v_item->>'amount')::DECIMAL,
      v_item->>'purpose',
      v_item->>'reference_number'
    );
  END LOOP;

  RETURN v_batch_id;
END;
$$; 