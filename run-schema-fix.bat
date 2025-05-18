@echo off
echo Running schema fixes for AgriConnect...

REM Get Supabase URL and key from environment or use defaults
set SUPABASE_URL=%SUPABASE_URL%
if "%SUPABASE_URL%"=="" set SUPABASE_URL=https://supabase.eztechsolutions.pro

set SUPABASE_KEY=%SUPABASE_ANON_KEY%
if "%SUPABASE_KEY%"=="" echo Supabase key not found in environment. Please set SUPABASE_ANON_KEY.

echo Step 1: Fixing farm_plots table schema...
curl -X POST ^
  %SUPABASE_URL%/rest/v1/rpc/exec_sql ^
  -H "apikey: %SUPABASE_KEY%" ^
  -H "Authorization: Bearer %SUPABASE_KEY%" ^
  -H "Content-Type: application/json" ^
  -d @src/sql/fix-farm-plots-schema.sql

echo Step 2: Creating farm_events table...
curl -X POST ^
  %SUPABASE_URL%/rest/v1/rpc/exec_sql ^
  -H "apikey: %SUPABASE_KEY%" ^
  -H "Authorization: Bearer %SUPABASE_KEY%" ^
  -H "Content-Type: application/json" ^
  -d @src/sql/create-farm-events-table.sql

echo Step 3: Fixing fiscal_year references...
curl -X POST ^
  %SUPABASE_URL%/rest/v1/rpc/exec_sql ^
  -H "apikey: %SUPABASE_KEY%" ^
  -H "Authorization: Bearer %SUPABASE_KEY%" ^
  -H "Content-Type: application/json" ^
  -d @src/sql/fix-fiscal-year-references.sql

echo Schema updates complete!
echo Please restart the application for changes to take effect. 