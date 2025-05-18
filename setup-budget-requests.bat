@echo off
echo Setting up organization budget requests table...

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

REM Check if PSQL is installed and in PATH
where psql >nul 2>nul
IF %ERRORLEVEL% NEQ 0 (
    echo PostgreSQL client (psql) not found in PATH.
    echo Please install PostgreSQL client tools or ensure they are in your PATH.
    echo You can still run the SQL script manually using the Supabase Studio SQL Editor.
    goto :MANUAL_INSTRUCTIONS
)

REM Get DB connection string from Supabase URL (example conversion)
set CONN_STRING=%SUPABASE_URL%
set CONN_STRING=%CONN_STRING:https://=postgresql://postgres:postgres@%
set CONN_STRING=%CONN_STRING%:5432/postgres

echo Using connection string: %CONN_STRING%
echo.

REM Run the SQL script
echo Running SQL script to create organization budget requests table...
psql "%CONN_STRING%" -f src/sql/create-organization-budget-requests.sql

IF %ERRORLEVEL% NEQ 0 (
    echo Failed to run SQL script directly. Switching to manual instructions.
    goto :MANUAL_INSTRUCTIONS
) ELSE (
    echo SQL script executed successfully!
    echo Organization budget requests table has been set up.
    goto :END
)

:MANUAL_INSTRUCTIONS
echo.
echo =====================================================================
echo MANUAL INSTRUCTIONS:
echo =====================================================================
echo 1. Go to your Supabase Studio SQL Editor: %SUPABASE_URL%/project/sql
echo 2. Copy and paste the contents of the file: src/sql/create-organization-budget-requests.sql
echo 3. Run the SQL query to create the organization budget requests table
echo =====================================================================

:END
pause 