-- Comprehensive fix for provinces table
-- This script will check for and add all missing columns

DO $$
DECLARE
    missing_farmers BOOLEAN;
    missing_organizations BOOLEAN;
    missing_status BOOLEAN;
BEGIN
    -- Check if columns exist
    SELECT NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'provinces'
        AND column_name = 'farmers'
    ) INTO missing_farmers;
    
    SELECT NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'provinces'
        AND column_name = 'organizations'
    ) INTO missing_organizations;
    
    SELECT NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'provinces'
        AND column_name = 'status'
    ) INTO missing_status;
    
    -- Add missing columns if needed
    IF missing_farmers THEN
        ALTER TABLE public.provinces ADD COLUMN farmers INTEGER DEFAULT 0;
        RAISE NOTICE 'Added farmers column to provinces table';
    END IF;
    
    IF missing_organizations THEN
        ALTER TABLE public.provinces ADD COLUMN organizations INTEGER DEFAULT 0;
        RAISE NOTICE 'Added organizations column to provinces table';
    END IF;
    
    IF missing_status THEN
        ALTER TABLE public.provinces ADD COLUMN status TEXT DEFAULT 'pending' CHECK (status IN ('active', 'pending'));
        RAISE NOTICE 'Added status column to provinces table';
    END IF;
    
    -- Check for created_at and updated_at columns and add if missing
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'provinces'
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.provinces ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
        RAISE NOTICE 'Added created_at column to provinces table';
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'provinces'
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.provinces ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column to provinces table';
    END IF;
    
    RAISE NOTICE 'Province table structure has been fixed';
END
$$;

-- Insert provinces with region_id after fixing columns
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
    
    IF r1_id IS NOT NULL THEN
        -- Ilocos Region Provinces
        INSERT INTO public.provinces (name, region_id, farmers, organizations, status)
        VALUES
            ('Ilocos Norte', r1_id, 500, 5, 'active'),
            ('Ilocos Sur', r1_id, 700, 8, 'active'),
            ('La Union', r1_id, 450, 3, 'active'),
            ('Pangasinan', r1_id, 1200, 10, 'active')
        ON CONFLICT (id) DO NOTHING;
        RAISE NOTICE 'Added Ilocos Region provinces';
    END IF;
    
    IF r3_id IS NOT NULL THEN
        -- Central Luzon Provinces
        INSERT INTO public.provinces (name, region_id, farmers, organizations, status)
        VALUES
            ('Bataan', r3_id, 350, 4, 'active'),
            ('Bulacan', r3_id, 800, 12, 'active'),
            ('Nueva Ecija', r3_id, 1500, 15, 'active'),
            ('Pampanga', r3_id, 900, 10, 'active'),
            ('Tarlac', r3_id, 750, 8, 'active'),
            ('Zambales', r3_id, 400, 5, 'active')
        ON CONFLICT (id) DO NOTHING;
        RAISE NOTICE 'Added Central Luzon provinces';
    END IF;
    
    IF r7_id IS NOT NULL THEN
        -- Central Visayas Provinces
        INSERT INTO public.provinces (name, region_id, farmers, organizations, status)
        VALUES
            ('Bohol', r7_id, 650, 7, 'active'),
            ('Cebu', r7_id, 1000, 18, 'active'),
            ('Negros Oriental', r7_id, 800, 9, 'active'),
            ('Siquijor', r7_id, 200, 2, 'active')
        ON CONFLICT (id) DO NOTHING;
        RAISE NOTICE 'Added Central Visayas provinces';
    END IF;
    
    IF r11_id IS NOT NULL THEN
        -- Davao Region Provinces
        INSERT INTO public.provinces (name, region_id, farmers, organizations, status)
        VALUES
            ('Davao de Oro', r11_id, 700, 8, 'active'),
            ('Davao del Norte', r11_id, 900, 12, 'active'),
            ('Davao del Sur', r11_id, 1100, 15, 'active'),
            ('Davao Oriental', r11_id, 600, 7, 'active')
        ON CONFLICT (id) DO NOTHING;
        RAISE NOTICE 'Added Davao Region provinces';
    END IF;
END
$$; 