-- Diagnostic script to check for issues with farmer profiles and organization membership
-- Run this to identify potential issues that could cause the "Failed to load farmer profiles" error

-- 1. Check for users without farmer profiles
SELECT 
  u.id AS user_id, 
  u.email,
  u.first_name,
  u.last_name,
  'User has no farmer profile' AS issue
FROM 
  users u
LEFT JOIN 
  farmer_profiles fp ON u.id = fp.user_id
WHERE 
  fp.id IS NULL;

-- 2. Check for orphaned farmer profiles (no corresponding user)
SELECT 
  fp.id AS farmer_profile_id,
  fp.user_id,
  fp.farm_name,
  'Farmer profile has no user' AS issue
FROM 
  farmer_profiles fp
LEFT JOIN 
  users u ON fp.user_id = u.id
WHERE 
  u.id IS NULL;

-- 3. Check for organization members without farmer profile
SELECT 
  om.id AS member_id,
  om.farmer_id,
  om.organization_id,
  om.status,
  'Member has no valid farmer profile' AS issue
FROM 
  organization_members om
LEFT JOIN 
  farmer_profiles fp ON om.farmer_id = fp.id
WHERE 
  fp.id IS NULL;

-- 4. Check for farmer profiles without user_id
SELECT 
  fp.id AS farmer_profile_id,
  fp.farm_name,
  'Farmer profile missing user_id' AS issue
FROM 
  farmer_profiles fp
WHERE 
  fp.user_id IS NULL;

-- 5. Check for membership inconsistencies
SELECT 
  fp.id AS farmer_profile_id,
  fp.user_id,
  fp.farm_name,
  o.id AS organization_id,
  o.name AS organization_name,
  'Farmer has organization_id set but no membership record' AS issue
FROM 
  farmer_profiles fp
JOIN 
  organizations o ON fp.organization_id = o.id
LEFT JOIN 
  organization_members om ON fp.id = om.farmer_id AND om.organization_id = o.id
WHERE 
  om.id IS NULL;

-- 6. Check for potential duplicated farmer profiles
SELECT 
  u.id AS user_id,
  u.email,
  COUNT(fp.id) AS profile_count,
  'User has multiple farmer profiles' AS issue
FROM 
  users u
JOIN 
  farmer_profiles fp ON u.id = fp.user_id
GROUP BY 
  u.id, u.email
HAVING 
  COUNT(fp.id) > 1; 