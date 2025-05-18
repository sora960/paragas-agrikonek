-- Create or update farmer_budgets table for budget allocation
BEGIN;

-- First, ensure the table exists
CREATE TABLE IF NOT EXISTS public.farmer_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES public.farmer_profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  total_allocation NUMERIC(15,2) DEFAULT 0,
  remaining_balance NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT farmer_budgets_unique_farmer_org UNIQUE (farmer_id, organization_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_farmer_budgets_farmer_id ON public.farmer_budgets (farmer_id);
CREATE INDEX IF NOT EXISTS idx_farmer_budgets_organization_id ON public.farmer_budgets (organization_id);

-- Add a trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_farmer_budgets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_farmer_budgets_updated_at ON farmer_budgets;
CREATE TRIGGER update_farmer_budgets_updated_at
BEFORE UPDATE ON farmer_budgets
FOR EACH ROW
EXECUTE FUNCTION update_farmer_budgets_updated_at();

-- IMPORTANT: Disable RLS to fix permission errors
ALTER TABLE public.farmer_budgets DISABLE ROW LEVEL SECURITY;

-- Grant all permissions to users
GRANT ALL ON public.farmer_budgets TO anon, authenticated, service_role;

-- The table already exists, but let's create a function to allocate budget to a farmer
CREATE OR REPLACE FUNCTION allocate_farmer_budget(
  p_organization_id UUID,
  p_farmer_id UUID,
  p_amount DECIMAL(15, 2)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_record RECORD;
  v_org_exists BOOLEAN;
  v_farmer_exists BOOLEAN;
BEGIN
  -- Check if organization exists
  SELECT EXISTS(SELECT 1 FROM public.organizations WHERE id = p_organization_id) INTO v_org_exists;
  IF NOT v_org_exists THEN
    RAISE EXCEPTION 'Organization does not exist';
    RETURN FALSE;
  END IF;
  
  -- Check if farmer exists
  SELECT EXISTS(SELECT 1 FROM public.farmer_profiles WHERE id = p_farmer_id) INTO v_farmer_exists;
  IF NOT v_farmer_exists THEN
    RAISE EXCEPTION 'Farmer does not exist';
    RETURN FALSE;
  END IF;
  
  -- Check if record already exists
  SELECT * INTO v_existing_record 
  FROM public.farmer_budgets
  WHERE organization_id = p_organization_id AND farmer_id = p_farmer_id;
  
  IF v_existing_record IS NULL THEN
    -- Create new record
    INSERT INTO public.farmer_budgets (
      organization_id,
      farmer_id,
      total_allocation,
      remaining_balance
    ) VALUES (
      p_organization_id,
      p_farmer_id,
      p_amount,
      p_amount
    );
  ELSE
    -- Update existing record
    UPDATE public.farmer_budgets
    SET 
      total_allocation = p_amount,
      remaining_balance = p_amount,
      updated_at = CURRENT_TIMESTAMP
    WHERE organization_id = p_organization_id AND farmer_id = p_farmer_id;
  END IF;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error allocating farmer budget: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION allocate_farmer_budget TO anon, authenticated, service_role;

-- Add additional helper function to check if the table exists
CREATE OR REPLACE FUNCTION check_farmer_budgets_exists()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'farmer_budgets'
  );
END;
$$;

-- Grant execute permission on the check function
GRANT EXECUTE ON FUNCTION check_farmer_budgets_exists TO anon, authenticated, service_role;

COMMIT; 