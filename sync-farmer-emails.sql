-- Script to synchronize farmer_profiles emails with user accounts
-- This ensures that farmer_profiles.email always matches the user's email

BEGIN;

-- First check if the farmer_profiles table exists
DO $$
DECLARE
  user_table_schema TEXT := 'auth';
  user_table_name TEXT := 'users';
BEGIN
  -- First determine where the users table is located (might be auth.users or public.users)
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
      user_table_schema := 'public';
    ELSE
      RAISE NOTICE 'Could not find users table in auth or public schema';
      RETURN;
    END IF;
  END IF;
  
  RAISE NOTICE 'Found users table in %.% schema', user_table_schema, user_table_name;
  
  -- Check if farmer_profiles exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'farmer_profiles') THEN
    -- 1. Update all existing farmer profile emails to match their user emails
    EXECUTE format('
      UPDATE public.farmer_profiles fp
      SET email = u.email
      FROM %I.%I u
      WHERE fp.user_id = u.id AND (fp.email IS NULL OR fp.email <> u.email)
    ', user_table_schema, user_table_name);
    
    -- 2. Create a function to handle email synchronization
    EXECUTE format('
      CREATE OR REPLACE FUNCTION sync_farmer_email_with_user()
      RETURNS TRIGGER AS $func$
      DECLARE
        user_email TEXT;
      BEGIN
        -- When a new farmer profile is created or email is updated
        IF TG_OP = ''INSERT'' OR (TG_OP = ''UPDATE'' AND OLD.email <> NEW.email) THEN
          -- Get the user email
          SELECT email INTO user_email
          FROM %I.%I
          WHERE id = NEW.user_id;
          
          IF user_email IS NOT NULL THEN
            NEW.email := user_email;
          END IF;
        END IF;
        
        RETURN NEW;
      END;
      $func$ LANGUAGE plpgsql;
    ', user_table_schema, user_table_name);
    
    -- 3. Drop existing trigger if it exists
    DROP TRIGGER IF EXISTS ensure_farmer_email_matches_user ON public.farmer_profiles;
    
    -- 4. Create trigger to ensure email matches during inserts and updates
    CREATE TRIGGER ensure_farmer_email_matches_user
    BEFORE INSERT OR UPDATE ON public.farmer_profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_farmer_email_with_user();
    
    -- 5. Add a comment explaining the purpose of the trigger
    COMMENT ON TRIGGER ensure_farmer_email_matches_user ON public.farmer_profiles IS 
    'Ensures that farmer_profiles.email always matches the user''s email';
    
    -- Output success message
    RAISE NOTICE 'Successfully added email synchronization trigger for farmer profiles';
  ELSE
    RAISE NOTICE 'Table farmer_profiles does not exist - skipping trigger creation';
  END IF;
END
$$;

COMMIT; 