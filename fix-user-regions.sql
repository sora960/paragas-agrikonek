-- Drop and recreate the user_regions table with TEXT for region_id
DO $$
BEGIN
  -- Check if user_regions table exists
  IF EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'user_regions'
  ) THEN
    -- Drop the table with cascade to remove constraints
    DROP TABLE public.user_regions CASCADE;
  END IF;
  
  -- Create user_regions table with TEXT for region_id
  CREATE TABLE public.user_regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    region_id TEXT NOT NULL, -- Changed to TEXT to accept string IDs like "visayas-R6"
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, region_id)
  );
  
  -- Setup permissions
  ALTER TABLE public.user_regions ENABLE ROW LEVEL SECURITY;
  
  CREATE POLICY "Enable all access for all users" 
    ON public.user_regions FOR ALL 
    USING (true) 
    WITH CHECK (true);
    
  GRANT ALL ON public.user_regions TO anon, authenticated;
END
$$; 