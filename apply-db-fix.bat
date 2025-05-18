@echo off
echo ===================================
echo Fix Database Permissions and Functions
echo ===================================
echo.

set /p SERVICE_KEY="Enter your Supabase service role key: "
set /p SUPABASE_URL="Enter your Supabase URL [https://supabase.eztechsolutions.pro]: "

if "%SUPABASE_URL%"=="" set SUPABASE_URL=https://supabase.eztechsolutions.pro

echo.
echo Applying database fixes one by one...
echo.

echo Step 1: Fixing region_budgets table...
curl -X POST "%SUPABASE_URL%/rest/v1/rpc/execute_sql" ^
  -H "apikey: %SERVICE_KEY%" ^
  -H "Authorization: Bearer %SERVICE_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"sql_query\": \"ALTER TABLE public.region_budgets DISABLE ROW LEVEL SECURITY; GRANT ALL ON public.region_budgets TO authenticated; GRANT ALL ON public.region_budgets TO anon;\"}"

echo.
echo Step 2: Fixing organization_budgets table...
curl -X POST "%SUPABASE_URL%/rest/v1/rpc/execute_sql" ^
  -H "apikey: %SERVICE_KEY%" ^
  -H "Authorization: Bearer %SERVICE_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"sql_query\": \"ALTER TABLE public.organization_budgets DISABLE ROW LEVEL SECURITY; GRANT ALL ON public.organization_budgets TO authenticated; GRANT ALL ON public.organization_budgets TO anon;\"}"

echo.
echo Step 3: Fixing user_regions table...
curl -X POST "%SUPABASE_URL%/rest/v1/rpc/execute_sql" ^
  -H "apikey: %SERVICE_KEY%" ^
  -H "Authorization: Bearer %SERVICE_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"sql_query\": \"ALTER TABLE public.user_regions DISABLE ROW LEVEL SECURITY; GRANT ALL ON public.user_regions TO authenticated; GRANT ALL ON public.user_regions TO anon;\"}"

echo.
echo Step 4: Creating assign_regional_admin function...
curl -X POST "%SUPABASE_URL%/rest/v1/rpc/execute_sql" ^
  -H "apikey: %SERVICE_KEY%" ^
  -H "Authorization: Bearer %SERVICE_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"sql_query\": \"CREATE OR REPLACE FUNCTION public.assign_regional_admin(p_user_id UUID, p_region_id UUID) RETURNS JSONB AS $BODY$ DECLARE v_exists BOOLEAN; v_result JSONB; BEGIN SELECT EXISTS(SELECT 1 FROM public.user_regions WHERE user_id = p_user_id AND region_id = p_region_id) INTO v_exists; IF NOT v_exists THEN INSERT INTO public.user_regions (user_id, region_id, created_at) VALUES (p_user_id, p_region_id, NOW()); UPDATE public.users SET role = 'regional_admin', updated_at = NOW() WHERE id = p_user_id AND role NOT IN ('regional_admin', 'superadmin'); v_result = json_build_object('success', TRUE, 'message', 'User successfully assigned as regional admin', 'data', json_build_object('user_id', p_user_id, 'region_id', p_region_id)); ELSE v_result = json_build_object('success', TRUE, 'message', 'User is already assigned to this region', 'data', json_build_object('user_id', p_user_id, 'region_id', p_region_id)); END IF; RETURN v_result; END; $BODY$ LANGUAGE plpgsql SECURITY DEFINER;\"}"

echo.
echo Step 5: Granting permission on assign_regional_admin...
curl -X POST "%SUPABASE_URL%/rest/v1/rpc/execute_sql" ^
  -H "apikey: %SERVICE_KEY%" ^
  -H "Authorization: Bearer %SERVICE_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"sql_query\": \"GRANT EXECUTE ON FUNCTION public.assign_regional_admin TO authenticated;\"}"

echo.
echo Step 6: Creating admin_assign_regional_admin alias function...
curl -X POST "%SUPABASE_URL%/rest/v1/rpc/execute_sql" ^
  -H "apikey: %SERVICE_KEY%" ^
  -H "Authorization: Bearer %SERVICE_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"sql_query\": \"CREATE OR REPLACE FUNCTION public.admin_assign_regional_admin(p_user_id UUID, p_region_id UUID) RETURNS JSONB AS $BODY$ BEGIN RETURN public.assign_regional_admin(p_user_id, p_region_id); END; $BODY$ LANGUAGE plpgsql SECURITY DEFINER;\"}"

echo.
echo Step 7: Granting permission on admin_assign_regional_admin...
curl -X POST "%SUPABASE_URL%/rest/v1/rpc/execute_sql" ^
  -H "apikey: %SERVICE_KEY%" ^
  -H "Authorization: Bearer %SERVICE_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"sql_query\": \"GRANT EXECUTE ON FUNCTION public.admin_assign_regional_admin TO authenticated;\"}"

echo.
echo Database fixes complete!
echo.
echo Please refresh your application to see if the issue is resolved.
echo.
echo If you still encounter issues, please run the SQL script fix-database-permissions.sql
echo directly in the Supabase SQL Editor.
pause 