-- Script to check and fix organization_members table

-- First, check if the table exists
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