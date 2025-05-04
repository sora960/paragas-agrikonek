-- Script to initialize the regions, island groups, and provinces tables with data
-- This ensures the region management system has basic data to work with

-- First, let's check the structure of the provinces table if it exists
DO $$
DECLARE
    province_region_column TEXT;
BEGIN
    -- Check if the provinces table exists
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'provinces'
    ) THEN
        -- Check if region_id column exists
        IF EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'provinces'
            AND column_name = 'region_id'
        ) THEN
            province_region_column := 'region_id';
            RAISE NOTICE 'Provinces table uses region_id column';
        -- Check if region_code column exists
        ELSIF EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'provinces'
            AND column_name = 'region_code'
        ) THEN
            province_region_column := 'region_code';
            RAISE NOTICE 'Provinces table uses region_code column';
        -- Neither column exists
        ELSE
            RAISE NOTICE 'Provinces table exists but has neither region_id nor region_code column';
        END IF;
    ELSE
        RAISE NOTICE 'Provinces table does not exist yet';
    END IF;
END
$$;

-- Check if tables exist
DO $$
BEGIN
    -- Create island_groups table if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'island_groups'
    ) THEN
        CREATE TABLE public.island_groups (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL UNIQUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        
        -- Enable RLS
        ALTER TABLE public.island_groups ENABLE ROW LEVEL SECURITY;
        
        -- Create policy
        CREATE POLICY "Enable all access for authenticated users" 
            ON public.island_groups FOR ALL 
            USING (auth.role() = 'authenticated')
            WITH CHECK (auth.role() = 'authenticated');
        
        -- Grant permissions
        GRANT ALL ON public.island_groups TO authenticated;
    END IF;
    
    -- Create regions table if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'regions'
    ) THEN
        CREATE TABLE public.regions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            code TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            island_group_id UUID REFERENCES public.island_groups(id) ON DELETE CASCADE,
            priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        
        -- Enable RLS
        ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
        
        -- Create policy
        CREATE POLICY "Enable all access for authenticated users" 
            ON public.regions FOR ALL 
            USING (auth.role() = 'authenticated')
            WITH CHECK (auth.role() = 'authenticated');
        
        -- Grant permissions
        GRANT ALL ON public.regions TO authenticated;
    END IF;
    
    -- Check if provinces table already exists
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'provinces'
    ) THEN
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
        
        -- Enable RLS
        ALTER TABLE public.provinces ENABLE ROW LEVEL SECURITY;
        
        -- Create policy
        CREATE POLICY "Enable all access for authenticated users" 
            ON public.provinces FOR ALL 
            USING (auth.role() = 'authenticated')
            WITH CHECK (auth.role() = 'authenticated');
        
        -- Grant permissions
        GRANT ALL ON public.provinces TO authenticated;
    END IF;
    
    -- Create annual_budgets table if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'annual_budgets'
    ) THEN
        CREATE TABLE public.annual_budgets (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            fiscal_year INTEGER NOT NULL UNIQUE,
            total_amount DECIMAL(20, 2) DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        
        -- Enable RLS
        ALTER TABLE public.annual_budgets ENABLE ROW LEVEL SECURITY;
        
        -- Create policy
        CREATE POLICY "Enable all access for authenticated users" 
            ON public.annual_budgets FOR ALL 
            USING (auth.role() = 'authenticated')
            WITH CHECK (auth.role() = 'authenticated');
        
        -- Grant permissions
        GRANT ALL ON public.annual_budgets TO authenticated;
    END IF;
    
    -- Create region_budgets table if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'region_budgets'
    ) THEN
        CREATE TABLE public.region_budgets (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            region_id UUID REFERENCES public.regions(id) ON DELETE CASCADE,
            fiscal_year INTEGER NOT NULL,
            amount DECIMAL(20, 2) DEFAULT 0,
            allocated BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(region_id, fiscal_year)
        );
        
        -- Enable RLS
        ALTER TABLE public.region_budgets ENABLE ROW LEVEL SECURITY;
        
        -- Create policy
        CREATE POLICY "Enable all access for authenticated users" 
            ON public.region_budgets FOR ALL 
            USING (auth.role() = 'authenticated')
            WITH CHECK (auth.role() = 'authenticated');
        
        -- Grant permissions
        GRANT ALL ON public.region_budgets TO authenticated;
    END IF;
END
$$;

-- Insert island groups if they don't exist
INSERT INTO public.island_groups (name)
VALUES 
    ('Luzon'),
    ('Visayas'),
    ('Mindanao')
ON CONFLICT (name) DO NOTHING;

-- Insert regions (with references to island groups)
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

-- Insert some sample provinces
DO $$
DECLARE
    r1_id UUID;
    r3_id UUID;
    r7_id UUID;
    r11_id UUID;
BEGIN
    -- Get region IDs
    SELECT id INTO r1_id FROM public.regions WHERE code = 'R1';
    SELECT id INTO r3_id FROM public.regions WHERE code = 'R3';
    SELECT id INTO r7_id FROM public.regions WHERE code = 'R7';
    SELECT id INTO r11_id FROM public.regions WHERE code = 'R11';
    
    -- Check which column to use (region_id or region_code)
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'provinces'
        AND column_name = 'region_id'
    ) THEN
        -- Use region_id column
        RAISE NOTICE 'Inserting provinces with region_id column';
        
        -- Ilocos Region Provinces
        IF r1_id IS NOT NULL THEN
            INSERT INTO public.provinces (name, region_id, farmers, organizations, status)
            VALUES
                ('Ilocos Norte', r1_id, 500, 5, 'active'),
                ('Ilocos Sur', r1_id, 700, 8, 'active'),
                ('La Union', r1_id, 450, 3, 'active'),
                ('Pangasinan', r1_id, 1200, 10, 'active')
            ON CONFLICT DO NOTHING;
        END IF;
        
        -- Central Luzon Provinces
        IF r3_id IS NOT NULL THEN
            INSERT INTO public.provinces (name, region_id, farmers, organizations, status)
            VALUES
                ('Bataan', r3_id, 350, 4, 'active'),
                ('Bulacan', r3_id, 800, 12, 'active'),
                ('Nueva Ecija', r3_id, 1500, 15, 'active'),
                ('Pampanga', r3_id, 900, 10, 'active'),
                ('Tarlac', r3_id, 750, 8, 'active'),
                ('Zambales', r3_id, 400, 5, 'active')
            ON CONFLICT DO NOTHING;
        END IF;
        
        -- Central Visayas Provinces
        IF r7_id IS NOT NULL THEN
            INSERT INTO public.provinces (name, region_id, farmers, organizations, status)
            VALUES
                ('Bohol', r7_id, 650, 7, 'active'),
                ('Cebu', r7_id, 1000, 18, 'active'),
                ('Negros Oriental', r7_id, 800, 9, 'active'),
                ('Siquijor', r7_id, 200, 2, 'active')
            ON CONFLICT DO NOTHING;
        END IF;
        
        -- Davao Region Provinces
        IF r11_id IS NOT NULL THEN
            INSERT INTO public.provinces (name, region_id, farmers, organizations, status)
            VALUES
                ('Davao de Oro', r11_id, 700, 8, 'active'),
                ('Davao del Norte', r11_id, 900, 12, 'active'),
                ('Davao del Sur', r11_id, 1100, 15, 'active'),
                ('Davao Oriental', r11_id, 600, 7, 'active')
            ON CONFLICT DO NOTHING;
        END IF;
        
    ELSIF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'provinces'
        AND column_name = 'region_code'
    ) THEN
        -- Use region_code column
        RAISE NOTICE 'Inserting provinces with region_code column';
        
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
        RAISE NOTICE 'Cannot insert provinces - neither region_id nor region_code column exists';
    END IF;
END
$$;

-- Set up current year's budget
INSERT INTO public.annual_budgets (fiscal_year, total_amount)
VALUES
    (EXTRACT(YEAR FROM CURRENT_DATE), 100000000)  -- 100 Million
ON CONFLICT (fiscal_year) DO NOTHING; 