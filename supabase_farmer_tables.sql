-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- *** FARMER PROFILES TABLE ***
CREATE TABLE IF NOT EXISTS public.farmer_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    province_id UUID REFERENCES public.provinces(id) ON DELETE SET NULL,
    farm_name VARCHAR(100) NOT NULL,
    farm_size DECIMAL(10, 2) NOT NULL, -- in hectares
    farm_address TEXT NOT NULL,
    years_of_experience INTEGER DEFAULT 0,
    main_crops TEXT[],
    farm_type VARCHAR(50) CHECK (farm_type IN ('small', 'medium', 'large', 'commercial')),
    certification_status VARCHAR(50) DEFAULT 'none' CHECK (certification_status IN ('none', 'pending', 'certified', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- *** FARM PLOTS TABLE ***
CREATE TABLE IF NOT EXISTS public.farm_plots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID REFERENCES public.farmer_profiles(id) ON DELETE CASCADE,
    plot_name VARCHAR(100) NOT NULL,
    plot_size DECIMAL(10, 2) NOT NULL, -- in hectares
    plot_location TEXT NOT NULL,
    soil_type VARCHAR(50),
    irrigation_type VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'fallow')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- *** CROPS TABLE ***
CREATE TABLE IF NOT EXISTS public.crops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plot_id UUID REFERENCES public.farm_plots(id) ON DELETE CASCADE,
    crop_name VARCHAR(100) NOT NULL,
    crop_type VARCHAR(50) NOT NULL,
    variety VARCHAR(100),
    planting_date DATE NOT NULL,
    expected_harvest_date DATE,
    actual_harvest_date DATE,
    status VARCHAR(20) DEFAULT 'planted' CHECK (status IN ('planned', 'planted', 'growing', 'harvested', 'failed')),
    yield_amount DECIMAL(10, 2), -- in kilograms
    yield_quality VARCHAR(20) CHECK (yield_quality IN ('poor', 'fair', 'good', 'excellent')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- *** CROP ACTIVITIES TABLE ***
CREATE TABLE IF NOT EXISTS public.crop_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crop_id UUID REFERENCES public.crops(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('planting', 'fertilizing', 'watering', 'pest_control', 'harvesting', 'other')),
    activity_date DATE NOT NULL,
    description TEXT,
    resources_used JSONB DEFAULT '{}',
    cost DECIMAL(10, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- *** WEATHER RECORDS TABLE ***
CREATE TABLE IF NOT EXISTS public.weather_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    province_id UUID REFERENCES public.provinces(id) ON DELETE CASCADE,
    record_date DATE NOT NULL,
    temperature DECIMAL(5, 2), -- in Celsius
    humidity INTEGER, -- percentage
    rainfall DECIMAL(5, 2), -- in mm
    wind_speed DECIMAL(5, 2), -- in km/h
    weather_condition VARCHAR(50),
    forecast JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create views for easier querying
CREATE OR REPLACE VIEW public.farmer_crop_summary AS
SELECT 
    fp.id AS farmer_id,
    fp.farm_name,
    COUNT(DISTINCT p.id) AS total_plots,
    COUNT(DISTINCT c.id) AS total_crops,
    SUM(p.plot_size) AS total_farm_size,
    COUNT(DISTINCT CASE WHEN c.status = 'planted' THEN c.id END) AS active_crops,
    COUNT(DISTINCT CASE WHEN c.status = 'harvested' THEN c.id END) AS harvested_crops
FROM 
    public.farmer_profiles fp
    LEFT JOIN public.farm_plots p ON p.farmer_id = fp.id
    LEFT JOIN public.crops c ON c.plot_id = p.id
GROUP BY 
    fp.id, fp.farm_name;

-- View for crop activities calendar
CREATE OR REPLACE VIEW public.crop_activities_calendar AS
SELECT 
    ca.id,
    ca.crop_id,
    c.crop_name,
    ca.activity_type,
    ca.activity_date,
    ca.description,
    ca.status,
    fp.farm_name,
    p.plot_name
FROM 
    public.crop_activities ca
    JOIN public.crops c ON ca.crop_id = c.id
    JOIN public.farm_plots p ON c.plot_id = p.id
    JOIN public.farmer_profiles fp ON p.farmer_id = fp.id;

-- Optional: Temporarily disable RLS to allow easier testing
-- Comment these out when deploying to production
ALTER TABLE IF EXISTS public.farmer_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.farm_plots DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.crops DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.crop_activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.weather_records DISABLE ROW LEVEL SECURITY;

-- Create report comments table
CREATE TABLE IF NOT EXISTS report_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    report_id UUID NOT NULL REFERENCES field_reports(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_comment_id UUID REFERENCES report_comments(id) ON DELETE CASCADE,
    is_internal BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Add RLS policies for report comments
ALTER TABLE report_comments ENABLE ROW LEVEL SECURITY;

-- Policy for viewing comments
CREATE POLICY "Users can view comments on reports they have access to" ON report_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM field_reports fr
            WHERE fr.id = report_comments.report_id
            AND (
                fr.farmer_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM user_organizations uo
                    WHERE uo.user_id = auth.uid()
                    AND uo.organization_id = (
                        SELECT organization_id FROM farmer_profiles
                        WHERE id = fr.farmer_id
                    )
                )
            )
        )
    );

-- Policy for creating comments
CREATE POLICY "Users can create comments on reports they have access to" ON report_comments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM field_reports fr
            WHERE fr.id = report_id
            AND (
                fr.farmer_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM user_organizations uo
                    WHERE uo.user_id = auth.uid()
                    AND uo.organization_id = (
                        SELECT organization_id FROM farmer_profiles
                        WHERE id = fr.farmer_id
                    )
                )
            )
        )
        AND user_id = auth.uid()  -- Ensure users can only create comments as themselves
    );

-- Policy for updating comments
CREATE POLICY "Users can update their own comments" ON report_comments
    FOR UPDATE USING (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM field_reports fr
            WHERE fr.id = report_id
            AND (
                fr.farmer_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM user_organizations uo
                    WHERE uo.user_id = auth.uid()
                    AND uo.organization_id = (
                        SELECT organization_id FROM farmer_profiles
                        WHERE id = fr.farmer_id
                    )
                )
            )
        )
    )
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM field_reports fr
            WHERE fr.id = report_id
            AND (
                fr.farmer_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM user_organizations uo
                    WHERE uo.user_id = auth.uid()
                    AND uo.organization_id = (
                        SELECT organization_id FROM farmer_profiles
                        WHERE id = fr.farmer_id
                    )
                )
            )
        )
    );

-- Policy for deleting comments
CREATE POLICY "Users can delete their own comments" ON report_comments
    FOR DELETE USING (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM field_reports fr
            WHERE fr.id = report_id
            AND (
                fr.farmer_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM user_organizations uo
                    WHERE uo.user_id = auth.uid()
                    AND uo.organization_id = (
                        SELECT organization_id FROM farmer_profiles
                        WHERE id = fr.farmer_id
                    )
                )
            )
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_report_comment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_report_comment_timestamp
    BEFORE UPDATE ON report_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_report_comment_updated_at();

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_report_comments_report_id ON report_comments(report_id);
CREATE INDEX IF NOT EXISTS idx_report_comments_user_id ON report_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_report_comments_parent_id ON report_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_report_comments_created_at ON report_comments(created_at); 