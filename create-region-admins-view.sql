-- Create a view for regional admins that combines users and user_regions tables
CREATE OR REPLACE VIEW public.region_admins AS
SELECT 
  u.id,
  u.first_name,
  u.last_name,
  u.email,
  u.status,
  u.created_at,
  u.updated_at,
  ur.region_id,
  r.code as region_code,
  r.name as region_name
FROM 
  public.users u
JOIN 
  public.user_regions ur ON u.id = ur.user_id
LEFT JOIN
  public.regions r ON ur.region_id = r.id
WHERE 
  u.role = 'regional_admin';

-- Grant permissions on the view
GRANT SELECT ON public.region_admins TO anon, authenticated; 