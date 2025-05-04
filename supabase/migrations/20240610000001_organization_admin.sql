-- Update user roles and organization_admins functionality

-- 1. Make sure the user_roles type includes organization_admin
DO $$
BEGIN
  -- Check if we need to update the type
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'organization_admin'
  ) THEN
    -- Add organization_admin to the user_role enum if it doesn't exist
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'organization_admin';
  END IF;
END
$$;

-- 2. Create organization_admins table to track which users are admins of which organizations
CREATE TABLE IF NOT EXISTS public.organization_admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

-- 3. Add RLS policies
ALTER TABLE public.organization_admins ENABLE ROW LEVEL SECURITY;

-- 4. Create policies for organization admins
CREATE POLICY "Organization admins can see their own organizations"
  ON public.organization_admins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "SuperAdmins can manage organization admins"
  ON public.organization_admins 
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id AND auth.users.raw_user_meta_data->>'role' = 'superadmin'
    )
  );

-- 5. Create function to promote user to organization admin
CREATE OR REPLACE FUNCTION promote_to_organization_admin(
  p_user_id UUID,
  p_organization_id UUID
) RETURNS UUID 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User with ID % does not exist', p_user_id;
  END IF;
  
  -- Check if organization exists
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = p_organization_id) THEN
    RAISE EXCEPTION 'Organization with ID % does not exist', p_organization_id;
  END IF;
  
  -- Create organization admin entry (or do nothing if already exists)
  INSERT INTO public.organization_admins (user_id, organization_id)
  VALUES (p_user_id, p_organization_id)
  ON CONFLICT (user_id, organization_id) DO NOTHING
  RETURNING id INTO v_id;
  
  -- Update user role
  UPDATE auth.users
  SET raw_user_meta_data = 
    CASE 
      WHEN raw_user_meta_data IS NULL THEN jsonb_build_object('role', 'organization_admin')
      ELSE jsonb_set(raw_user_meta_data, '{role}', '"organization_admin"')
    END
  WHERE id = p_user_id;
  
  RETURN v_id;
END;
$$; 