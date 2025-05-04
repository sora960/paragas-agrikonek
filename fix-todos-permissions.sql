-- This script fixes the Row Level Security policies for the todos table

-- First, make sure RLS is enabled
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow anonymous access" ON public.todos;

-- Create a policy that allows anonymous access to all operations
CREATE POLICY "Allow anonymous access" ON public.todos
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Grant all permissions on todos table to anon and authenticated roles
GRANT ALL ON public.todos TO anon, authenticated;

-- Ensure public schema usage is granted
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Verify the policy was created
SELECT * FROM pg_policies WHERE tablename = 'todos'; 