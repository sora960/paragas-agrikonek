-- Script to set up organization budget related tables

-- First back up existing organization_budgets table
CREATE TABLE IF NOT EXISTS organization_budgets_backup AS
SELECT * FROM organization_budgets;

-- Alter the organization_budgets table
ALTER TABLE organization_budgets 
  DROP CONSTRAINT IF EXISTS organization_budgets_pkey CASCADE;

-- Update organization_budgets table to use organization_id as primary key
-- and make fiscal_year optional
ALTER TABLE organization_budgets 
  DROP COLUMN IF EXISTS fiscal_year;

ALTER TABLE organization_budgets 
  ADD PRIMARY KEY (organization_id);

-- Create expense tracking table
CREATE TABLE IF NOT EXISTS organization_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  amount DECIMAL NOT NULL,
  description TEXT,
  category VARCHAR(100),
  expense_date DATE NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create budget allocation categories table
CREATE TABLE IF NOT EXISTS budget_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default budget categories
INSERT INTO budget_categories (name, description) VALUES
  ('Farm Equipment', 'Agricultural machinery and tools'),
  ('Seeds and Fertilizers', 'Farming inputs'),
  ('Labor and Wages', 'Personnel costs'),
  ('Infrastructure', 'Buildings and facilities'),
  ('Training and Development', 'Capacity building programs'),
  ('Marketing', 'Advertising and promotion'),
  ('Transportation', 'Logistics and delivery'),
  ('Storage Facilities', 'Warehousing and preservation'),
  ('Technology and Software', 'IT and digital solutions'),
  ('Other', 'Miscellaneous expenses')
ON CONFLICT DO NOTHING;

-- Create budget allocation tracking table
CREATE TABLE IF NOT EXISTS budget_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  category_id UUID REFERENCES budget_categories(id),
  allocated_amount DECIMAL NOT NULL,
  utilized_amount DECIMAL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, category_id)
);

-- Add policy for organization members to view organization expenses
CREATE POLICY organization_expenses_select_policy
  ON organization_expenses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN farmer_profiles fp ON om.farmer_id = fp.id
      WHERE om.organization_id = organization_expenses.organization_id
      AND fp.user_id = auth.uid()
    )
  );

-- Add policy for organization admins to insert organization expenses
CREATE POLICY organization_expenses_insert_policy
  ON organization_expenses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      JOIN farmer_profiles fp ON om.farmer_id = fp.id
      WHERE om.organization_id = organization_expenses.organization_id
      AND fp.user_id = auth.uid()
      AND om.role IN ('admin', 'org_admin')
    )
  );

-- Enable RLS on organization expenses
ALTER TABLE organization_expenses ENABLE ROW LEVEL SECURITY;

-- Trigger to update remaining_balance in organization_budgets when expenses are added
CREATE OR REPLACE FUNCTION update_remaining_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- If inserting or updating an expense
  IF (TG_OP = 'INSERT') THEN
    -- Update the remaining balance by subtracting the expense amount
    UPDATE organization_budgets
    SET remaining_balance = remaining_balance - NEW.amount
    WHERE organization_id = NEW.organization_id;
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Update the remaining balance by adding the old amount and subtracting the new amount
    UPDATE organization_budgets
    SET remaining_balance = remaining_balance + OLD.amount - NEW.amount
    WHERE organization_id = NEW.organization_id;
  ELSIF (TG_OP = 'DELETE') THEN
    -- Update the remaining balance by adding back the deleted expense amount
    UPDATE organization_budgets
    SET remaining_balance = remaining_balance + OLD.amount
    WHERE organization_id = OLD.organization_id;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for expenses
CREATE TRIGGER organization_expenses_trigger
AFTER INSERT OR UPDATE OR DELETE ON organization_expenses
FOR EACH ROW
EXECUTE FUNCTION update_remaining_balance(); 