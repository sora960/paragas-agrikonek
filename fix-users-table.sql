
-- Check if users table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'users'
  ) THEN
    -- Create users table if it doesn't exist
    CREATE TABLE public.users (
      id UUID PRIMARY KEY, -- No foreign key constraint to auth.users
      email TEXT NOT NULL UNIQUE,
      first_name TEXT,
      last_name TEXT,
      role TEXT NOT NULL CHECK (role IN ('farmer', 'org_admin', 'regional_admin', 'superadmin')),
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  ELSE
    -- Drop the foreign key constraint if it exists
    DO $$
    BEGIN
      IF EXISTS (
        SELECT FROM information_schema.table_constraints
        WHERE constraint_name = 'users_id_fkey'
        AND table_schema = 'public'
        AND table_name = 'users'
      ) THEN
        ALTER TABLE public.users DROP CONSTRAINT users_id_fkey;
      END IF;
    END $$;
    
    -- Modify the role column to include the check constraint if it doesn't have one
    BEGIN
      ALTER TABLE public.users 
      DROP CONSTRAINT IF EXISTS users_role_check;
      
      ALTER TABLE public.users
      ADD CONSTRAINT users_role_check 
      CHECK (role IN ('farmer', 'org_admin', 'regional_admin', 'superadmin'));
    EXCEPTION WHEN OTHERS THEN
      -- If there's an error, it likely already has the constraint
      NULL;
    END;
  END IF;
END
$$;

-- Ensure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policy
DO $$
BEGIN
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
END
$$;

-- Grant appropriate permissions
GRANT ALL ON public.users TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Check if user_regions table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'user_regions'
  ) THEN
    -- Create user_regions table
    CREATE TABLE public.user_regions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES public.users(id),
      region_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, region_id)
    );
    
    ALTER TABLE public.user_regions ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Enable all access for all users" 
      ON public.user_regions FOR ALL 
      USING (true) 
      WITH CHECK (true);
      
    GRANT ALL ON public.user_regions TO anon, authenticated;
  END IF;
END
$$;

-- Check if user_credentials table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'user_credentials'
  ) THEN
    -- Create user_credentials table
    CREATE TABLE public.user_credentials (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    ALTER TABLE public.user_credentials ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Enable all access for all users" 
      ON public.user_credentials FOR ALL 
      USING (true) 
      WITH CHECK (true);
      
    GRANT ALL ON public.user_credentials TO anon, authenticated;
  END IF;
END
$$; 
