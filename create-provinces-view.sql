-- First ensure the provinces table exists
CREATE TABLE IF NOT EXISTS public.provinces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  region_id TEXT NOT NULL,
  farmers_count INT DEFAULT 0,
  organizations_count INT DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert sample provinces for Region I (Ilocos Region) if table is empty
INSERT INTO public.provinces (name, region_id, status)
SELECT name, region_id, status
FROM (VALUES
  ('Ilocos Norte', 'luzon-R1', 'pending'),
  ('Ilocos Sur', 'luzon-R1', 'pending'),
  ('La Union', 'luzon-R1', 'pending'),
  ('Pangasinan', 'luzon-R1', 'pending')
) AS data(name, region_id, status)
WHERE NOT EXISTS (SELECT 1 FROM public.provinces LIMIT 1);

-- Enable RLS
ALTER TABLE public.provinces ENABLE ROW LEVEL SECURITY;

-- Create policy if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'provinces' 
    AND schemaname = 'public'
    AND policyname = 'Enable all access for all users'
  ) THEN
    CREATE POLICY "Enable all access for all users" 
      ON public.provinces FOR ALL 
      USING (true) 
      WITH CHECK (true);
  END IF;
END
$$;

-- Grant permissions
GRANT ALL ON public.provinces TO anon, authenticated;

-- Now create the view with proper type casting
CREATE OR REPLACE VIEW public.provinces_view AS
WITH region_administrators AS (
  SELECT 
    ur.region_id,
    CONCAT(u.first_name, ' ', u.last_name) as admin_name,
    u.id as admin_id,
    u.email as admin_email
  FROM 
    public.user_regions ur
  JOIN 
    public.users u ON ur.user_id = u.id
  WHERE 
    u.role = 'regional_admin'
)
SELECT 
  p.id,
  p.name,
  p.region_id,
  -- Extract region name from region_id
  CASE
    WHEN p.region_id LIKE 'luzon-%' THEN SUBSTRING(p.region_id FROM 7) || ' - Luzon Region'
    WHEN p.region_id LIKE 'visayas-%' THEN SUBSTRING(p.region_id FROM 9) || ' - Visayas Region'
    WHEN p.region_id LIKE 'mindanao-%' THEN SUBSTRING(p.region_id FROM 10) || ' - Mindanao Region'
    ELSE p.region_id
  END as region_name,
  SUBSTRING(p.region_id FROM POSITION('-' IN p.region_id) + 1) as region_code,
  COALESCE(ra.admin_name, 'Unassigned') as regional_admin,
  ra.admin_id as admin_id,
  COALESCE(ra.admin_email, '') as admin_email,
  p.farmers_count as farmers,
  p.organizations_count as organizations,
  p.status,
  p.created_at,
  p.updated_at
FROM 
  public.provinces p
LEFT JOIN 
  region_administrators ra ON SUBSTRING(p.region_id FROM POSITION('-' IN p.region_id) + 1) = ra.region_id;

-- Grant permissions on the view
GRANT SELECT ON public.provinces_view TO anon, authenticated; 