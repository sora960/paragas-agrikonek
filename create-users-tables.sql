-- This script creates the users and user_credentials tables

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('farmer', 'org_admin', 'regional_admin', 'superadmin')),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policy for users table
CREATE POLICY "Enable all access for all users" 
  ON public.users FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Create user_credentials table
CREATE TABLE IF NOT EXISTS public.user_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add foreign key constraint
ALTER TABLE public.user_credentials 
  ADD CONSTRAINT user_credentials_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.users(id) 
  ON DELETE CASCADE;

-- Enable RLS on user_credentials table
ALTER TABLE public.user_credentials ENABLE ROW LEVEL SECURITY;

-- Create policy for user_credentials table
CREATE POLICY "Enable all access for all users" 
  ON public.user_credentials FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.users TO anon, authenticated;
GRANT ALL ON public.user_credentials TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Verify tables were created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('users', 'user_credentials');

-- Optional: Add sample user for testing
INSERT INTO public.users (id, email, first_name, last_name, role)
VALUES 
  (gen_random_uuid(), 'test@example.com', 'Test', 'User', 'farmer');

-- Verify users table has data
SELECT * FROM public.users LIMIT 1; 