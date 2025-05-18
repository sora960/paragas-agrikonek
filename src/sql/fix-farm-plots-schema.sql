-- Script to fix farm_plots table schema by adding missing irrigation_type column

-- First, check if the column already exists to avoid errors
DO $$ 
BEGIN 
    -- Check if the column already exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'farm_plots' 
        AND column_name = 'irrigation_type'
    ) THEN
        -- Add the missing column
        ALTER TABLE farm_plots ADD COLUMN irrigation_type VARCHAR(50) DEFAULT 'None';
        
        -- Log the change
        RAISE NOTICE 'Added irrigation_type column to farm_plots table';
    ELSE
        RAISE NOTICE 'irrigation_type column already exists in farm_plots table';
    END IF;
END $$;

-- Make sure all needed columns exist
DO $$ 
BEGIN 
    -- Verify farm_plots table structure has all required columns
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'farm_plots' 
        AND column_name = 'plot_name'
    ) THEN
        ALTER TABLE farm_plots ADD COLUMN plot_name VARCHAR(100) NOT NULL DEFAULT 'Unnamed Plot';
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'farm_plots' 
        AND column_name = 'plot_size'
    ) THEN
        ALTER TABLE farm_plots ADD COLUMN plot_size DECIMAL(10, 2) NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'farm_plots' 
        AND column_name = 'plot_location'
    ) THEN
        ALTER TABLE farm_plots ADD COLUMN plot_location VARCHAR(200) DEFAULT '';
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'farm_plots' 
        AND column_name = 'soil_type'
    ) THEN
        ALTER TABLE farm_plots ADD COLUMN soil_type VARCHAR(50) DEFAULT 'Other';
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'farm_plots' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE farm_plots ADD COLUMN status VARCHAR(20) DEFAULT 'active';
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'farm_plots' 
        AND column_name = 'farmer_id'
    ) THEN
        ALTER TABLE farm_plots ADD COLUMN farmer_id UUID NOT NULL;
    END IF;
END $$;

-- Ensure the table has proper indices
DO $$ 
BEGIN
    -- Create index on farmer_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'farm_plots' AND indexname = 'farm_plots_farmer_id_idx'
    ) THEN
        CREATE INDEX farm_plots_farmer_id_idx ON farm_plots(farmer_id);
    END IF;
END $$;

-- Make sure crops table exists and has required columns
DO $$ 
BEGIN
    -- Check if crops table exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'crops'
    ) THEN
        CREATE TABLE IF NOT EXISTS crops (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            plot_id UUID NOT NULL,
            crop_name VARCHAR(100) NOT NULL,
            crop_type VARCHAR(50) DEFAULT 'other',
            variety VARCHAR(100),
            planting_date DATE NOT NULL,
            expected_harvest_date DATE,
            actual_harvest_date DATE,
            status VARCHAR(20) DEFAULT 'planted',
            yield_amount DECIMAL(10, 2),
            yield_quality VARCHAR(20),
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Create index on plot_id
        CREATE INDEX crops_plot_id_idx ON crops(plot_id);
    END IF;
END $$;

-- Make sure crop_activities table exists
DO $$ 
BEGIN
    -- Check if crop_activities table exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'crop_activities'
    ) THEN
        CREATE TABLE IF NOT EXISTS crop_activities (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            crop_id UUID NOT NULL,
            activity_type VARCHAR(50) NOT NULL,
            activity_date DATE NOT NULL,
            description TEXT,
            resources_used JSONB DEFAULT '{}',
            cost DECIMAL(10, 2) DEFAULT 0,
            status VARCHAR(20) DEFAULT 'completed',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Create index on crop_id
        CREATE INDEX crop_activities_crop_id_idx ON crop_activities(crop_id);
    END IF;
END $$; 