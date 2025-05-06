@echo off
setlocal enabledelayedexpansion

echo ======================================================
echo  Fixing Users Table Permissions for Farmer Profile
echo ======================================================
echo.

REM Configuration - Update these values with your Supabase project details
set DB_HOST=localhost
set DB_PORT=54322
set DB_NAME=postgres
set DB_USER=postgres
set DB_PASSWORD=postgres

echo Connecting to database...
echo.

REM Execute the fix script using psql
"C:\Program Files\PostgreSQL\14\bin\psql" -h %DB_HOST% -p %DB_PORT% -d %DB_NAME% -U %DB_USER% -f fix-users-permissions-update.sql

if %ERRORLEVEL% NEQ 0 (
  echo.
  echo Error executing SQL script. Check that psql is in your PATH or update the path in this script.
  echo If psql is not installed, you can run the SQL commands directly in the Supabase dashboard SQL editor.
  echo.
) else (
  echo.
  echo Users table permissions fixed successfully!
  echo You can now access your farmer profile at http://localhost:8080/farmer/profile
  echo.
)

echo ======================================================
echo  If you're using the Supabase cloud instance instead of local development,
echo  you should run the SQL from fix-users-permissions-update.sql 
echo  directly in the Supabase dashboard SQL editor.
echo ======================================================

pause 