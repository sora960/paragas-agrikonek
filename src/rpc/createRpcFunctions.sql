-- Function to assign a user as a regional admin
CREATE OR REPLACE FUNCTION assign_regional_admin(
  p_user_id UUID,
  p_region_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_exists BOOLEAN;
BEGIN
  -- Check if the assignment already exists
  SELECT EXISTS(
    SELECT 1 FROM user_regions
    WHERE user_id = p_user_id AND region_id = p_region_id
  ) INTO v_exists;
  
  -- If it doesn't exist, create it
  IF NOT v_exists THEN
    INSERT INTO user_regions (user_id, region_id, created_at)
    VALUES (p_user_id, p_region_id, NOW())
    RETURNING to_json(id) INTO v_result;
    
    -- Update the user's role to regional_admin if needed
    UPDATE users
    SET role = 'regional_admin',
        updated_at = NOW()
    WHERE id = p_user_id
    AND role NOT IN ('regional_admin', 'superadmin');
    
    RETURN json_build_object(
      'success', true,
      'message', 'User assigned as regional admin',
      'data', v_result
    );
  ELSE
    RETURN json_build_object(
      'success', true,
      'message', 'User was already assigned as regional admin for this region',
      'data', NULL
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Error: ' || SQLERRM,
      'data', NULL
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION assign_regional_admin(UUID, UUID) TO authenticated; 