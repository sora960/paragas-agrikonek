-- This alternative script fixes the Row Level Security policies for the todos table
-- Using DO blocks for better error handling

DO $$
BEGIN
  -- Make sure RLS is enabled
  ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
  
  -- Drop existing policies if they exist
  BEGIN
    DROP POLICY IF EXISTS "Allow anonymous access" ON public.todos;
  EXCEPTION WHEN OTHERS THEN
    -- Ignore if policy doesn't exist
  END;
  
  -- Create a policy that allows anonymous access to all operations
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'todos' 
    AND policyname = 'Allow anonymous access'
  ) THEN
    CREATE POLICY "Allow anonymous access" ON public.todos
      FOR ALL
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;
  
  -- Grant permissions
  GRANT ALL ON public.todos TO anon, authenticated;
  GRANT USAGE ON SCHEMA public TO anon, authenticated;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error occurred: %', SQLERRM;
END
$$;

-- Verify the policy was created
SELECT * FROM pg_policies WHERE tablename = 'todos'; 