@echo off
setlocal enabledelayedexpansion

echo ======================================================
echo     Farmer Email Synchronization Tool
echo ======================================================
echo.

REM Get connection info from environment or prompt the user
if "%PGHOST%"=="" (
  set /p PGHOST=Enter database host [supabase.eztechsolutions.pro]: 
  if "!PGHOST!"=="" set PGHOST=supabase.eztechsolutions.pro
)

if "%PGPORT%"=="" (
  set /p PGPORT=Enter database port [5432]: 
  if "!PGPORT!"=="" set PGPORT=5432
)

if "%PGUSER%"=="" (
  set /p PGUSER=Enter database username [postgres]: 
  if "!PGUSER!"=="" set PGUSER=postgres
)

if "%PGDATABASE%"=="" (
  set /p PGDATABASE=Enter database name [postgres]: 
  if "!PGDATABASE!"=="" set PGDATABASE=postgres
)

REM Prompt for password securely if not already provided
if "%PGPASSWORD%"=="" (
  set /p PGPASSWORD=Enter database password: 
)

echo.
echo Connecting to %PGHOST%:%PGPORT% as %PGUSER%...
echo.
echo Running Farmer Email Synchronization Script...
echo.

REM Run the script and capture the result
psql -h %PGHOST% -p %PGPORT% -U %PGUSER% -d %PGDATABASE% -f sync-farmer-emails.sql -L sync-farmer-emails.log

if %ERRORLEVEL% NEQ 0 (
  echo.
  echo ============= ERROR =============
  echo Script execution failed with error code %ERRORLEVEL%
  echo Please check sync-farmer-emails.log for details
  echo ==================================
) else (
  echo.
  echo ============= SUCCESS =============
  echo Script executed successfully!
  echo Check sync-farmer-emails.log for details
  echo =====================================
)

echo.
pause
endlocal 