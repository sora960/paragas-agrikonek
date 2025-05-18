-- Master SQL file to execute all changes in the correct order

-- First run fix-organization-admin.sql which contains the organization_admins_view
\i fix-organization-admin.sql

-- Then run the creation of the organization_budget_requests table
\i create-organization-budget-requests.sql

-- Output confirmation
DO $$
BEGIN
  RAISE NOTICE 'All SQL scripts executed successfully!';
END $$; 