-- This script fixes the relationship between organizations and regions

-- Add the foreign key if it doesn't exist
ALTER TABLE public.organizations DROP CONSTRAINT IF EXISTS organizations_region_id_fkey;
ALTER TABLE public.organizations ADD CONSTRAINT organizations_region_id_fkey 
FOREIGN KEY (region_id) REFERENCES public.regions(id);

-- Create organization_regions junction table if needed
CREATE TABLE IF NOT EXISTS public.organization_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  region_id UUID NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, region_id)
);

-- Enable RLS
ALTER TABLE public.organization_regions ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Enable all access for all users on organization_regions" 
  ON public.organization_regions FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.organization_regions TO anon, authenticated;

-- Update existing organizations to have a region
DO $$
DECLARE
  default_region_id UUID;
BEGIN
  -- Get the first region as default
  SELECT id INTO default_region_id FROM public.regions ORDER BY name LIMIT 1;
  
  -- Update organizations that don't have a region_id
  UPDATE public.organizations
  SET region_id = default_region_id
  WHERE region_id IS NULL;
  
  -- For each organization, create an entry in organization_regions
  INSERT INTO public.organization_regions (organization_id, region_id, is_primary)
  SELECT id, region_id, TRUE
  FROM public.organizations
  WHERE region_id IS NOT NULL
  ON CONFLICT DO NOTHING;
END $$; 