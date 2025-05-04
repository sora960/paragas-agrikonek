-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- *** FARM RESOURCES TABLE ***
CREATE TABLE IF NOT EXISTS public.farm_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID REFERENCES public.farmer_profiles(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('equipment', 'seeds', 'fertilizer', 'other')),
    quantity DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'disposed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- *** FARMING TASKS TABLE ***
CREATE TABLE IF NOT EXISTS public.farming_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID REFERENCES public.farmer_profiles(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    task_date DATE NOT NULL,
    task_type VARCHAR(50) NOT NULL CHECK (task_type IN ('planting', 'harvesting', 'maintenance', 'other')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    plot_id UUID REFERENCES public.farm_plots(id) ON DELETE SET NULL,
    resources_used JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create views for easier querying
CREATE OR REPLACE VIEW public.farmer_resources_summary AS
SELECT 
    fp.id AS farmer_id,
    fp.farm_name,
    COUNT(DISTINCT r.id) AS total_resources,
    COUNT(DISTINCT CASE WHEN r.type = 'equipment' THEN r.id END) AS equipment_count,
    COUNT(DISTINCT CASE WHEN r.type = 'seeds' THEN r.id END) AS seeds_count,
    COUNT(DISTINCT CASE WHEN r.type = 'fertilizer' THEN r.id END) AS fertilizer_count,
    SUM(CASE WHEN r.type = 'seeds' THEN r.quantity ELSE 0 END) AS total_seeds,
    SUM(CASE WHEN r.type = 'fertilizer' THEN r.quantity ELSE 0 END) AS total_fertilizer
FROM 
    public.farmer_profiles fp
    LEFT JOIN public.farm_resources r ON r.farmer_id = fp.id
GROUP BY 
    fp.id, fp.farm_name;

-- View for farming tasks calendar
CREATE OR REPLACE VIEW public.farming_tasks_calendar AS
SELECT 
    t.id,
    t.farmer_id,
    t.title,
    t.description,
    t.task_date,
    t.task_type,
    t.status,
    t.plot_id,
    p.plot_name,
    fp.farm_name,
    t.resources_used
FROM 
    public.farming_tasks t
    LEFT JOIN public.farm_plots p ON t.plot_id = p.id
    JOIN public.farmer_profiles fp ON t.farmer_id = fp.id;

-- Optional: Temporarily disable RLS to allow easier testing
-- Comment these out when deploying to production
ALTER TABLE IF EXISTS public.farm_resources DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.farming_tasks DISABLE ROW LEVEL SECURITY; 