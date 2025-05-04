-- This script creates a superadmin user account

-- Insert superadmin user
INSERT INTO public.users (
  email, 
  first_name, 
  last_name, 
  role, 
  status
)
VALUES (
  'admin@agrikonek.com', 
  'Super', 
  'Admin', 
  'superadmin', 
  'active'
)
ON CONFLICT (email) DO UPDATE
SET role = 'superadmin', status = 'active'
RETURNING id;

-- Insert credentials for the superadmin user
-- In a real production system, this password would be hashed
WITH admin_user AS (
  SELECT id FROM public.users WHERE email = 'admin@agrikonek.com'
)
INSERT INTO public.user_credentials (
  user_id,
  password_hash
)
SELECT 
  id,
  'admin123' -- This would normally be hashed
FROM admin_user
ON CONFLICT DO NOTHING;

-- Verify the superadmin was created
SELECT 
  u.id, 
  u.email, 
  u.first_name, 
  u.last_name, 
  u.role, 
  uc.password_hash
FROM 
  public.users u
  LEFT JOIN public.user_credentials uc ON u.id = uc.user_id
WHERE 
  u.email = 'admin@agrikonek.com'; 