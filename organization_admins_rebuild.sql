-- Completely rebuild the organization_admins table with proper permissions
-- using the same pattern as other working tables

DO $$
BEGIN
  -- First drop the table if it exists
  DROP TABLE IF EXISTS public.organization_admins;
  
  -- Create the organization_admins table with proper structure
  CREATE TABLE public.organization_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, organization_id)
  );

  -- Create indexes for performance
  CREATE INDEX IF NOT EXISTS organization_admins_user_id_idx ON public.organization_admins(user_id);
  CREATE INDEX IF NOT EXISTS organization_admins_organization_id_idx ON public.organization_admins(organization_id);

  -- Enable Row Level Security but with permissive policies
  ALTER TABLE public.organization_admins ENABLE ROW LEVEL SECURITY;
  
  -- Create a simple policy that allows all actions
  CREATE POLICY "Enable all access for all users" 
    ON public.organization_admins FOR ALL 
    USING (true) 
    WITH CHECK (true);
  
  -- Grant ALL permissions to both anon and authenticated roles
  GRANT ALL ON public.organization_admins TO anon, authenticated;
  
  -- Grant permissions on the sequence
  GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
  
  -- Add documentation
  COMMENT ON TABLE public.organization_admins IS 'Stores relationships between users and the organizations they administer';
  COMMENT ON COLUMN public.organization_admins.user_id IS 'The ID of the user who is an admin';
  COMMENT ON COLUMN public.organization_admins.organization_id IS 'The ID of the organization being administered';
  
  RAISE NOTICE 'Successfully rebuilt organization_admins table with proper permissions';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error rebuilding organization_admins table: %', SQLERRM;
END
$$; 