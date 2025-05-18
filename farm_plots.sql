-- Create farm_plots table for storing farm plots information
BEGIN;

-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.farm_plots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES public.farmer_profiles(id) ON DELETE CASCADE,
  plot_name TEXT NOT NULL,
  location TEXT,
  area_size NUMERIC,
  area_unit VARCHAR(10) DEFAULT 'hectare',
  soil_type VARCHAR(50),
  crop_type VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_farm_plots_farmer_id ON public.farm_plots (farmer_id);

-- Add trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_farm_plots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_farm_plots_updated_at ON farm_plots;
CREATE TRIGGER update_farm_plots_updated_at
BEFORE UPDATE ON farm_plots
FOR EACH ROW
EXECUTE FUNCTION update_farm_plots_updated_at();

-- Disable RLS for now to avoid permission issues
ALTER TABLE public.farm_plots DISABLE ROW LEVEL SECURITY;

-- Grant proper permissions
GRANT ALL ON public.farm_plots TO anon, authenticated, service_role;

-- Add some sample plots for testing
INSERT INTO public.farm_plots (farmer_id, plot_name, location, area_size, soil_type, crop_type)
SELECT 
  fp.id, 
  'North Field', 
  'Northern boundary, near the river', 
  2.5,
  'Clay loam',
  'Rice'
FROM farmer_profiles fp
LIMIT 1;

INSERT INTO public.farm_plots (farmer_id, plot_name, location, area_size, soil_type, crop_type)
SELECT 
  fp.id, 
  'South Field', 
  'Southern area, hilly terrain', 
  1.75,
  'Sandy soil',
  'Vegetables'
FROM farmer_profiles fp
LIMIT 1;

INSERT INTO public.farm_plots (farmer_id, plot_name, location, area_size, soil_type, crop_type)
SELECT 
  fp.id, 
  'West Field', 
  'Western flat area, good irrigation', 
  3.2,
  'Rich loam',
  'Corn'
FROM farmer_profiles fp
LIMIT 1;

COMMIT; 