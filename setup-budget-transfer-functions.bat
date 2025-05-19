@echo off
echo Setting up budget transfer functions...

REM Get Supabase URL and Key from .env file if it exists
set SUPABASE_URL=
set SUPABASE_KEY=

if exist .env (
  for /f "tokens=2 delims==" %%a in ('findstr "VITE_SUPABASE_URL" .env') do set SUPABASE_URL=%%a
  for /f "tokens=2 delims==" %%a in ('findstr "VITE_SUPABASE_SERVICE_KEY" .env') do set SUPABASE_KEY=%%a
)

if "%SUPABASE_URL%"=="" (
  echo Please enter your Supabase URL:
  set /p SUPABASE_URL=
)

if "%SUPABASE_KEY%"=="" (
  echo Please enter your Supabase service role key:
  set /p SUPABASE_KEY=
)

echo Installing curl if not already available...
where curl >nul 2>&1 || (
  echo curl is not found. Please install curl and try again.
  exit /b 1
)

echo Running SQL to set up budget transfer functions...
curl -X POST ^
  "%SUPABASE_URL%/rest/v1/rpc/exec_sql" ^
  -H "apikey: %SUPABASE_KEY%" ^
  -H "Authorization: Bearer %SUPABASE_KEY%" ^
  -H "Content-Type: application/json" ^
  -H "Prefer: return=minimal" ^
  -d "{\"query\": \"$(type src\\sql\\farmer-budget-transaction-functions.sql)\"}"

if %ERRORLEVEL% NEQ 0 (
  echo Error executing SQL. Please check your Supabase URL and key.
  exit /b 1
)

echo Budget transfer functions set up successfully!
echo.
echo You can now approve/reject budget requests with automatic budget transfers.
pause 