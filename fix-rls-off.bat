@echo off
echo ===================================
echo Disable RLS for Region Budgets
echo ===================================
echo.

set /p SERVICE_KEY="Enter your Supabase service role key: "
set /p SUPABASE_URL="Enter your Supabase URL [https://supabase.eztechsolutions.pro]: "

if "%SUPABASE_URL%"=="" set SUPABASE_URL=https://supabase.eztechsolutions.pro

echo.
echo Disabling RLS for region_budgets table...
echo.

curl -X POST "%SUPABASE_URL%/rest/v1/rpc/execute_sql" ^
  -H "apikey: %SERVICE_KEY%" ^
  -H "Authorization: Bearer %SERVICE_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"sql_query\": \"ALTER TABLE region_budgets DISABLE ROW LEVEL SECURITY; GRANT ALL ON region_budgets TO authenticated; GRANT ALL ON region_budgets TO anon;\"}"

echo.
echo RLS has been disabled.
echo.
echo Please refresh your application to see the changes.
pause 