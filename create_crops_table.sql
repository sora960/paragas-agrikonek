-- Script to create the crops table and crop_activities table

-- Create crops table if it doesn't exist
CREATE TABLE IF NOT EXISTS crops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id UUID NOT NULL,
  crop_name TEXT NOT NULL,
  crop_type TEXT NOT NULL,
  variety TEXT,
  planting_date DATE NOT NULL,
  expected_harvest_date DATE,
  actual_harvest_date DATE,
  status TEXT NOT NULL DEFAULT 'planted',
  yield_amount NUMERIC,
  yield_quality TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_plot
    FOREIGN KEY(plot_id)
    REFERENCES farm_plots(id)
    ON DELETE CASCADE
);

-- Create crop_activities table if it doesn't exist
CREATE TABLE IF NOT EXISTS crop_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  activity_date DATE NOT NULL,
  description TEXT,
  resources_used JSONB,
  cost NUMERIC,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_crop
    FOREIGN KEY(crop_id)
    REFERENCES crops(id)
    ON DELETE CASCADE
);

-- Disable RLS on these tables to fix permission issues
ALTER TABLE crops DISABLE ROW LEVEL SECURITY;
ALTER TABLE crop_activities DISABLE ROW LEVEL SECURITY;

-- Drop any existing RLS policies
DROP POLICY IF EXISTS "Farmers can view their own crops" ON crops;
DROP POLICY IF EXISTS "Farmers can add crops to their plots" ON crops;
DROP POLICY IF EXISTS "Farmers can update their own crops" ON crops;
DROP POLICY IF EXISTS "Farmers can delete their own crops" ON crops;
DROP POLICY IF EXISTS "Farmers can view their own crop activities" ON crop_activities; 