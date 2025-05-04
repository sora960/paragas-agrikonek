-- Fix regions and island groups
-- This script checks if tables exist and creates them if needed
-- Then it inserts default data for Philippine regions and islands

-- Check if island_groups table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'island_groups') THEN
        CREATE TABLE island_groups (
            id VARCHAR PRIMARY KEY,
            name VARCHAR NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Insert default island groups
        INSERT INTO island_groups (id, name, created_at, updated_at)
        VALUES 
            ('luzon-island', 'Luzon', NOW(), NOW()),
            ('visayas-island', 'Visayas', NOW(), NOW()),
            ('mindanao-island', 'Mindanao', NOW(), NOW());
    END IF;
END
$$;

-- Check if regions table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'regions') THEN
        CREATE TABLE regions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            code VARCHAR NOT NULL UNIQUE,
            name VARCHAR NOT NULL,
            island_group_id VARCHAR REFERENCES island_groups(id),
            priority VARCHAR DEFAULT 'medium',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Insert default regions for Luzon
        INSERT INTO regions (code, name, island_group_id, priority, created_at, updated_at)
        VALUES
            ('NCR', 'National Capital Region', 'luzon-island', 'high', NOW(), NOW()),
            ('CAR', 'Cordillera Administrative Region', 'luzon-island', 'medium', NOW(), NOW()),
            ('I', 'Ilocos Region', 'luzon-island', 'medium', NOW(), NOW()),
            ('II', 'Cagayan Valley', 'luzon-island', 'medium', NOW(), NOW()),
            ('III', 'Central Luzon', 'luzon-island', 'high', NOW(), NOW()),
            ('IV-A', 'CALABARZON', 'luzon-island', 'high', NOW(), NOW()),
            ('IV-B', 'MIMAROPA', 'luzon-island', 'medium', NOW(), NOW()),
            ('V', 'Bicol Region', 'luzon-island', 'medium', NOW(), NOW());
            
        -- Insert default regions for Visayas
        INSERT INTO regions (code, name, island_group_id, priority, created_at, updated_at)
        VALUES
            ('VI', 'Western Visayas', 'visayas-island', 'medium', NOW(), NOW()),
            ('VII', 'Central Visayas', 'visayas-island', 'high', NOW(), NOW()),
            ('VIII', 'Eastern Visayas', 'visayas-island', 'medium', NOW(), NOW());
            
        -- Insert default regions for Mindanao
        INSERT INTO regions (code, name, island_group_id, priority, created_at, updated_at)
        VALUES
            ('IX', 'Zamboanga Peninsula', 'mindanao-island', 'medium', NOW(), NOW()),
            ('X', 'Northern Mindanao', 'mindanao-island', 'medium', NOW(), NOW()),
            ('XI', 'Davao Region', 'mindanao-island', 'high', NOW(), NOW()),
            ('XII', 'SOCCSKSARGEN', 'mindanao-island', 'medium', NOW(), NOW()),
            ('XIII', 'Caraga', 'mindanao-island', 'medium', NOW(), NOW()),
            ('BARMM', 'Bangsamoro Autonomous Region in Muslim Mindanao', 'mindanao-island', 'high', NOW(), NOW());
    END IF;
END
$$;

-- Check if annual_budgets table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'annual_budgets') THEN
        CREATE TABLE annual_budgets (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            fiscal_year INTEGER NOT NULL,
            total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(fiscal_year)
        );
        
        -- Insert default budget for 2024
        INSERT INTO annual_budgets (fiscal_year, total_amount, created_at, updated_at)
        VALUES (2024, 100000000, NOW(), NOW());
    END IF;
END
$$;

-- Check if region_budgets table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'region_budgets') THEN
        CREATE TABLE region_budgets (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            region_id UUID REFERENCES regions(id),
            fiscal_year INTEGER NOT NULL,
            amount DECIMAL(15,2) NOT NULL DEFAULT 0,
            allocated BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(region_id, fiscal_year)
        );
    END IF;
END
$$; 