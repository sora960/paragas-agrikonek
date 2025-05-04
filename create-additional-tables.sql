-- This script creates additional tables that might be needed

-- Create island_groups table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.island_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on island_groups table
ALTER TABLE public.island_groups ENABLE ROW LEVEL SECURITY;

-- Create policy for island_groups table
CREATE POLICY "Enable all access for all users" 
  ON public.island_groups FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.island_groups TO anon, authenticated;

-- Insert sample data
INSERT INTO public.island_groups (name) 
VALUES ('Luzon'), ('Visayas'), ('Mindanao')
ON CONFLICT DO NOTHING;

-- Create provinces table if referenced
CREATE TABLE IF NOT EXISTS public.provinces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  island_group_id UUID REFERENCES public.island_groups(id),
  name TEXT NOT NULL,
  code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on provinces table
ALTER TABLE public.provinces ENABLE ROW LEVEL SECURITY;

-- Create policy for provinces table
CREATE POLICY "Enable all access for all users" 
  ON public.provinces FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.provinces TO anon, authenticated;

-- Insert sample provinces if needed
INSERT INTO public.provinces (island_group_id, name, code)
SELECT id, 'Metro Manila', 'NCR' FROM public.island_groups WHERE name = 'Luzon'
ON CONFLICT DO NOTHING;

-- Create organizations table if referenced
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on organizations table
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Create policy for organizations table
CREATE POLICY "Enable all access for all users" 
  ON public.organizations FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.organizations TO anon, authenticated;

-- Verify all tables were created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN 
  ('island_groups', 'provinces', 'organizations'); 