-- Script to update farmer_profiles and organization_members tables
-- This combines fixes for both issues:
-- 1. Missing columns in farmer_profiles
-- 2. Non-existent or improperly configured organization_members table

-----------------------------------
-- PART 1: Fix farmer_profiles
-----------------------------------
DO $$
BEGIN
  -- First, check if the table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'farmer_profiles'
  ) THEN
    RAISE NOTICE 'farmer_profiles table does not exist, creating it';
    
    -- Create the table if it doesn't exist
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
  END IF;
  
  -- Make sure RLS is disabled
  ALTER TABLE public.farmer_profiles DISABLE ROW LEVEL SECURITY;

  -- Add missing columns for organization admin search
  -- Add full_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'farmer_profiles' AND column_name = 'full_name'
  ) THEN
    RAISE NOTICE 'Adding full_name column to farmer_profiles';
    ALTER TABLE public.farmer_profiles ADD COLUMN full_name VARCHAR(255);
    
    -- Update the full_name column based on users table
    UPDATE public.farmer_profiles fp
    SET full_name = COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')
    FROM public.users u
    WHERE fp.user_id = u.id;
  END IF;
  
  -- Add email column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'farmer_profiles' AND column_name = 'email'
  ) THEN
    RAISE NOTICE 'Adding email column to farmer_profiles';
    ALTER TABLE public.farmer_profiles ADD COLUMN email VARCHAR(255);
    
    -- Update the email column based on users table
    UPDATE public.farmer_profiles fp
    SET email = u.email
    FROM public.users u
    WHERE fp.user_id = u.id;
  END IF;
  
  -- Add phone column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'farmer_profiles' AND column_name = 'phone'
  ) THEN
    RAISE NOTICE 'Adding phone column to farmer_profiles';
    ALTER TABLE public.farmer_profiles ADD COLUMN phone VARCHAR(20);
    
    -- Update the phone column based on users table if there's a phone column
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'phone'
    ) THEN
      UPDATE public.farmer_profiles fp
      SET phone = u.phone
      FROM public.users u
      WHERE fp.user_id = u.id;
    END IF;
  END IF;
  
  -- Grant permissions
  GRANT ALL ON public.farmer_profiles TO anon, authenticated;
  
  RAISE NOTICE 'farmer_profiles table has been fixed and is ready for use';
END $$;

-----------------------------------
-- PART 2: Fix organization_members
-----------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'organization_members'
  ) THEN
    RAISE NOTICE 'Creating organization_members table as it does not exist';
    
    -- Create organization_members table
    CREATE TABLE IF NOT EXISTS public.organization_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
      farmer_id UUID REFERENCES public.farmer_profiles(id) ON DELETE CASCADE,
      role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('member', 'admin', 'manager')),
      status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
      join_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(organization_id, farmer_id)
    );
    
    -- Add indexes for performance
    CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON public.organization_members(organization_id);
    CREATE INDEX IF NOT EXISTS idx_organization_members_farmer_id ON public.organization_members(farmer_id);
    
    -- Disable RLS to allow direct access
    ALTER TABLE public.organization_members DISABLE ROW LEVEL SECURITY;
    
    -- Grant permissions
    GRANT ALL ON public.organization_members TO anon, authenticated;
  ELSE
    RAISE NOTICE 'organization_members table already exists, checking for RLS';
    
    -- Make sure RLS is disabled
    ALTER TABLE public.organization_members DISABLE ROW LEVEL SECURITY;
    
    -- Grant permissions
    GRANT ALL ON public.organization_members TO anon, authenticated;
  END IF;
END $$;

-- Notify completion
DO $$
BEGIN
  RAISE NOTICE 'All database updates have been applied successfully!';
END $$; 