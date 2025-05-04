@echo off
echo Checking table schema in Supabase...

REM Use the Supabase CLI to execute the SQL directly
supabase db execute -f check-schema.sql

echo If you don't have Supabase CLI installed, please install it with: npm install -g supabase
echo Or manually execute the SQL in check-schema.sql through the Supabase dashboard SQL editor. 