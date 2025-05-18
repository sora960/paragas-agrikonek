-- This SQL script simplifies the budget system schema
-- It removes the fiscal_year column from budget tables and adjusts constraints

-- First back up the tables in case we need to revert
CREATE TABLE IF NOT EXISTS region_budgets_backup AS
SELECT * FROM region_budgets;

-- Drop existing constraints
ALTER TABLE region_budgets DROP CONSTRAINT IF EXISTS region_budgets_pkey CASCADE;

-- Remove fiscal_year column and update primary key
ALTER TABLE region_budgets DROP COLUMN IF EXISTS fiscal_year;
ALTER TABLE region_budgets ADD PRIMARY KEY (region_id);

-- Update organization_budgets table similarly if needed
CREATE TABLE IF NOT EXISTS organization_budgets_backup AS
SELECT * FROM organization_budgets;

-- For organization_budgets, we'll keep fiscal_year but make it optional
ALTER TABLE organization_budgets ALTER COLUMN fiscal_year DROP NOT NULL;

-- Add comment to explain the changes
COMMENT ON TABLE region_budgets IS 'Stores budget allocations for regions. Primary key is region_id.'; 