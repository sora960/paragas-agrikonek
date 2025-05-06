@echo off
echo ===================================================================
echo     FIXING ORGANIZATION ANNOUNCEMENTS FOR ADMINS AND MEMBERS
echo ===================================================================
echo.
echo This script will fix permissions issues with the organization_announcements
echo table to ensure both admins and members can view announcements.
echo.
echo Press any key to continue or CTRL+C to cancel...
pause > nul

echo.
echo Running fix for announcement permissions...
echo.

REM Run the JS script to execute SQL
node run-fix-announcements.js

echo.
echo ===================================================================
echo If the script completed successfully:
echo 1. Restart your application
echo 2. Try creating a new announcement as an admin
echo 3. Check if members can view the announcements
echo.
echo If you still see errors, please try the manual approach:
echo 1. Log into your Supabase dashboard
echo 2. Open the SQL Editor
echo 3. Copy and paste the contents of fix-announcements-all.sql
echo 4. Execute the SQL
echo ===================================================================
echo.
echo Fix attempt completed.
pause 