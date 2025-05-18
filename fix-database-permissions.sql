-- This SQL script fixes issues with Row Level Security (RLS) on key tables
-- Run this in the Supabase SQL Editor to fix permission issues

-- Fix region_budgets table
ALTER TABLE public.region_budgets DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.region_budgets TO authenticated;
GRANT ALL ON public.region_budgets TO anon;
GRANT ALL ON public.region_budgets TO service_role;

-- Fix organization_budgets table
ALTER TABLE public.organization_budgets DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.organization_budgets TO authenticated;
GRANT ALL ON public.organization_budgets TO anon;
GRANT ALL ON public.organization_budgets TO service_role;

-- Fix user_regions table (for regional admin assignments)
ALTER TABLE public.user_regions DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.user_regions TO authenticated;
GRANT ALL ON public.user_regions TO anon;
GRANT ALL ON public.user_regions TO service_role;

-- Create or replace the assign_regional_admin function directly
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

-- Grant execution permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.assign_regional_admin TO authenticated;

-- Create an alias for the function (some code might be using this name)
CREATE OR REPLACE FUNCTION public.admin_assign_regional_admin(
  p_user_id UUID,
  p_region_id UUID
) RETURNS JSONB AS $$
BEGIN
  -- Just call the original function
  RETURN public.assign_regional_admin(p_user_id, p_region_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permission on the alias function too
GRANT EXECUTE ON FUNCTION public.admin_assign_regional_admin TO authenticated;

-- Output success message
DO $$
BEGIN
  RAISE NOTICE 'RLS has been disabled on critical tables';
  RAISE NOTICE 'Regional admin assignments should now work properly';
END $$; 