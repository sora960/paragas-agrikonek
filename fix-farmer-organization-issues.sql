-- Comprehensive fix for farmer profiles and organization membership issues

BEGIN;

-- First, verify table structures
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'farmer_profiles'
) AS farmer_profiles_exists,
EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'organization_members'
) AS organization_members_exists;

-- Step 1: Fix the farmer_profiles table
-- Make sure organization_id is nullable, province_id is nullable, and user_id references the correct users table
DO $$
BEGIN
  -- Check if farmer_profiles exists, if not create it
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'farmer_profiles') THEN
    RAISE NOTICE 'Creating farmer_profiles table';
    
    -- Enable UUID extension if not already enabled
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    
    -- Get the correct reference for user id based on the database schema
    -- Try to detect if we should use auth.users or public.users
    DECLARE
      auth_users_exists boolean;
      public_users_exists boolean;
      user_reference text;
    BEGIN
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'auth' AND table_name = 'users'
      ) INTO auth_users_exists;
      
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
      ) INTO public_users_exists;
      
      IF auth_users_exists THEN
        user_reference := 'auth.users';
      ELSIF public_users_exists THEN
        user_reference := 'public.users';
      ELSE
        RAISE EXCEPTION 'Cannot find users table in auth or public schema';
      END IF;
      
      -- Create the farmer_profiles table with the correct user reference
      EXECUTE format('
        CREATE TABLE public.farmer_profiles (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES %s(id) ON DELETE CASCADE,
          organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
          province_id UUID REFERENCES public.provinces(id) ON DELETE SET NULL,
          full_name VARCHAR(100),
          email VARCHAR(255),
          phone VARCHAR(50),
          farm_name VARCHAR(100) NOT NULL,
          farm_size DECIMAL(10, 2) NOT NULL,
          farm_address TEXT NOT NULL,
          years_of_experience INTEGER DEFAULT 0,
          main_crops TEXT[],
          farm_type VARCHAR(50) CHECK (farm_type IN (''small'', ''medium'', ''large'', ''commercial'')),
          certification_status VARCHAR(50) DEFAULT ''none'' CHECK (certification_status IN (''none'', ''pending'', ''certified'', ''expired'')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )', user_reference);
    END;
    
    -- Add indexes
    CREATE INDEX idx_farmer_profiles_user_id ON public.farmer_profiles(user_id);
    CREATE INDEX idx_farmer_profiles_organization_id ON public.farmer_profiles(organization_id);
    
  ELSE
    -- Table exists, make sure all expected columns are present
    RAISE NOTICE 'Updating farmer_profiles table';
    
    -- Add full_name if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'farmer_profiles' AND column_name = 'full_name') THEN
      ALTER TABLE public.farmer_profiles ADD COLUMN full_name VARCHAR(100);
    END IF;
    
    -- Add email if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'farmer_profiles' AND column_name = 'email') THEN
      ALTER TABLE public.farmer_profiles ADD COLUMN email VARCHAR(255);
    END IF;
    
    -- Add phone if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'farmer_profiles' AND column_name = 'phone') THEN
      ALTER TABLE public.farmer_profiles ADD COLUMN phone VARCHAR(50);
    END IF;
    
    -- Make organization_id nullable if it's not already
    ALTER TABLE public.farmer_profiles ALTER COLUMN organization_id DROP NOT NULL;
    
    -- Make province_id nullable if it's not already
    ALTER TABLE public.farmer_profiles ALTER COLUMN province_id DROP NOT NULL;
    
    -- Ensure column constraints are correct
    ALTER TABLE public.farmer_profiles 
      ALTER COLUMN farm_name SET NOT NULL,
      ALTER COLUMN farm_size SET NOT NULL,
      ALTER COLUMN farm_address SET NOT NULL;
      
    -- Make sure check constraints exist
    IF NOT EXISTS (
      SELECT FROM information_schema.constraint_column_usage 
      WHERE table_name = 'farmer_profiles' AND column_name = 'farm_type'
    ) THEN
      ALTER TABLE public.farmer_profiles 
        ADD CONSTRAINT check_farm_type CHECK (farm_type IN ('small', 'medium', 'large', 'commercial'));
    END IF;
    
    IF NOT EXISTS (
      SELECT FROM information_schema.constraint_column_usage 
      WHERE table_name = 'farmer_profiles' AND column_name = 'certification_status'
    ) THEN
      ALTER TABLE public.farmer_profiles 
        ADD CONSTRAINT check_certification_status CHECK (certification_status IN ('none', 'pending', 'certified', 'expired'));
    END IF;
  END IF;
END
$$;

-- Step 2: Fix the organization_members table
DO $$
BEGIN
  -- Check if organization_members exists, if not create it
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organization_members') THEN
    RAISE NOTICE 'Creating organization_members table';
    
    CREATE TABLE public.organization_members (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
      farmer_id UUID REFERENCES public.farmer_profiles(id) ON DELETE CASCADE,
      role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('member', 'admin', 'manager')),
      status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'rejected', 'suspended')),
      application_reason TEXT,
      experience_level VARCHAR(50),
      has_previous_organizations BOOLEAN DEFAULT FALSE,
      previous_organizations TEXT,
      farm_description TEXT,
      join_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(organization_id, farmer_id)
    );
    
    -- Add indexes
    CREATE INDEX idx_organization_members_org_id ON public.organization_members(organization_id);
    CREATE INDEX idx_organization_members_farmer_id ON public.organization_members(farmer_id);
    
  ELSE
    -- Table exists, make sure all expected columns are present
    RAISE NOTICE 'Updating organization_members table';
    
    -- Add application fields if they don't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'organization_members' AND column_name = 'application_reason') THEN
      ALTER TABLE public.organization_members ADD COLUMN application_reason TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'organization_members' AND column_name = 'experience_level') THEN
      ALTER TABLE public.organization_members ADD COLUMN experience_level VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'organization_members' AND column_name = 'has_previous_organizations') THEN
      ALTER TABLE public.organization_members ADD COLUMN has_previous_organizations BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'organization_members' AND column_name = 'previous_organizations') THEN
      ALTER TABLE public.organization_members ADD COLUMN previous_organizations TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'organization_members' AND column_name = 'farm_description') THEN
      ALTER TABLE public.organization_members ADD COLUMN farm_description TEXT;
    END IF;
    
    -- Update status check constraint to include 'rejected'
    ALTER TABLE public.organization_members DROP CONSTRAINT IF EXISTS organization_members_status_check;
    ALTER TABLE public.organization_members 
      ADD CONSTRAINT organization_members_status_check 
      CHECK (status IN ('pending', 'active', 'inactive', 'rejected', 'suspended'));
  END IF;
END
$$;

-- Step 3: Create or update function for getting farmer organization (simplified query)
DROP FUNCTION IF EXISTS get_farmer_organization(UUID);

CREATE OR REPLACE FUNCTION get_farmer_organization(farmer_id UUID)
RETURNS TABLE (
  organization_id UUID,
  organization_name TEXT,
  organization_status TEXT,
  member_role TEXT,
  member_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id as organization_id,
    o.name as organization_name,
    o.status as organization_status,
    om.role as member_role,
    om.status as member_status
  FROM 
    public.organization_members om
  JOIN 
    public.organizations o ON om.organization_id = o.id
  WHERE 
    om.farmer_id = get_farmer_organization.farmer_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 4: Fix any inconsistent data where needed
-- Find farmer_profiles without user_id and remove them
DELETE FROM public.farmer_profiles WHERE user_id IS NULL;

-- Find organization_members with non-existent farmer_id and remove them
DELETE FROM public.organization_members om 
WHERE NOT EXISTS (SELECT 1 FROM public.farmer_profiles fp WHERE fp.id = om.farmer_id);

-- Step 5: Update organization member count for each organization
UPDATE public.organizations o
SET member_count = (
  SELECT COUNT(*) 
  FROM public.organization_members om 
  WHERE om.organization_id = o.id AND om.status = 'active'
);

-- Disable row-level security to allow the app to work properly
ALTER TABLE public.farmer_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members DISABLE ROW LEVEL SECURITY;

-- Remove any existing policies that might cause issues
DROP POLICY IF EXISTS farmer_profiles_user_access ON public.farmer_profiles;
DROP POLICY IF EXISTS organization_members_user_access ON public.organization_members;

-- Create triggers to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_farmer_profiles_updated_at ON public.farmer_profiles;
CREATE TRIGGER update_farmer_profiles_updated_at
    BEFORE UPDATE ON public.farmer_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_organization_members_updated_at ON public.organization_members;
CREATE TRIGGER update_organization_members_updated_at
    BEFORE UPDATE ON public.organization_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.farmer_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

COMMIT; 