@echo off
echo ===================================
echo Region Budgets Permission Fix Tool
echo ===================================
echo.

set /p SERVICE_KEY="Enter your Supabase service role key: "
set /p SUPABASE_URL="Enter your Supabase URL [https://supabase.eztechsolutions.pro]: "

if "%SUPABASE_URL%"=="" set SUPABASE_URL=https://supabase.eztechsolutions.pro

echo.
echo Applying permissions fix...
echo.

powershell -Command "(Get-Content src\sql\direct-access-permissions.sql) -join ' ' -replace '\"', '\\\"' | Out-File -Encoding utf8 temp_query.txt"
set /p QUERY=<temp_query.txt
del temp_query.txt

curl -X POST "%SUPABASE_URL%/rest/v1/rpc/execute_sql" ^
  -H "apikey: %SERVICE_KEY%" ^
  -H "Authorization: Bearer %SERVICE_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"sql_query\": \"%QUERY%\"}"

echo.
echo Permissions fix completed.
echo.
echo Please refresh your application to see the changes.
pause 