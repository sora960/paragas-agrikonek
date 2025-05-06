@echo off
echo ======================================================
echo  Fixing Users Table Permissions for Farmer Profile
echo ======================================================
echo.

echo Running JavaScript fix script...
node apply-user-fix.js

echo.
echo ======================================================
echo  Done! Check the output above for results.
echo ======================================================

pause 