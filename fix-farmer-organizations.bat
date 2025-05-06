@echo off
echo ===============================================
echo   FARMER ORGANIZATION FIX SCRIPT 
echo ===============================================
echo.
echo This script will fix farmer profiles and organization membership issues.
echo.
echo Prerequisites:
echo - Node.js installed
echo - Supabase CLI installed
echo - Supabase project credentials configured
echo.
echo Press Ctrl+C to cancel, or
pause

echo.
echo Running fix script...
echo.

:: Create a temporary JS file
echo const { execSync } = require('child_process'); > fix-script-temp.js
echo const fs = require('fs'); >> fix-script-temp.js
echo const path = require('path'); >> fix-script-temp.js
echo. >> fix-script-temp.js
echo // Read the SQL file >> fix-script-temp.js
echo const sqlFile = path.join(__dirname, 'fix-farmer-organization-issues.sql'); >> fix-script-temp.js
echo const sql = fs.readFileSync(sqlFile, 'utf8'); >> fix-script-temp.js
echo. >> fix-script-temp.js
echo try { >> fix-script-temp.js
echo   // Run the SQL command using Supabase CLI >> fix-script-temp.js
echo   console.log('Applying database fixes...'); >> fix-script-temp.js
echo   execSync(`npx supabase db execute --file ${sqlFile}`, { stdio: 'inherit' }); >> fix-script-temp.js
echo. >> fix-script-temp.js  
echo   console.log('\nFix completed successfully!'); >> fix-script-temp.js
echo } catch (error) { >> fix-script-temp.js
echo   console.error('\nError occurred:', error.message); >> fix-script-temp.js
echo   process.exit(1); >> fix-script-temp.js
echo } >> fix-script-temp.js

:: Run the script
node fix-script-temp.js

:: Clean up
del fix-script-temp.js

echo.
if %ERRORLEVEL% EQU 0 (
  echo ---------------------------------------------
  echo   FIX COMPLETED SUCCESSFULLY
  echo ---------------------------------------------
  echo.
  echo Farmer profiles and organization membership have been fixed.
) else (
  echo ---------------------------------------------
  echo   ERROR OCCURRED
  echo ---------------------------------------------
  echo.
  echo Please check the error message above for details.
)

echo.
pause 