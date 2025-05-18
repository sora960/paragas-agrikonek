-- Create admin organization functions
BEGIN;

-- Create function to get an admin's organization
CREATE OR REPLACE FUNCTION get_admin_organization(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  member_count INTEGER,
  logo_url TEXT,
  status TEXT,
  region_id UUID,
  is_admin BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    o.description,
    o.created_at,
    o.updated_at,
    o.member_count,
    o.logo_url,
    o.status,
    o.region_id,
    TRUE as is_admin
  FROM 
    organizations o
  JOIN 
    organization_admins oa ON o.id = oa.organization_id
  WHERE 
    oa.user_id = p_user_id
  LIMIT 1;
END;
$$;

-- Create admin_execute_sql function for privileged operations without restrictions
CREATE OR REPLACE FUNCTION admin_execute_sql(sql_query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Execute the query and return results directly
  EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || sql_query || ') t' INTO result;
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', SQLERRM,
      'detail', SQLSTATE,
      'query', sql_query
    );
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION get_admin_organization TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION admin_execute_sql TO anon, authenticated, service_role;

COMMIT; 