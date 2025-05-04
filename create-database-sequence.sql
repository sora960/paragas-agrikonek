-- This script creates all necessary tables in the correct order

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 1: Create base tables with no foreign key dependencies

-- Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Grant permissions on organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for all users" 
  ON public.organizations FOR ALL 
  USING (true) 
  WITH CHECK (true);
GRANT ALL ON public.organizations TO anon, authenticated;

-- Create island_groups table
CREATE TABLE IF NOT EXISTS public.island_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Grant permissions on island_groups
ALTER TABLE public.island_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for all users" 
  ON public.island_groups FOR ALL 
  USING (true) 
  WITH CHECK (true);
GRANT ALL ON public.island_groups TO anon, authenticated;

-- Insert sample island groups
INSERT INTO public.island_groups (name) 
VALUES ('Luzon'), ('Visayas'), ('Mindanao')
ON CONFLICT DO NOTHING;

-- Step 2: Create tables with simple foreign key dependencies

-- Create provinces table
CREATE TABLE IF NOT EXISTS public.provinces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  island_group_id UUID REFERENCES public.island_groups(id),
  name TEXT NOT NULL,
  code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Grant permissions on provinces
ALTER TABLE public.provinces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for all users" 
  ON public.provinces FOR ALL 
  USING (true) 
  WITH CHECK (true);
GRANT ALL ON public.provinces TO anon, authenticated;

-- Insert sample province
INSERT INTO public.provinces (island_group_id, name, code)
SELECT id, 'Metro Manila', 'NCR' FROM public.island_groups WHERE name = 'Luzon'
ON CONFLICT DO NOTHING;

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('farmer', 'org_admin', 'regional_admin', 'superadmin')),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Grant permissions on users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for all users" 
  ON public.users FOR ALL 
  USING (true) 
  WITH CHECK (true);
GRANT ALL ON public.users TO anon, authenticated;

-- Insert sample user
INSERT INTO public.users (email, first_name, last_name, role)
VALUES ('test@example.com', 'Test', 'User', 'farmer')
ON CONFLICT DO NOTHING;

-- Step 3: Create tables that depend on the above tables

-- Create user_credentials table
CREATE TABLE IF NOT EXISTS public.user_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Grant permissions on user_credentials
ALTER TABLE public.user_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for all users" 
  ON public.user_credentials FOR ALL 
  USING (true) 
  WITH CHECK (true);
GRANT ALL ON public.user_credentials TO anon, authenticated;

-- Create farmer_profiles table
CREATE TABLE IF NOT EXISTS public.farmer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  province_id UUID REFERENCES public.provinces(id) ON DELETE SET NULL,
  farm_name VARCHAR(100) NOT NULL,
  farm_size DECIMAL(10, 2) NOT NULL,
  farm_address TEXT NOT NULL,
  years_of_experience INTEGER DEFAULT 0,
  main_crops TEXT[],
  farm_type VARCHAR(50) CHECK (farm_type IN ('small', 'medium', 'large', 'commercial')),
  certification_status VARCHAR(50) DEFAULT 'none' CHECK (certification_status IN ('none', 'pending', 'certified', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grant permissions on farmer_profiles
ALTER TABLE public.farmer_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for all users" 
  ON public.farmer_profiles FOR ALL 
  USING (true) 
  WITH CHECK (true);
GRANT ALL ON public.farmer_profiles TO anon, authenticated;

-- Grant schema usage to all roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Verify tables were created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN (
  'organizations', 
  'island_groups', 
  'provinces', 
  'users', 
  'user_credentials',
  'farmer_profiles'
); 