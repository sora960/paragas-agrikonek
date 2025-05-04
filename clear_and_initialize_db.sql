-- Clear existing tables and initialize empty structure
BEGIN;
-- First drop views
DROP VIEW IF EXISTS region_with_province_count;
DROP VIEW IF EXISTS budget_allocation_summary;
DROP VIEW IF EXISTS region_admins;

-- Drop existing tables in correct order to avoid foreign key constraints
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS user_regions CASCADE;
DROP TABLE IF EXISTS region_budgets CASCADE;
DROP TABLE IF EXISTS provinces CASCADE;
DROP TABLE IF EXISTS regions CASCADE;
DROP TABLE IF EXISTS island_groups CASCADE;
DROP TABLE IF EXISTS annual_budgets CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create basic empty tables
-- Island Groups
CREATE TABLE public.island_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Regions
CREATE TABLE public.regions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    island_group_id UUID REFERENCES public.island_groups(id) ON DELETE CASCADE,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert just the three main island groups without any regions
INSERT INTO public.island_groups (name) VALUES
('Luzon'),
('Visayas'),
('Mindanao');

-- Create a minimal annual budget
CREATE TABLE public.annual_budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fiscal_year INTEGER NOT NULL UNIQUE,
    total_amount DECIMAL(20, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert a single initial budget record
INSERT INTO public.annual_budgets (fiscal_year, total_amount) VALUES
(2024, 100000000);

-- This minimal structure lets you create regions and provinces through the UI
COMMIT;

-- Simple verification query to confirm tables are created
SELECT 'Tables created successfully' as status;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
SELECT * FROM island_groups; 