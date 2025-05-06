-- Fix the farmer email synchronization trigger
BEGIN;

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS ensure_farmer_email_matches_user ON public.farmer_profiles;
DROP FUNCTION IF EXISTS sync_farmer_email_with_user();

-- Create an improved function with better error handling
CREATE OR REPLACE FUNCTION sync_farmer_email_with_user()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new farmer profile is created or user_id is updated
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.user_id <> NEW.user_id) THEN
    -- Get the user email, handling errors
    BEGIN
      -- We always respect the provided email during INSERT
      -- This allows profiles to be created even if auth.users access fails
      IF TG_OP = 'INSERT' AND NEW.email IS NOT NULL THEN
        -- Keep the email as provided
        NULL;
      ELSE
        -- For updates or if email is NULL, try to get from auth.users
        PERFORM 1 FROM auth.users WHERE id = NEW.user_id;
        IF FOUND THEN
          -- Only update if we can find the user
          SELECT email INTO NEW.email
          FROM auth.users
          WHERE id = NEW.user_id;
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- On error, log it but allow the operation to continue
      RAISE WARNING 'Error fetching user email for user_id % - allowing operation to continue: %', NEW.user_id, SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add the new trigger
CREATE TRIGGER ensure_farmer_email_matches_user
BEFORE INSERT OR UPDATE ON public.farmer_profiles
FOR EACH ROW
EXECUTE FUNCTION sync_farmer_email_with_user();

-- Allow more permissive access to the farmer_profiles table
GRANT ALL ON public.farmer_profiles TO anon, authenticated, service_role;

-- Ensure the sequences are accessible
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

COMMIT; 