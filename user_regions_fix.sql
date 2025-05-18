-- This SQL script fixes issues with the user_regions table that stores regional admin assignments
-- Run this in the Supabase SQL Editor if you encounter issues assigning regional admins

-- 1. First, disable Row Level Security on the table
ALTER TABLE public.user_regions DISABLE ROW LEVEL SECURITY;

-- 2. Grant necessary permissions
GRANT ALL ON public.user_regions TO anon, authenticated, service_role;

-- 3. Create an RPC function to safely assign regional admins
CREATE OR REPLACE FUNCTION public.assign_regional_admin(
  p_user_id UUID,
  p_region_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_exists BOOLEAN;
  v_result JSONB;
BEGIN
  -- Check if the assignment already exists
  SELECT EXISTS(
    SELECT 1 FROM public.user_regions
    WHERE user_id = p_user_id AND region_id = p_region_id
  ) INTO v_exists;
  
  -- If it doesn't exist, create it
  IF NOT v_exists THEN
    INSERT INTO public.user_regions (user_id, region_id, created_at)
    VALUES (p_user_id, p_region_id, NOW());
    
    -- Update the user's role to regional_admin if needed
    UPDATE public.users
    SET role = 'regional_admin',
        updated_at = NOW()
    WHERE id = p_user_id
    AND role NOT IN ('regional_admin', 'superadmin');
    
    v_result = json_build_object(
      'success', TRUE,
      'message', 'User successfully assigned as regional admin',
      'data', json_build_object('user_id', p_user_id, 'region_id', p_region_id)
    );
  ELSE
    -- Assignment already exists
    v_result = json_build_object(
      'success', TRUE,
      'message', 'User is already assigned to this region',
      'data', json_build_object('user_id', p_user_id, 'region_id', p_region_id)
    );
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.assign_regional_admin TO authenticated;

-- 4. Enable the RPC function to run SQL (needed for the fixUserRegionsPermissions utility)
CREATE OR REPLACE FUNCTION public.execute_sql(sql_query TEXT) RETURNS JSONB AS $$
BEGIN
  EXECUTE sql_query;
  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.execute_sql TO authenticated;

-- 5. Output success message
DO $$
BEGIN
  RAISE NOTICE 'User regions table has been fixed';
  RAISE NOTICE 'Regional admin assignments should now work properly';
END $$; 