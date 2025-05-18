-- This script fixes permissions for users and user_credentials tables

DO $$
BEGIN
  -- Fix users table permissions
  BEGIN
    -- Disable RLS on users table
    ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
    
    -- Create policy for users table if it doesn't exist
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
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error with users table: %', SQLERRM;
  END;

  -- Fix user_credentials table permissions
  BEGIN
    -- Check if table exists
    IF EXISTS (
      SELECT FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename = 'user_credentials'
    ) THEN
      -- Disable RLS
      ALTER TABLE public.user_credentials DISABLE ROW LEVEL SECURITY;
      
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
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error with user_credentials table: %', SQLERRM;
  END;

  -- Ensure schema usage permission is granted
  GRANT USAGE ON SCHEMA public TO anon, authenticated;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'General error: %', SQLERRM;
END
$$;

-- Verify policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive,
  roles
FROM pg_policies 
WHERE tablename IN ('users', 'user_credentials', 'todos')
ORDER BY tablename; 