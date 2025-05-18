@echo off
echo ===================================
echo Fix All RLS and Permission Issues
echo ===================================
echo.

set /p SERVICE_KEY="Enter your Supabase service role key: "
set /p SUPABASE_URL="Enter your Supabase URL [https://supabase.eztechsolutions.pro]: "

if "%SUPABASE_URL%"=="" set SUPABASE_URL=https://supabase.eztechsolutions.pro

echo.
echo Reading SQL script...
echo.

set SQL_SCRIPT=
for /f "delims=" %%a in (fix-all-rls-issues.sql) do (
  set "line=%%a"
  set "SQL_SCRIPT=!SQL_SCRIPT!!line! "
)

echo.
echo Executing SQL script...
echo.

curl -X POST "%SUPABASE_URL%/rest/v1/rpc/execute_sql" ^
  -H "apikey: %SERVICE_KEY%" ^
  -H "Authorization: Bearer %SERVICE_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"sql_query\": \"%SQL_SCRIPT%\"}"

echo.
echo All RLS and permission issues have been fixed.
echo.
echo Please refresh your application to see the changes.
echo.
echo NOTE: If this doesn't work, you may need to run the SQL script directly
echo in the Supabase SQL Editor. The script is in file: fix-all-rls-issues.sql
echo.
pause 