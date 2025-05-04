-- Function to execute arbitrary SQL
-- This allows us to execute SQL directly from the client side
-- IMPORTANT: This function has administrator privileges, use with caution

-- Create the function with security definer (runs with owner's privileges)
CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- This makes the function run with the privileges of the creator
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Execute the provided SQL query
  EXECUTE sql_query;
  
  -- Return success message
  result := '{"status": "success"}'::JSONB;
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  -- If there's an error, return the error details
  result := jsonb_build_object(
    'status', 'error',
    'message', SQLERRM,
    'code', SQLSTATE
  );
  RETURN result;
END;
$$;

-- Grant execute permission to anonymous and authenticated users
-- This ensures the function can be called through the Supabase API
GRANT EXECUTE ON FUNCTION execute_sql(TEXT) TO anon, authenticated; 