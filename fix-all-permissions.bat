@echo off
echo ===================================
echo Fix All Database Permissions
echo ===================================
echo.

set /p SERVICE_KEY="Enter your Supabase service role key: "
set /p SUPABASE_URL="Enter your Supabase URL [https://supabase.eztechsolutions.pro]: "

if "%SUPABASE_URL%"=="" set SUPABASE_URL=https://supabase.eztechsolutions.pro

echo.
echo Disabling RLS for critical tables...
echo.

curl -X POST "%SUPABASE_URL%/rest/v1/rpc/execute_sql" ^
  -H "apikey: %SERVICE_KEY%" ^
  -H "Authorization: Bearer %SERVICE_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"sql_query\": \"ALTER TABLE region_budgets DISABLE ROW LEVEL SECURITY; GRANT ALL ON region_budgets TO authenticated; GRANT ALL ON region_budgets TO anon;\"}"

curl -X POST "%SUPABASE_URL%/rest/v1/rpc/execute_sql" ^
  -H "apikey: %SERVICE_KEY%" ^
  -H "Authorization: Bearer %SERVICE_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"sql_query\": \"ALTER TABLE organization_budgets DISABLE ROW LEVEL SECURITY; GRANT ALL ON organization_budgets TO authenticated; GRANT ALL ON organization_budgets TO anon;\"}"

curl -X POST "%SUPABASE_URL%/rest/v1/rpc/execute_sql" ^
  -H "apikey: %SERVICE_KEY%" ^
  -H "Authorization: Bearer %SERVICE_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"sql_query\": \"ALTER TABLE user_regions DISABLE ROW LEVEL SECURITY; GRANT ALL ON user_regions TO authenticated; GRANT ALL ON user_regions TO anon;\"}"

echo.
echo Creating or fixing the assign_regional_admin function...
echo.

curl -X POST "%SUPABASE_URL%/rest/v1/rpc/execute_sql" ^
  -H "apikey: %SERVICE_KEY%" ^
  -H "Authorization: Bearer %SERVICE_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"sql_query\": \"CREATE OR REPLACE FUNCTION public.assign_regional_admin(p_user_id UUID, p_region_id UUID) RETURNS JSONB AS $$ DECLARE v_exists BOOLEAN; v_result JSONB; BEGIN SELECT EXISTS(SELECT 1 FROM public.user_regions WHERE user_id = p_user_id AND region_id = p_region_id) INTO v_exists; IF NOT v_exists THEN INSERT INTO public.user_regions (user_id, region_id, created_at) VALUES (p_user_id, p_region_id, NOW()); UPDATE public.users SET role = 'regional_admin', updated_at = NOW() WHERE id = p_user_id AND role NOT IN ('regional_admin', 'superadmin'); v_result = json_build_object('success', TRUE, 'message', 'User successfully assigned as regional admin', 'data', json_build_object('user_id', p_user_id, 'region_id', p_region_id)); ELSE v_result = json_build_object('success', TRUE, 'message', 'User is already assigned to this region', 'data', json_build_object('user_id', p_user_id, 'region_id', p_region_id)); END IF; RETURN v_result; END; $$ LANGUAGE plpgsql SECURITY DEFINER;\"}"

curl -X POST "%SUPABASE_URL%/rest/v1/rpc/execute_sql" ^
  -H "apikey: %SERVICE_KEY%" ^
  -H "Authorization: Bearer %SERVICE_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"sql_query\": \"GRANT EXECUTE ON FUNCTION public.assign_regional_admin TO authenticated;\"}"

curl -X POST "%SUPABASE_URL%/rest/v1/rpc/execute_sql" ^
  -H "apikey: %SERVICE_KEY%" ^
  -H "Authorization: Bearer %SERVICE_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"sql_query\": \"CREATE OR REPLACE FUNCTION public.admin_assign_regional_admin(p_user_id UUID, p_region_id UUID) RETURNS JSONB AS $$ BEGIN RETURN public.assign_regional_admin(p_user_id, p_region_id); END; $$ LANGUAGE plpgsql SECURITY DEFINER;\"}"

curl -X POST "%SUPABASE_URL%/rest/v1/rpc/execute_sql" ^
  -H "apikey: %SERVICE_KEY%" ^
  -H "Authorization: Bearer %SERVICE_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"sql_query\": \"GRANT EXECUTE ON FUNCTION public.admin_assign_regional_admin TO authenticated;\"}"

echo.
echo All database permissions have been fixed.
echo.
echo Please refresh your application to see the changes.
pause 