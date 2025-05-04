@echo off
echo =============================================
echo Farmer Tables Fix Utility
echo =============================================
echo This script will recreate the farmer_profiles and organization_members tables
echo to fix issues with Row Level Security (RLS) or missing tables.

echo.
echo Step 1: Installing the SQL execution function...
node install-sql-function.js
if %ERRORLEVEL% neq 0 (
    echo Error installing SQL function
    echo Please follow the manual installation instructions above
    pause
    exit /b 1
)

echo.
echo Step 2: Recreating farmer tables...
node recreate-farmer-tables.js
if %ERRORLEVEL% neq 0 (
    echo Error recreating tables
    echo Check the error messages above for more information
    pause
    exit /b 1
)

echo.
echo =============================================
echo Farmer tables have been successfully recreated!
echo The application should now be able to access these tables.
echo =============================================
echo.
echo Press any key to exit...
pause > nul 