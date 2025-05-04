-- Update organizations table to ensure it has all required fields

DO $$
BEGIN
  -- Add island_group_id if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'organizations'
    AND column_name = 'island_group_id'
  ) THEN
    ALTER TABLE public.organizations ADD COLUMN island_group_id UUID REFERENCES public.island_groups(id);
    RAISE NOTICE 'Added island_group_id column to organizations table';
  END IF;

  -- Add province_id if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'organizations'
    AND column_name = 'province_id'
  ) THEN
    ALTER TABLE public.organizations ADD COLUMN province_id UUID REFERENCES public.provinces(id);
    RAISE NOTICE 'Added province_id column to organizations table';
  END IF;

  -- Add registration_number if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'organizations'
    AND column_name = 'registration_number'
  ) THEN
    ALTER TABLE public.organizations ADD COLUMN registration_number TEXT;
    RAISE NOTICE 'Added registration_number column to organizations table';
  END IF;

  -- Add address if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'organizations'
    AND column_name = 'address'
  ) THEN
    ALTER TABLE public.organizations ADD COLUMN address TEXT;
    RAISE NOTICE 'Added address column to organizations table';
  END IF;

  -- Add contact_person if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'organizations'
    AND column_name = 'contact_person'
  ) THEN
    ALTER TABLE public.organizations ADD COLUMN contact_person TEXT;
    RAISE NOTICE 'Added contact_person column to organizations table';
  END IF;

  -- Add contact_email if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'organizations'
    AND column_name = 'contact_email'
  ) THEN
    ALTER TABLE public.organizations ADD COLUMN contact_email TEXT;
    RAISE NOTICE 'Added contact_email column to organizations table';
  END IF;

  -- Add contact_phone if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'organizations'
    AND column_name = 'contact_phone'
  ) THEN
    ALTER TABLE public.organizations ADD COLUMN contact_phone TEXT;
    RAISE NOTICE 'Added contact_phone column to organizations table';
  END IF;

  -- Add status with check constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'organizations'
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.organizations ADD COLUMN status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive'));
    RAISE NOTICE 'Added status column to organizations table';
  END IF;

  -- Add member_count if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'organizations'
    AND column_name = 'member_count'
  ) THEN
    ALTER TABLE public.organizations ADD COLUMN member_count INTEGER DEFAULT 0;
    RAISE NOTICE 'Added member_count column to organizations table';
  END IF;

  -- Add allocated_budget if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'organizations'
    AND column_name = 'allocated_budget'
  ) THEN
    ALTER TABLE public.organizations ADD COLUMN allocated_budget DECIMAL(15,2) DEFAULT 0;
    RAISE NOTICE 'Added allocated_budget column to organizations table';
  END IF;

  -- Add utilized_budget if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'organizations'
    AND column_name = 'utilized_budget'
  ) THEN
    ALTER TABLE public.organizations ADD COLUMN utilized_budget DECIMAL(15,2) DEFAULT 0;
    RAISE NOTICE 'Added utilized_budget column to organizations table';
  END IF;
END
$$; 