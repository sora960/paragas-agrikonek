-- Add geographic fields to organizations table
DO $$
BEGIN
  -- Add island_group_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'organizations'
    AND column_name = 'island_group_id'
  ) THEN
    ALTER TABLE public.organizations ADD COLUMN island_group_id UUID REFERENCES public.island_groups(id);
  END IF;

  -- Add province_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'organizations'
    AND column_name = 'province_id'
  ) THEN
    ALTER TABLE public.organizations ADD COLUMN province_id UUID REFERENCES public.provinces(id);
  END IF;
END
$$; 