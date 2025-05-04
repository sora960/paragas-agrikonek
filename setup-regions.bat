@echo off
echo Running region management initialization script...

REM Save the SQL to a temporary file
echo Creating temporary SQL file...
copy initialize-regions.sql regions_temp.sql

REM Use the Supabase CLI to execute the SQL directly
echo Executing SQL script against Supabase...
supabase db execute -f regions_temp.sql

REM Delete the temporary file
echo Cleaning up...
del regions_temp.sql

echo Region management initialization completed.
echo If you don't have Supabase CLI installed, please install it with: npm install -g supabase
echo Or manually execute the SQL in initialize-regions.sql through the Supabase dashboard SQL editor. 