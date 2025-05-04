-- Check if todos table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'todos'
);

-- If the table doesn't exist, uncomment and run the following commands:

/*
-- Create the todos table
CREATE TABLE public.todos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add a comment to the table
COMMENT ON TABLE public.todos IS 'Table for storing todo items for the AgriConnect app';
*/

-- These commands should be run regardless of whether the table exists or not:

-- Enable Row Level Security (RLS) - this is crucial for allowing anonymous operations
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

-- Check if the policy already exists
SELECT * FROM pg_policies WHERE tablename = 'todos' AND policyname = 'Allow anonymous access';

-- Create policy for anonymous access if it doesn't exist yet
-- (If the above query returns results, you can skip this part)
CREATE POLICY IF NOT EXISTS "Allow anonymous access" ON public.todos
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Optional: Grant appropriate permissions
GRANT ALL ON public.todos TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Verify permissions
SELECT grantee, privilege_type 
FROM information_schema.table_privileges 
WHERE table_name = 'todos' AND table_schema = 'public';

-- Verify the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'todos' AND table_schema = 'public';

-- Insert a test record if the table is empty
INSERT INTO public.todos (task, completed)
SELECT 'Test task from SQL editor', false
WHERE NOT EXISTS (SELECT 1 FROM public.todos LIMIT 1);

-- View the data
SELECT * FROM public.todos;

-- Check if user_credentials table exists and create it if not
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'user_credentials'
  ) THEN
    CREATE TABLE public.user_credentials (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    
    ALTER TABLE public.user_credentials ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Enable read access for authenticated users" ON public.user_credentials
      FOR SELECT
      USING (auth.role() = 'authenticated');
    
    CREATE POLICY "Enable insert access for authenticated users" ON public.user_credentials
      FOR INSERT
      WITH CHECK (auth.role() = 'authenticated');
  END IF;
END
$$;

-- Add login function that can be called from client side
CREATE OR REPLACE FUNCTION public.manual_login(email TEXT, password TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  user_id UUID;
  is_valid BOOLEAN;
BEGIN
  -- Find user by email
  SELECT id INTO user_id FROM public.users WHERE users.email = manual_login.email;
  
  IF user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not found');
  END IF;
  
  -- Check if password matches
  SELECT EXISTS(
    SELECT 1 FROM public.user_credentials 
    WHERE user_credentials.user_id = user_id 
    AND user_credentials.password_hash = manual_login.password
  ) INTO is_valid;
  
  IF NOT is_valid THEN
    RETURN json_build_object('success', false, 'message', 'Invalid password');
  END IF;
  
  -- Get user details
  SELECT * INTO user_record FROM public.users WHERE id = user_id;
  
  -- Return success with user details
  RETURN json_build_object(
    'success', true,
    'user', json_build_object(
      'id', user_record.id,
      'email', user_record.email,
      'first_name', user_record.first_name,
      'last_name', user_record.last_name,
      'role', user_record.role
    )
  );
END;
$$;

-- Add function to confirm user email
CREATE OR REPLACE FUNCTION public.confirm_user_email(user_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Confirm the user's email by setting confirmed_at
  UPDATE auth.users
  SET email_confirmed_at = NOW(),
      confirmed_at = NOW()
  WHERE id = user_id;
  
  RETURN FOUND;
END;
$$;

-- Grant execute permission to the function
GRANT EXECUTE ON FUNCTION public.confirm_user_email(UUID) TO authenticated, anon;

-- Create a function that directly creates a user with a confirmed email
CREATE OR REPLACE FUNCTION public.create_user_without_confirmation(
  user_email TEXT,
  user_password TEXT,
  user_first_name TEXT,
  user_last_name TEXT,
  user_role TEXT
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- This runs with the privileges of the function creator
AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Generate a UUID for the new user
  new_user_id := gen_random_uuid();
  
  -- Create the user in auth.users with confirmed email
  INSERT INTO auth.users (
    id,
    email,
    -- Use a simpler password approach since crypt/gen_salt aren't available
    -- WARNING: This is not secure for production but works for demonstration
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role_id
  )
  VALUES (
    new_user_id,
    user_email,
    -- Use MD5 as a simple fallback (not secure for production)
    '$2a$10$' || MD5(user_password),
    NOW(), -- Confirm email immediately
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    format('{"role":"%s","firstName":"%s","lastName":"%s"}', 
           user_role, user_first_name, user_last_name)::jsonb,
    false,
    (SELECT id FROM auth.roles WHERE name = 'authenticated')
  );
  
  -- Create the user in public.users table
  INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    role,
    status,
    created_at,
    updated_at
  )
  VALUES (
    new_user_id,
    user_email,
    user_first_name,
    user_last_name,
    user_role,
    'active',
    NOW(),
    NOW()
  );
  
  -- Return the new user id
  RETURN json_build_object('user_id', new_user_id);
  
EXCEPTION WHEN others THEN
  RAISE EXCEPTION 'Error creating user: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION public.create_user_without_confirmation(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, anon; 