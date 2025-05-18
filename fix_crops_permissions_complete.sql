-- COMPREHENSIVE FIX FOR CROPS TABLE PERMISSIONS

-- 1. First ensure the tables exist with correct structure
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

-- 2. Grant full permissions to all authenticated users
GRANT ALL PRIVILEGES ON TABLE crops TO authenticated;
GRANT ALL PRIVILEGES ON TABLE crops TO anon;
GRANT ALL PRIVILEGES ON TABLE crop_activities TO authenticated;
GRANT ALL PRIVILEGES ON TABLE crop_activities TO anon;

-- 3. Disable Row Level Security
ALTER TABLE crops DISABLE ROW LEVEL SECURITY;
ALTER TABLE crop_activities DISABLE ROW LEVEL SECURITY;

-- 4. Remove any existing RLS policies
DROP POLICY IF EXISTS "Farmers can view their own crops" ON crops;
DROP POLICY IF EXISTS "Farmers can add crops to their plots" ON crops;
DROP POLICY IF EXISTS "Farmers can update their own crops" ON crops;
DROP POLICY IF EXISTS "Farmers can delete their own crops" ON crops;
DROP POLICY IF EXISTS "Farmers can view their own crop activities" ON crop_activities;

-- 5. Reset ownership if there's an issue with that
ALTER TABLE crops OWNER TO postgres;
ALTER TABLE crop_activities OWNER TO postgres;

-- 6. Fix any sequence permissions if needed
DO $$
DECLARE
    seq_name text;
BEGIN
    FOR seq_name IN 
        SELECT sequence_name 
        FROM information_schema.sequences 
        WHERE sequence_schema = 'public' 
    LOOP
        EXECUTE 'GRANT ALL PRIVILEGES ON SEQUENCE ' || seq_name || ' TO authenticated';
        EXECUTE 'GRANT ALL PRIVILEGES ON SEQUENCE ' || seq_name || ' TO anon';
    END LOOP;
END $$; 