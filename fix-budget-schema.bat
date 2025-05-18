@echo off
echo Fixing organization budgets table schema...

REM Load environment variables
set ENV_FILE=.env

IF EXIST %ENV_FILE% (
    for /f "tokens=1,2 delims==" %%a in (%ENV_FILE%) do (
        set %%a=%%b
    )
) ELSE (
    echo Environment file not found. Using default values.
    set SUPABASE_URL=https://supabase.eztechsolutions.pro
    set SUPABASE_KEY=your_service_role_key_here
)

echo.
echo =====================================================================
echo MANUAL INSTRUCTIONS:
echo =====================================================================
echo 1. Go to your Supabase Studio SQL Editor: %SUPABASE_URL%/project/sql
echo 2. Copy and paste the contents of the file: src/sql/fix-org-budgets-schema.sql
echo 3. Run the SQL query to fix the organization_budgets table schema
echo =====================================================================
echo.
echo This will add the missing remaining_amount and utilized_amount columns 
echo to the organization_budgets table.
echo.
pause 