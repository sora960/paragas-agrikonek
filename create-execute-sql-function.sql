-- This script creates a function that allows executing SQL statements through an API endpoint
-- WARNING: Use with caution, as this can be a security risk if exposed with unrestricted access

-- Create the function if it doesn't exist
CREATE OR REPLACE FUNCTION execute_sql(sql text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER 
-- This runs with the permissions of the function creator (usually postgres)
AS $$
DECLARE
    result_json jsonb;
BEGIN
    -- Execute the SQL
    EXECUTE sql;
    
    -- Return a success message
    result_json := jsonb_build_object(
        'success', true,
        'message', 'SQL executed successfully',
        'timestamp', now()
    );
    
    RETURN result_json;
EXCEPTION
    WHEN OTHERS THEN
        -- Return error information
        result_json := jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'error_detail', SQLSTATE,
            'timestamp', now()
        );
        
        RETURN result_json;
END;
$$;

-- Grant execute permissions to authenticated users
-- This is needed for the API to work with authenticated users
GRANT EXECUTE ON FUNCTION execute_sql(text) TO authenticated;
GRANT EXECUTE ON FUNCTION execute_sql(text) TO anon;

-- Add a comment explaining what this function does
COMMENT ON FUNCTION execute_sql(text) IS 
'Executes a SQL statement passed as a parameter. 
CAUTION: This function has elevated permissions and can modify any table in the database.
Use with caution and consider removing in production environments or restricting access.'; 