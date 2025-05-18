-- Script to create the farmer_transactions table

-- Create farmer_transactions table to track all wallet transactions
CREATE TABLE IF NOT EXISTS public.farmer_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES public.farmer_profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('allocation', 'expense', 'request', 'refund')),
  amount DECIMAL(15,2) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled', 'rejected')),
  reference_id UUID, -- Can link to budget_request_id or other documents
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_farmer_transactions_farmer_id ON public.farmer_transactions (farmer_id);
CREATE INDEX IF NOT EXISTS idx_farmer_transactions_organization_id ON public.farmer_transactions (organization_id);
CREATE INDEX IF NOT EXISTS idx_farmer_transactions_transaction_date ON public.farmer_transactions (transaction_date);

-- Add trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_farmer_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_farmer_transactions_updated_at ON farmer_transactions;
CREATE TRIGGER update_farmer_transactions_updated_at
BEFORE UPDATE ON farmer_transactions
FOR EACH ROW
EXECUTE FUNCTION update_farmer_transactions_updated_at();

-- Function to allocate budget to a farmer and record the transaction
CREATE OR REPLACE FUNCTION allocate_farmer_budget(
  p_farmer_id UUID,
  p_organization_id UUID,
  p_amount DECIMAL,
  p_description TEXT DEFAULT 'Budget allocation'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction_id UUID;
  v_budget_exists BOOLEAN;
BEGIN
  -- Check if farmer and organization exist and are valid
  IF NOT EXISTS (
    SELECT 1 FROM farmer_profiles 
    WHERE id = p_farmer_id
  ) THEN
    RAISE EXCEPTION 'Farmer does not exist';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM organizations 
    WHERE id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'Organization does not exist';
  END IF;
  
  -- Check if farmer belongs to this organization
  IF NOT EXISTS (
    SELECT 1 FROM organization_members
    WHERE farmer_id = p_farmer_id
    AND organization_id = p_organization_id
    AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Farmer is not a member of this organization';
  END IF;
  
  -- Check if the amount is positive
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Allocation amount must be positive';
  END IF;
  
  -- First check if farmer_budget entry exists
  SELECT EXISTS (
    SELECT 1 FROM farmer_budgets
    WHERE farmer_id = p_farmer_id
    AND organization_id = p_organization_id
  ) INTO v_budget_exists;
  
  -- Create or update the farmer's budget
  IF v_budget_exists THEN
    -- Update existing budget
    UPDATE farmer_budgets
    SET total_allocation = total_allocation + p_amount,
        remaining_balance = remaining_balance + p_amount,
        updated_at = now()
    WHERE farmer_id = p_farmer_id
    AND organization_id = p_organization_id;
  ELSE
    -- Create new budget entry
    INSERT INTO farmer_budgets (
      farmer_id,
      organization_id,
      total_allocation,
      remaining_balance
    ) VALUES (
      p_farmer_id,
      p_organization_id,
      p_amount,
      p_amount
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
    transaction_date
  ) VALUES (
    p_farmer_id,
    p_organization_id,
    'allocation',
    p_amount,
    p_description,
    'completed',
    now()
  ) RETURNING id INTO v_transaction_id;
  
  -- Reduce the organization's budget if tracking that
  -- This part depends on how organization budgets are tracked
  
  RETURN v_transaction_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error allocating budget: %', SQLERRM;
END;
$$;

-- Function to record an expense
CREATE OR REPLACE FUNCTION record_farmer_expense(
  p_farmer_id UUID,
  p_organization_id UUID,
  p_amount DECIMAL,
  p_description TEXT,
  p_reference_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction_id UUID;
  v_remaining_balance DECIMAL;
BEGIN
  -- Validate inputs
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Expense amount must be positive';
  END IF;
  
  -- Check if farmer has enough budget
  SELECT remaining_balance INTO v_remaining_balance
  FROM farmer_budgets
  WHERE farmer_id = p_farmer_id
  AND organization_id = p_organization_id;
  
  IF v_remaining_balance IS NULL THEN
    RAISE EXCEPTION 'No budget found for this farmer';
  END IF;
  
  IF v_remaining_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient budget. Available: %, Required: %', v_remaining_balance, p_amount;
  END IF;
  
  -- Update the farmer's budget
  UPDATE farmer_budgets
  SET remaining_balance = remaining_balance - p_amount,
      updated_at = now()
  WHERE farmer_id = p_farmer_id
  AND organization_id = p_organization_id;
  
  -- Record the transaction
  INSERT INTO farmer_transactions (
    farmer_id,
    organization_id,
    transaction_type,
    amount,
    description,
    status,
    reference_id,
    transaction_date
  ) VALUES (
    p_farmer_id,
    p_organization_id,
    'expense',
    p_amount,
    p_description,
    'completed',
    p_reference_id,
    now()
  ) RETURNING id INTO v_transaction_id;
  
  RETURN v_transaction_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error recording expense: %', SQLERRM;
END;
$$;

-- Grant execution privileges
GRANT EXECUTE ON FUNCTION allocate_farmer_budget TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION record_farmer_expense TO authenticated, service_role;

-- Enable row-level security
ALTER TABLE public.farmer_transactions ENABLE ROW LEVEL SECURITY;

-- Policy for farmers to view their own transactions
CREATE POLICY farmer_view_transactions ON farmer_transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM farmer_profiles fp
      WHERE fp.id = farmer_transactions.farmer_id
      AND fp.user_id = auth.uid()
    )
  );

-- Policy for organization admins to manage transactions
CREATE POLICY org_admin_manage_transactions ON farmer_transactions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      -- Direct query for organization admins
      (
        -- Direct admin through organization_admins table
        SELECT 1 FROM organization_admins
        WHERE user_id = auth.uid()
        AND organization_id = farmer_transactions.organization_id
      )
      UNION ALL
      (
        -- Member admin through organization_members and farmer_profiles
        SELECT 1 FROM organization_members om
        JOIN farmer_profiles fp ON om.farmer_id = fp.id
        WHERE fp.user_id = auth.uid()
        AND om.organization_id = farmer_transactions.organization_id
        AND om.role IN ('admin', 'org_admin')
      )
    )
  ); 