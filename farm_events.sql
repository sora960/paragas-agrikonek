-- Create farm_events table for storing farming calendar events
BEGIN;

-- Create the table
CREATE TABLE IF NOT EXISTS public.farm_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES public.farmer_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  end_date DATE,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('planting', 'harvesting', 'maintenance', 'fertilizing', 'irrigation', 'pest_control', 'other')),
  status VARCHAR(20) NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'in_progress', 'completed', 'cancelled')),
  plot_id UUID REFERENCES public.farm_plots(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_farm_events_farmer_id ON public.farm_events (farmer_id);
CREATE INDEX IF NOT EXISTS idx_farm_events_event_date ON public.farm_events (event_date);
CREATE INDEX IF NOT EXISTS idx_farm_events_event_type ON public.farm_events (event_type);
CREATE INDEX IF NOT EXISTS idx_farm_events_status ON public.farm_events (status);

-- Add trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_farm_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_farm_events_updated_at ON farm_events;
CREATE TRIGGER update_farm_events_updated_at
BEFORE UPDATE ON farm_events
FOR EACH ROW
EXECUTE FUNCTION update_farm_events_updated_at();

-- Disable RLS for now to avoid permission issues
ALTER TABLE public.farm_events DISABLE ROW LEVEL SECURITY;

-- Grant proper permissions
GRANT ALL ON public.farm_events TO anon, authenticated, service_role;

-- Add some sample events for testing
INSERT INTO public.farm_events (farmer_id, title, description, event_date, end_date, event_type, status)
SELECT 
  fp.id, 
  'Rice Planting', 
  'Initial planting of rice seedlings for the season', 
  '2024-05-15', 
  '2024-05-20',
  'planting', 
  'upcoming'
FROM farmer_profiles fp
LIMIT 1;

INSERT INTO public.farm_events (farmer_id, title, description, event_date, event_type, status)
SELECT 
  fp.id, 
  'Fertilizer Application', 
  'Apply organic fertilizer to rice fields', 
  '2024-06-10', 
  'fertilizing', 
  'upcoming'
FROM farmer_profiles fp
LIMIT 1;

INSERT INTO public.farm_events (farmer_id, title, description, event_date, end_date, event_type, status)
SELECT 
  fp.id, 
  'Harvest Season', 
  'Primary harvest for the season', 
  '2024-09-20',
  '2024-09-30',
  'harvesting', 
  'upcoming'
FROM farmer_profiles fp
LIMIT 1;

COMMIT; 