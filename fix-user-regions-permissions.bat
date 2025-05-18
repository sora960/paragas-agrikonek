@echo off
setlocal EnableDelayedExpansion

rem Set database connection parameters
set DB_HOST=localhost
set DB_PORT=54322
set DB_NAME=postgres
set DB_USER=postgres
set DB_PASSWORD=postgres

echo ===================================================
echo  Fixing user_regions permissions in the database
echo ===================================================
echo.

rem Check if psql exists in the Path or in Program Files
where psql >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    set PSQL_CMD=psql
) else if exist "C:\Program Files\PostgreSQL\14\bin\psql.exe" (
    set PSQL_CMD="C:\Program Files\PostgreSQL\14\bin\psql.exe"
) else if exist "C:\Program Files\PostgreSQL\13\bin\psql.exe" (
    set PSQL_CMD="C:\Program Files\PostgreSQL\13\bin\psql.exe"
) else (
    echo ERROR: PostgreSQL psql command not found.
    echo Please ensure PostgreSQL is installed or edit this batch file
    echo to point to the correct psql location.
    goto :error
)

echo Running SQL script to fix permissions...

rem Execute the SQL script
%PSQL_CMD% -h %DB_HOST% -p %DB_PORT% -d %DB_NAME% -U %DB_USER% -f fix-user-regions-permissions.sql

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: SQL script execution failed.
    echo.
    echo If using Supabase Cloud:
    echo  1. Use the SQL Editor in the Supabase Dashboard
    echo  2. Paste the contents of fix-user-regions-permissions.sql
    echo  3. Execute the script
    goto :error
)

echo.
echo Permissions fix completed successfully!
echo.
goto :eof

:error
echo.
echo Fix failed. Please check the error messages above.
exit /b 1

:eof
echo Operation completed.
exit /b 0 