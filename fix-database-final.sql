-- This script creates all necessary tables with proper error handling

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 1: Create base tables with no foreign key dependencies

-- Create organizations table
DO $$
BEGIN
  -- Create the organizations table if it doesn't exist
  CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Enable RLS
  ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
  
  -- Create policy if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'organizations' 
    AND policyname = 'Enable all access for all users'
  ) THEN
    CREATE POLICY "Enable all access for all users" 
      ON public.organizations FOR ALL 
      USING (true) 
      WITH CHECK (true);
  END IF;
  
  -- Grant permissions
  GRANT ALL ON public.organizations TO anon, authenticated;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error with organizations table: %', SQLERRM;
END
$$;

-- Create island_groups table
DO $$
BEGIN
  -- Create the island_groups table if it doesn't exist
  CREATE TABLE IF NOT EXISTS public.island_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Enable RLS
  ALTER TABLE public.island_groups ENABLE ROW LEVEL SECURITY;
  
  -- Create policy if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'island_groups' 
    AND policyname = 'Enable all access for all users'
  ) THEN
    CREATE POLICY "Enable all access for all users" 
      ON public.island_groups FOR ALL 
      USING (true) 
      WITH CHECK (true);
  END IF;
  
  -- Grant permissions
  GRANT ALL ON public.island_groups TO anon, authenticated;
  
  -- Insert sample island groups if they don't exist
  INSERT INTO public.island_groups (name) 
  VALUES ('Luzon'), ('Visayas'), ('Mindanao')
  ON CONFLICT DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error with island_groups table: %', SQLERRM;
END
$$;

-- Create provinces table
DO $$
BEGIN
  -- Create the provinces table if it doesn't exist
  CREATE TABLE IF NOT EXISTS public.provinces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    island_group_id UUID REFERENCES public.island_groups(id),
    name TEXT NOT NULL,
    code TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Enable RLS
  ALTER TABLE public.provinces ENABLE ROW LEVEL SECURITY;
  
  -- Create policy if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'provinces' 
    AND policyname = 'Enable all access for all users'
  ) THEN
    CREATE POLICY "Enable all access for all users" 
      ON public.provinces FOR ALL 
      USING (true) 
      WITH CHECK (true);
  END IF;
  
  -- Grant permissions
  GRANT ALL ON public.provinces TO anon, authenticated;
  
  -- Insert sample province if it doesn't exist
  INSERT INTO public.provinces (island_group_id, name, code)
  SELECT id, 'Metro Manila', 'NCR' FROM public.island_groups WHERE name = 'Luzon'
  ON CONFLICT DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error with provinces table: %', SQLERRM;
END
$$;

-- Create users table
DO $$
BEGIN
  -- Create the users table if it doesn't exist
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

  -- Enable RLS
  ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
  
  -- Create policy if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'users' 
    AND policyname = 'Enable all access for all users'
  ) THEN
    CREATE POLICY "Enable all access for all users" 
      ON public.users FOR ALL 
      USING (true) 
      WITH CHECK (true);
  END IF;
  
  -- Grant permissions
  GRANT ALL ON public.users TO anon, authenticated;
  
  -- Insert sample user if it doesn't exist
  INSERT INTO public.users (email, first_name, last_name, role)
  VALUES ('test@example.com', 'Test', 'User', 'farmer')
  ON CONFLICT DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error with users table: %', SQLERRM;
END
$$;

-- Create user_credentials table
DO $$
BEGIN
  -- Create the user_credentials table if it doesn't exist
  CREATE TABLE IF NOT EXISTS public.user_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Enable RLS
  ALTER TABLE public.user_credentials ENABLE ROW LEVEL SECURITY;
  
  -- Create policy if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'user_credentials' 
    AND policyname = 'Enable all access for all users'
  ) THEN
    CREATE POLICY "Enable all access for all users" 
      ON public.user_credentials FOR ALL 
      USING (true) 
      WITH CHECK (true);
  END IF;
  
  -- Grant permissions
  GRANT ALL ON public.user_credentials TO anon, authenticated;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error with user_credentials table: %', SQLERRM;
END
$$;

-- Create farmer_profiles table
DO $$
BEGIN
  -- Create the farmer_profiles table if it doesn't exist
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

  -- Enable RLS
  ALTER TABLE public.farmer_profiles ENABLE ROW LEVEL SECURITY;
  
  -- Create policy if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'farmer_profiles' 
    AND policyname = 'Enable all access for all users'
  ) THEN
    CREATE POLICY "Enable all access for all users" 
      ON public.farmer_profiles FOR ALL 
      USING (true) 
      WITH CHECK (true);
  END IF;
  
  -- Grant permissions
  GRANT ALL ON public.farmer_profiles TO anon, authenticated;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error with farmer_profiles table: %', SQLERRM;
END
$$;

-- Create field_reports table
DO $$
BEGIN
  -- Create the field_reports table if it doesn't exist
  CREATE TABLE IF NOT EXISTS public.field_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID REFERENCES public.farmer_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    report_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'approved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Enable RLS
  ALTER TABLE public.field_reports ENABLE ROW LEVEL SECURITY;
  
  -- Create policy if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'field_reports' 
    AND policyname = 'Enable all access for all users'
  ) THEN
    CREATE POLICY "Enable all access for all users" 
      ON public.field_reports FOR ALL 
      USING (true) 
      WITH CHECK (true);
  END IF;
  
  -- Grant permissions
  GRANT ALL ON public.field_reports TO anon, authenticated;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error with field_reports table: %', SQLERRM;
END
$$;

-- Create report_comments table
DO $$
BEGIN
  -- Create the report_comments table if it doesn't exist
  CREATE TABLE IF NOT EXISTS public.report_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES public.field_reports(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_comment_id UUID REFERENCES public.report_comments(id) ON DELETE CASCADE,
    is_internal BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Enable RLS
  ALTER TABLE public.report_comments ENABLE ROW LEVEL SECURITY;
  
  -- Create policy if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'report_comments' 
    AND policyname = 'Enable all access for all users'
  ) THEN
    CREATE POLICY "Enable all access for all users" 
      ON public.report_comments FOR ALL 
      USING (true) 
      WITH CHECK (true);
  END IF;
  
  -- Grant permissions
  GRANT ALL ON public.report_comments TO anon, authenticated;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error with report_comments table: %', SQLERRM;
END
$$;

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
  'farmer_profiles',
  'field_reports',
  'report_comments'
); 