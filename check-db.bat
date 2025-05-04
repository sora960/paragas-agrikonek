@echo off
echo Checking database tables in Supabase...

REM List tables
supabase db tables

echo.
echo To inspect the provinces table, open the SQL editor in Supabase dashboard and run:
echo SELECT * FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'provinces'; 