-- Add application fields to organization_members table

-- First check if the application_reason column exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'organization_members'
                  AND column_name = 'application_reason') THEN
    ALTER TABLE public.organization_members ADD COLUMN application_reason TEXT;
    RAISE NOTICE 'Added application_reason column to organization_members table';
  END IF;
END $$;

-- Check if the experience_level column exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'organization_members'
                  AND column_name = 'experience_level') THEN
    ALTER TABLE public.organization_members ADD COLUMN experience_level TEXT;
    RAISE NOTICE 'Added experience_level column to organization_members table';
  END IF;
END $$;

-- Check if the has_previous_organizations column exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'organization_members'
                  AND column_name = 'has_previous_organizations') THEN
    ALTER TABLE public.organization_members ADD COLUMN has_previous_organizations BOOLEAN DEFAULT false;
    RAISE NOTICE 'Added has_previous_organizations column to organization_members table';
  END IF;
END $$;

-- Check if the previous_organizations column exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'organization_members'
                  AND column_name = 'previous_organizations') THEN
    ALTER TABLE public.organization_members ADD COLUMN previous_organizations TEXT;
    RAISE NOTICE 'Added previous_organizations column to organization_members table';
  END IF;
END $$;

-- Check if the farm_description column exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'organization_members'
                  AND column_name = 'farm_description') THEN
    ALTER TABLE public.organization_members ADD COLUMN farm_description TEXT;
    RAISE NOTICE 'Added farm_description column to organization_members table';
  END IF;
END $$; 