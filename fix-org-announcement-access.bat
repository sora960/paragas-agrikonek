@echo off
echo ===================================================================
echo      COMPLETE FIX FOR ORGANIZATION AND ANNOUNCEMENT ACCESS
echo ===================================================================
echo.
echo This script will fix ALL permissions issues related to:
echo  1. Organization members accessing their organization data
echo  2. Administrators creating announcements
echo  3. Members viewing announcements
echo.
echo It will:
echo  - Disable Row Level Security on key tables
echo  - Grant necessary permissions to all roles
echo  - Create secure SQL functions for data access
echo.
echo Press any key to continue or CTRL+C to cancel...
pause > nul

echo.
echo Executing comprehensive fixes...
echo.

REM First ensure the SQL file exists
if not exist "fix-all-org-issues.sql" (
  echo ERROR: fix-all-org-issues.sql file not found!
  echo Please make sure the file exists in the current directory.
  pause
  exit /b 1
)

REM Execute the SQL via psql if available or npm script
where psql >nul 2>nul
if %ERRORLEVEL% equ 0 (
  echo Found psql, attempting direct execution...
  
  set /p PGUSER=Enter database username: 
  set /p PGPASSWORD=Enter database password: 
  set /p PGHOST=Enter database host (default: localhost): 
  if "!PGHOST!"=="" set PGHOST=localhost
  set /p PGPORT=Enter database port (default: 5432): 
  if "!PGPORT!"=="" set PGPORT=5432
  set /p PGDATABASE=Enter database name: 
  
  psql -h %PGHOST% -p %PGPORT% -U %PGUSER% -d %PGDATABASE% -f fix-all-org-issues.sql
) else (
  echo psql not found, attempting to use Node.js helper...
  
  REM Check if Node.js is available
  where node >nul 2>nul
  if %ERRORLEVEL% equ 0 (
    echo Found Node.js, using helper script...
    
    REM Create a temporary script to run the SQL
    echo const fs = require('fs'); > run-fix.js
    echo const { createClient } = require('@supabase/supabase-js'); >> run-fix.js
    echo // Get connection parameters >> run-fix.js
    echo const supabaseUrl = process.env.SUPABASE_URL || prompt('Enter Supabase URL: '); >> run-fix.js
    echo const supabaseKey = process.env.SUPABASE_KEY || prompt('Enter Supabase service/anon key: '); >> run-fix.js
    echo. >> run-fix.js
    echo // Create client >> run-fix.js
    echo const supabase = createClient(supabaseUrl, supabaseKey); >> run-fix.js
    echo. >> run-fix.js
    echo // Read and execute SQL >> run-fix.js
    echo const sql = fs.readFileSync('fix-all-org-issues.sql', 'utf8'); >> run-fix.js
    echo console.log('Executing SQL...'); >> run-fix.js
    echo supabase.rpc('execute_sql', { sql_query: sql }) >> run-fix.js
    echo   .then(({ data, error }) => { >> run-fix.js
    echo     if (error) { >> run-fix.js
    echo       console.error('Error executing SQL:', error); >> run-fix.js
    echo       console.log('Try executing the SQL directly in the Supabase dashboard SQL editor.'); >> run-fix.js
    echo     } else { >> run-fix.js
    echo       console.log('SQL executed successfully!'); >> run-fix.js
    echo     } >> run-fix.js
    echo   }) >> run-fix.js
    echo   .catch(err => { >> run-fix.js
    echo     console.error('Error:', err); >> run-fix.js
    echo   }); >> run-fix.js
    
    REM Run the temporary script
    node run-fix.js
    
    REM Clean up
    del run-fix.js
  ) else (
    echo Neither psql nor Node.js found. Please run the SQL manually:
    echo 1. Open the Supabase dashboard
    echo 2. Go to the SQL Editor
    echo 3. Copy and paste the contents of fix-all-org-issues.sql
    echo 4. Execute the SQL
  )
)

echo.
echo ===================================================================
echo If the script completed successfully:
echo 1. Restart your application
echo 2. Try accessing the organization announcements page
echo.
echo If you still see errors, please try running the SQL directly in the
echo Supabase SQL Editor using the fix-all-org-issues.sql file.
echo ===================================================================
echo.
echo Fix attempt completed.
pause 