-- Simplified view for region_admins that handles text region IDs
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
  COALESCE(SPLIT_PART(ur.region_id, '-', 1), '') as island_group,
  COALESCE(SPLIT_PART(ur.region_id, '-', 2), '') as region_code,
  CASE
    WHEN ur.region_id LIKE 'luzon-%' THEN 'Luzon'
    WHEN ur.region_id LIKE 'visayas-%' THEN 'Visayas'
    WHEN ur.region_id LIKE 'mindanao-%' THEN 'Mindanao'
    ELSE ''
  END as island_name,
  CASE
    WHEN ur.region_id LIKE '%-R1' THEN 'Region I – Ilocos Region'
    WHEN ur.region_id LIKE '%-R2' THEN 'Region II – Cagayan Valley'
    WHEN ur.region_id LIKE '%-R3' THEN 'Region III – Central Luzon'
    WHEN ur.region_id LIKE '%-R4A' THEN 'Region IV-A – CALABARZON'
    WHEN ur.region_id LIKE '%-R4B' THEN 'Region IV-B – MIMAROPA'
    WHEN ur.region_id LIKE '%-R5' THEN 'Region V – Bicol Region'
    WHEN ur.region_id LIKE '%-R6' THEN 'Region VI – Western Visayas'
    WHEN ur.region_id LIKE '%-R7' THEN 'Region VII – Central Visayas'
    WHEN ur.region_id LIKE '%-R8' THEN 'Region VIII – Eastern Visayas'
    WHEN ur.region_id LIKE '%-R9' THEN 'Region IX – Zamboanga Peninsula'
    WHEN ur.region_id LIKE '%-R10' THEN 'Region X – Northern Mindanao'
    WHEN ur.region_id LIKE '%-R11' THEN 'Region XI – Davao Region'
    WHEN ur.region_id LIKE '%-R12' THEN 'Region XII – SOCCSKSARGEN'
    WHEN ur.region_id LIKE '%-R13' THEN 'Region XIII – Caraga'
    WHEN ur.region_id LIKE '%-NCR' THEN 'National Capital Region (NCR)'
    WHEN ur.region_id LIKE '%-CAR' THEN 'Cordillera Administrative Region (CAR)'
    WHEN ur.region_id LIKE '%-BARMM' THEN 'Bangsamoro Autonomous Region in Muslim Mindanao (BARMM)'
    ELSE ''
  END as region_name
FROM 
  public.users u
JOIN 
  public.user_regions ur ON u.id = ur.user_id
WHERE 
  u.role = 'regional_admin';

-- Grant permissions on the view
GRANT SELECT ON public.region_admins TO anon, authenticated; 