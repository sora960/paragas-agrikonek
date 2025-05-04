-- Script to recreate farmer_profiles table with RLS disabled
-- First drop dependent tables with CASCADE to handle dependent views
DROP TABLE IF EXISTS public.organization_members CASCADE;
DROP TABLE IF EXISTS public.farm_plots CASCADE;
DROP TABLE IF EXISTS public.report_comments CASCADE;
DROP TABLE IF EXISTS public.field_reports CASCADE;
DROP TABLE IF EXISTS public.farmer_profiles CASCADE;

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Recreate farmer_profiles table exactly as in the original schema
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

-- Important: Disable RLS on the table
ALTER TABLE public.farmer_profiles DISABLE ROW LEVEL SECURITY;

-- Insert sample data for testing
INSERT INTO public.farmer_profiles (
    user_id, 
    organization_id, 
    farm_name, 
    farm_size, 
    farm_address,
    farm_type,
    main_crops
)
SELECT 
    u.id, 
    (SELECT id FROM public.organizations ORDER BY created_at LIMIT 1),
    'Sample Farm ' || COALESCE(u.first_name, u.email),
    10.5,
    'Sample Farm Address',
    'small',
    ARRAY['rice', 'corn', 'vegetables']
FROM 
    public.users u
LIMIT 5;

-- Add an index for better query performance
CREATE INDEX IF NOT EXISTS idx_farmer_profiles_user_id ON public.farmer_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_farmer_profiles_organization_id ON public.farmer_profiles(organization_id); 