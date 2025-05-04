-- COMPREHENSIVE SETUP SCRIPT FOR REGION MANAGEMENT SYSTEM
-- Run this entire script in your Supabase SQL editor at https://supabase.com/dashboard

-- Create island_groups table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.island_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on island_groups
ALTER TABLE public.island_groups ENABLE ROW LEVEL SECURITY;

-- Create policy for island_groups
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'island_groups' AND policyname = 'Enable all access for authenticated users'
  ) THEN
    CREATE POLICY "Enable all access for authenticated users" 
        ON public.island_groups FOR ALL 
        USING (auth.role() = 'authenticated')
        WITH CHECK (auth.role() = 'authenticated');
  END IF;
END
$$;

-- Grant permissions on island_groups
GRANT ALL ON public.island_groups TO authenticated;

-- Create regions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    island_group_id UUID REFERENCES public.island_groups(id) ON DELETE CASCADE,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on regions
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;

-- Create policy for regions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'regions' AND policyname = 'Enable all access for authenticated users'
  ) THEN
    CREATE POLICY "Enable all access for authenticated users" 
        ON public.regions FOR ALL 
        USING (auth.role() = 'authenticated')
        WITH CHECK (auth.role() = 'authenticated');
  END IF;
END
$$;

-- Grant permissions on regions
GRANT ALL ON public.regions TO authenticated;

-- Check if provinces table already exists and get its structure
DO $$
DECLARE
    province_column_exists BOOLEAN;
BEGIN
    -- Check if the provinces table exists first
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'provinces'
    ) THEN
        -- Check if region_id column exists
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'provinces'
            AND column_name = 'region_id'
        ) INTO province_column_exists;
        
        IF province_column_exists THEN
            RAISE NOTICE 'Provinces table exists with region_id column.';
        ELSE
            -- Check if region_code column exists
            SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_schema = 'public'
                AND table_name = 'provinces'
                AND column_name = 'region_code'
            ) INTO province_column_exists;
            
            IF province_column_exists THEN
                RAISE NOTICE 'Provinces table exists with region_code column.';
            ELSE
                -- Neither column exists, add region_id
                ALTER TABLE public.provinces 
                ADD COLUMN region_id UUID REFERENCES public.regions(id) ON DELETE CASCADE;
                
                RAISE NOTICE 'Added region_id column to existing provinces table.';
            END IF;
        END IF;
    ELSE
        -- Create provinces table with region_id
        CREATE TABLE public.provinces (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            region_id UUID REFERENCES public.regions(id) ON DELETE CASCADE,
            farmers INTEGER DEFAULT 0,
            organizations INTEGER DEFAULT 0,
            status TEXT DEFAULT 'pending' CHECK (status IN ('active', 'pending')),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        
        -- Enable RLS on provinces
        ALTER TABLE public.provinces ENABLE ROW LEVEL SECURITY;
        
        -- Create policy for provinces
        CREATE POLICY "Enable all access for authenticated users" 
            ON public.provinces FOR ALL 
            USING (auth.role() = 'authenticated')
            WITH CHECK (auth.role() = 'authenticated');
        
        -- Grant permissions on provinces
        GRANT ALL ON public.provinces TO authenticated;
        
        RAISE NOTICE 'Created new provinces table with region_id column.';
    END IF;
END
$$;

-- Create annual_budgets table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.annual_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fiscal_year INTEGER NOT NULL UNIQUE,
    total_amount DECIMAL(20, 2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on annual_budgets
ALTER TABLE public.annual_budgets ENABLE ROW LEVEL SECURITY;

-- Create policy for annual_budgets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'annual_budgets' AND policyname = 'Enable all access for authenticated users'
  ) THEN
    CREATE POLICY "Enable all access for authenticated users" 
        ON public.annual_budgets FOR ALL 
        USING (auth.role() = 'authenticated')
        WITH CHECK (auth.role() = 'authenticated');
  END IF;
END
$$;

-- Grant permissions on annual_budgets
GRANT ALL ON public.annual_budgets TO authenticated;

-- Create region_budgets table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.region_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_id UUID REFERENCES public.regions(id) ON DELETE CASCADE,
    fiscal_year INTEGER NOT NULL,
    amount DECIMAL(20, 2) DEFAULT 0,
    allocated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(region_id, fiscal_year)
);

-- Enable RLS on region_budgets
ALTER TABLE public.region_budgets ENABLE ROW LEVEL SECURITY;

-- Create policy for region_budgets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'region_budgets' AND policyname = 'Enable all access for authenticated users'
  ) THEN
    CREATE POLICY "Enable all access for authenticated users" 
        ON public.region_budgets FOR ALL 
        USING (auth.role() = 'authenticated')
        WITH CHECK (auth.role() = 'authenticated');
  END IF;
END
$$;

-- Grant permissions on region_budgets
GRANT ALL ON public.region_budgets TO authenticated;

-- ==================================
-- INSERT SAMPLE DATA
-- ==================================

-- Insert island groups if they don't exist
INSERT INTO public.island_groups (name)
VALUES 
    ('Luzon'),
    ('Visayas'),
    ('Mindanao')
ON CONFLICT (name) DO NOTHING;

-- Insert regions
DO $$
DECLARE
    luzon_id UUID;
    visayas_id UUID;
    mindanao_id UUID;
BEGIN
    -- Get island group IDs
    SELECT id INTO luzon_id FROM public.island_groups WHERE name = 'Luzon';
    SELECT id INTO visayas_id FROM public.island_groups WHERE name = 'Visayas';
    SELECT id INTO mindanao_id FROM public.island_groups WHERE name = 'Mindanao';
    
    -- Insert regions for Luzon
    INSERT INTO public.regions (code, name, island_group_id, priority)
    VALUES
        ('R1', 'Region I – Ilocos Region', luzon_id, 'medium'),
        ('R2', 'Region II – Cagayan Valley', luzon_id, 'medium'),
        ('R3', 'Region III – Central Luzon', luzon_id, 'high'),
        ('R4A', 'Region IV-A – CALABARZON', luzon_id, 'high'),
        ('R4B', 'Region IV-B – MIMAROPA', luzon_id, 'medium'),
        ('R5', 'Region V – Bicol Region', luzon_id, 'medium'),
        ('NCR', 'National Capital Region (NCR)', luzon_id, 'high'),
        ('CAR', 'Cordillera Administrative Region (CAR)', luzon_id, 'medium')
    ON CONFLICT (code) DO NOTHING;
    
    -- Insert regions for Visayas
    INSERT INTO public.regions (code, name, island_group_id, priority)
    VALUES
        ('R6', 'Region VI – Western Visayas', visayas_id, 'medium'),
        ('R7', 'Region VII – Central Visayas', visayas_id, 'high'),
        ('R8', 'Region VIII – Eastern Visayas', visayas_id, 'medium')
    ON CONFLICT (code) DO NOTHING;
    
    -- Insert regions for Mindanao
    INSERT INTO public.regions (code, name, island_group_id, priority)
    VALUES
        ('R9', 'Region IX – Zamboanga Peninsula', mindanao_id, 'medium'),
        ('R10', 'Region X – Northern Mindanao', mindanao_id, 'medium'),
        ('R11', 'Region XI – Davao Region', mindanao_id, 'high'),
        ('R12', 'Region XII – SOCCSKSARGEN', mindanao_id, 'medium'),
        ('R13', 'Region XIII – Caraga', mindanao_id, 'medium'),
        ('BARMM', 'Bangsamoro Autonomous Region in Muslim Mindanao (BARMM)', mindanao_id, 'high')
    ON CONFLICT (code) DO NOTHING;
END
$$;

-- Insert provinces based on which column exists (region_id or region_code)
DO $$
DECLARE
    r1_id UUID;
    r3_id UUID;
    r7_id UUID;
    r11_id UUID;
    uses_region_id BOOLEAN;
    uses_region_code BOOLEAN;
BEGIN
    -- Check which column the provinces table is using
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'provinces'
        AND column_name = 'region_id'
    ) INTO uses_region_id;
    
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'provinces'
        AND column_name = 'region_code'
    ) INTO uses_region_code;
    
    -- Get region IDs
    SELECT id INTO r1_id FROM public.regions WHERE code = 'R1';
    SELECT id INTO r3_id FROM public.regions WHERE code = 'R3';
    SELECT id INTO r7_id FROM public.regions WHERE code = 'R7';
    SELECT id INTO r11_id FROM public.regions WHERE code = 'R11';
    
    IF uses_region_id THEN
        -- Using region_id column
        RAISE NOTICE 'Inserting provinces with region_id';
        
        -- Ilocos Region Provinces
        INSERT INTO public.provinces (name, region_id, farmers, organizations, status)
        VALUES
            ('Ilocos Norte', r1_id, 500, 5, 'active'),
            ('Ilocos Sur', r1_id, 700, 8, 'active'),
            ('La Union', r1_id, 450, 3, 'active'),
            ('Pangasinan', r1_id, 1200, 10, 'active')
        ON CONFLICT DO NOTHING;
        
        -- Central Luzon Provinces
        INSERT INTO public.provinces (name, region_id, farmers, organizations, status)
        VALUES
            ('Bataan', r3_id, 350, 4, 'active'),
            ('Bulacan', r3_id, 800, 12, 'active'),
            ('Nueva Ecija', r3_id, 1500, 15, 'active'),
            ('Pampanga', r3_id, 900, 10, 'active'),
            ('Tarlac', r3_id, 750, 8, 'active'),
            ('Zambales', r3_id, 400, 5, 'active')
        ON CONFLICT DO NOTHING;
        
        -- Central Visayas Provinces
        INSERT INTO public.provinces (name, region_id, farmers, organizations, status)
        VALUES
            ('Bohol', r7_id, 650, 7, 'active'),
            ('Cebu', r7_id, 1000, 18, 'active'),
            ('Negros Oriental', r7_id, 800, 9, 'active'),
            ('Siquijor', r7_id, 200, 2, 'active')
        ON CONFLICT DO NOTHING;
        
        -- Davao Region Provinces
        INSERT INTO public.provinces (name, region_id, farmers, organizations, status)
        VALUES
            ('Davao de Oro', r11_id, 700, 8, 'active'),
            ('Davao del Norte', r11_id, 900, 12, 'active'),
            ('Davao del Sur', r11_id, 1100, 15, 'active'),
            ('Davao Oriental', r11_id, 600, 7, 'active')
        ON CONFLICT DO NOTHING;
    ELSIF uses_region_code THEN
        -- Using region_code column
        RAISE NOTICE 'Inserting provinces with region_code';
        
        -- Ilocos Region Provinces
        INSERT INTO public.provinces (name, region_code, farmers, organizations, status)
        VALUES
            ('Ilocos Norte', 'R1', 500, 5, 'active'),
            ('Ilocos Sur', 'R1', 700, 8, 'active'),
            ('La Union', 'R1', 450, 3, 'active'),
            ('Pangasinan', 'R1', 1200, 10, 'active')
        ON CONFLICT DO NOTHING;
        
        -- Central Luzon Provinces
        INSERT INTO public.provinces (name, region_code, farmers, organizations, status)
        VALUES
            ('Bataan', 'R3', 350, 4, 'active'),
            ('Bulacan', 'R3', 800, 12, 'active'),
            ('Nueva Ecija', 'R3', 1500, 15, 'active'),
            ('Pampanga', 'R3', 900, 10, 'active'),
            ('Tarlac', 'R3', 750, 8, 'active'),
            ('Zambales', 'R3', 400, 5, 'active')
        ON CONFLICT DO NOTHING;
        
        -- Central Visayas Provinces
        INSERT INTO public.provinces (name, region_code, farmers, organizations, status)
        VALUES
            ('Bohol', 'R7', 650, 7, 'active'),
            ('Cebu', 'R7', 1000, 18, 'active'),
            ('Negros Oriental', 'R7', 800, 9, 'active'),
            ('Siquijor', 'R7', 200, 2, 'active')
        ON CONFLICT DO NOTHING;
        
        -- Davao Region Provinces
        INSERT INTO public.provinces (name, region_code, farmers, organizations, status)
        VALUES
            ('Davao de Oro', 'R11', 700, 8, 'active'),
            ('Davao del Norte', 'R11', 900, 12, 'active'),
            ('Davao del Sur', 'R11', 1100, 15, 'active'),
            ('Davao Oriental', 'R11', 600, 7, 'active')
        ON CONFLICT DO NOTHING;
    ELSE
        RAISE NOTICE 'Error: Provinces table has neither region_id nor region_code column';
    END IF;
END
$$;

-- Set up current year's budget
INSERT INTO public.annual_budgets (fiscal_year, total_amount)
VALUES
    (EXTRACT(YEAR FROM CURRENT_DATE), 100000000)  -- 100 Million
ON CONFLICT (fiscal_year) DO NOTHING;

-- Print completion message
DO $$
BEGIN
    RAISE NOTICE 'Region management system setup complete!';
END
$$; 